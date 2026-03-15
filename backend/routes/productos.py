import os
import json
from io import BytesIO
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from PIL import Image, ImageOps
from sqlalchemy import or_
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from auth_utils import require_roles
from models import Producto, HistorialPrecio
from database import db
from pagination import build_paginated_response, get_pagination_params, has_pagination_args

productos_bp = Blueprint('productos', __name__)

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
STANDARD_IMAGE_SIZE = (800, 800)
IMAGE_QUALITY = 82
MAX_PRODUCT_IMAGES = 5
PRICE_FIELDS = (
    ('precio_1_dolares', 'porcentaje_ganancia_1', 1),
    ('precio_2_dolares', 'porcentaje_ganancia_2', 2),
    ('precio_3_dolares', 'porcentaje_ganancia_3', 3),
)


def build_producto_foto_url(foto_path: str | None) -> str | None:
    if not foto_path:
        return None
    return f"/uploads/{foto_path.replace(os.sep, '/')}"


def build_producto_fotos_urls(fotos: list[str]) -> list[str]:
    urls = []
    for foto in fotos:
        url = build_producto_foto_url(foto)
        if url:
            urls.append(url)
    return urls


def serialize_producto(producto: Producto) -> dict:
    fotos = producto.fotos
    precios = []
    for precio_field, porcentaje_field, lista_numero in PRICE_FIELDS:
        precio_valor = getattr(producto, precio_field, 0.0) or 0.0
        porcentaje_valor = getattr(producto, porcentaje_field, producto.porcentaje_ganancia or 0.0) or 0.0
        precios.append({
            'lista': lista_numero,
            'precio_dolares': precio_valor,
            'porcentaje_ganancia': porcentaje_valor,
        })

    return {
        'id': producto.id,
        'codigo': producto.codigo,
        'nombre': producto.nombre,
        'descripcion': producto.descripcion,
        'ubicacion': producto.ubicacion,
        'marca': producto.marca,
        'modelo': producto.modelo,
        'unidad': producto.unidad,
        'precio_costo': producto.precio_costo,
        'porcentaje_ganancia': producto.porcentaje_ganancia,
        'precio_dolares': producto.precio_dolares,
        'precio_1_dolares': producto.precio_1_dolares,
        'precio_2_dolares': producto.precio_2_dolares,
        'precio_3_dolares': producto.precio_3_dolares,
        'porcentaje_ganancia_1': producto.porcentaje_ganancia_1,
        'porcentaje_ganancia_2': producto.porcentaje_ganancia_2,
        'porcentaje_ganancia_3': producto.porcentaje_ganancia_3,
        'precios': precios,
        'cantidad': producto.cantidad,
        'categoria': producto.categoria,
        'metodo_redondeo': producto.metodo_redondeo,
        'foto_path': producto.foto_path,
        'foto_url': build_producto_foto_url(producto.foto_path),
        'fotos': fotos,
        'fotos_urls': build_producto_fotos_urls(fotos)
    }


def parse_bool(value) -> bool:
    return str(value or '').strip().lower() in {'1', 'true', 'si', 'sí', 'yes', 'on'}


def parse_float(value, default: float = 0.0) -> float:
    if value in (None, ''):
        return default
    return float(value)


def extract_price_values(data: dict, producto: Producto | None = None) -> dict:
    precio_1_default = producto.precio_1_dolares if producto else parse_float(data.get('precio_dolares'), 0)
    porcentaje_default = producto.porcentaje_ganancia if producto else parse_float(data.get('porcentaje_ganancia'), 30)

    valores = {
        'precio_1_dolares': parse_float(data.get('precio_1_dolares'), precio_1_default),
        'precio_2_dolares': parse_float(data.get('precio_2_dolares'), producto.precio_2_dolares if producto else precio_1_default),
        'precio_3_dolares': parse_float(data.get('precio_3_dolares'), producto.precio_3_dolares if producto else precio_1_default),
        'porcentaje_ganancia_1': parse_float(data.get('porcentaje_ganancia_1'), producto.porcentaje_ganancia_1 if producto else porcentaje_default),
        'porcentaje_ganancia_2': parse_float(data.get('porcentaje_ganancia_2'), producto.porcentaje_ganancia_2 if producto else porcentaje_default),
        'porcentaje_ganancia_3': parse_float(data.get('porcentaje_ganancia_3'), producto.porcentaje_ganancia_3 if producto else porcentaje_default),
    }
    valores['precio_dolares'] = valores['precio_1_dolares']
    valores['porcentaje_ganancia'] = valores['porcentaje_ganancia_1']
    return valores


def registrar_historial_precios(producto: Producto, valores_anteriores: dict, motivo: str = 'ajuste_manual') -> None:
    for precio_field, _, lista_numero in PRICE_FIELDS:
        precio_anterior = round(float(valores_anteriores.get(precio_field) or 0.0), 2)
        precio_nuevo = round(float(getattr(producto, precio_field, 0.0) or 0.0), 2)
        if abs(precio_anterior - precio_nuevo) > 0.0001:
            historial = HistorialPrecio(
                producto_id=producto.id,
                precio_anterior=precio_anterior,
                precio_nuevo=precio_nuevo,
                tipo_precio=f'precio_{lista_numero}',
                motivo=motivo,
            )
            db.session.add(historial)


def get_payload_and_images() -> tuple[dict, list[FileStorage]]:
    if request.content_type and 'multipart/form-data' in request.content_type:
        files = [image for image in request.files.getlist('fotos') if getattr(image, 'filename', '')]
        single_file = request.files.get('foto')
        if single_file and getattr(single_file, 'filename', ''):
            files.append(single_file)
        return request.form.to_dict(), files
    return request.get_json() or {}, []


def remove_producto_image(foto_path: str | None) -> None:
    if not foto_path:
        return

    full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], foto_path)
    if os.path.exists(full_path):
        os.remove(full_path)


def remove_producto_images(fotos: list[str]) -> None:
    for foto in fotos:
        remove_producto_image(foto)


def save_producto_image(image_file: FileStorage) -> str:
    filename = secure_filename(image_file.filename or '')
    extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError('Formato de imagen no permitido. Usa JPG, PNG o WEBP.')

    image_file.stream.seek(0, os.SEEK_END)
    file_size = image_file.stream.tell()
    image_file.stream.seek(0)

    if file_size > MAX_IMAGE_SIZE_BYTES:
        raise ValueError('La imagen excede el maximo permitido de 5 MB.')

    try:
        image = Image.open(image_file.stream)
        image = ImageOps.exif_transpose(image)
        image = image.convert('RGB')
    except Exception as exc:
        raise ValueError('No se pudo procesar la imagen subida.') from exc

    image.thumbnail(STANDARD_IMAGE_SIZE, Image.Resampling.LANCZOS)

    canvas = Image.new('RGB', STANDARD_IMAGE_SIZE, 'white')
    offset_x = (STANDARD_IMAGE_SIZE[0] - image.width) // 2
    offset_y = (STANDARD_IMAGE_SIZE[1] - image.height) // 2
    canvas.paste(image, (offset_x, offset_y))

    output = BytesIO()
    canvas.save(output, format='JPEG', quality=IMAGE_QUALITY, optimize=True, progressive=True)
    output.seek(0)

    output_name = f"{uuid4().hex}.jpg"
    relative_path = os.path.join('productos', output_name)
    full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], relative_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    with open(full_path, 'wb') as image_output:
        image_output.write(output.getvalue())

    return relative_path


def parse_json_list(value) -> list[str]:
    if not value:
        return []

    if isinstance(value, list):
        return [item for item in value if isinstance(item, str) and item]

    try:
        data = json.loads(value)
    except Exception:
        return []

    if not isinstance(data, list):
        return []

    return [item for item in data if isinstance(item, str) and item]


def normalize_existing_photos(producto: Producto, fotos_existentes: list[str]) -> list[str]:
    fotos_producto = set(producto.fotos)
    return [foto for foto in fotos_existentes if foto in fotos_producto]


def build_updated_photos(producto: Producto, data: dict, image_files: list[FileStorage]) -> tuple[list[str], list[str]]:
    if 'fotos_existentes' in data:
        fotos_existentes = normalize_existing_photos(producto, parse_json_list(data.get('fotos_existentes')))
    else:
        fotos_existentes = list(producto.fotos)
    remove_all = parse_bool(data.get('remove_photo'))

    if remove_all:
        fotos_existentes = []

    nuevas_fotos = []
    for image_file in image_files:
        nuevas_fotos.append(save_producto_image(image_file))

    fotos_finales = fotos_existentes + nuevas_fotos
    if len(fotos_finales) > MAX_PRODUCT_IMAGES:
        remove_producto_images(nuevas_fotos)
        raise ValueError(f'Solo se permiten hasta {MAX_PRODUCT_IMAGES} fotos por producto.')

    return fotos_finales, nuevas_fotos

@productos_bp.route('/', methods=['GET'])
def get_productos():
    query = Producto.query
    page = 1
    page_size = 20
    paginacion = None

    busqueda = (request.args.get('q') or '').strip()
    codigo = (request.args.get('codigo') or '').strip()
    nombre = (request.args.get('nombre') or '').strip()
    descripcion = (request.args.get('descripcion') or '').strip()
    categoria = (request.args.get('categoria') or '').strip()
    ubicacion = (request.args.get('ubicacion') or '').strip()
    marca = (request.args.get('marca') or '').strip()
    modelo = (request.args.get('modelo') or '').strip()
    unidad = (request.args.get('unidad') or '').strip()
    in_stock = (request.args.get('in_stock') or '').strip().lower()

    if busqueda:
        termino = f'%{busqueda}%'
        query = query.filter(or_(
            Producto.codigo.ilike(termino),
            Producto.nombre.ilike(termino),
            Producto.descripcion.ilike(termino),
            Producto.categoria.ilike(termino),
            Producto.ubicacion.ilike(termino),
            Producto.marca.ilike(termino),
            Producto.modelo.ilike(termino),
            Producto.unidad.ilike(termino),
        ))

    if codigo:
        query = query.filter(Producto.codigo.ilike(f'%{codigo}%'))
    if nombre:
        query = query.filter(Producto.nombre.ilike(f'%{nombre}%'))
    if descripcion:
        query = query.filter(Producto.descripcion.ilike(f'%{descripcion}%'))
    if categoria:
        query = query.filter(Producto.categoria.ilike(f'%{categoria}%'))
    if ubicacion:
        query = query.filter(Producto.ubicacion.ilike(f'%{ubicacion}%'))
    if marca:
        query = query.filter(Producto.marca.ilike(f'%{marca}%'))
    if modelo:
        query = query.filter(Producto.modelo.ilike(f'%{modelo}%'))
    if unidad:
        query = query.filter(Producto.unidad.ilike(f'%{unidad}%'))
    if in_stock in ('true', '1', 'si', 'yes'):
        query = query.filter(Producto.cantidad > 0)

    query = query.order_by(Producto.nombre)

    if has_pagination_args():
        page, page_size = get_pagination_params()
        paginacion = query.paginate(page=page, per_page=page_size, error_out=False)
        productos = paginacion.items
    else:
        productos = query.all()

    items = [serialize_producto(p) for p in productos]

    if has_pagination_args():
        total = len(items)
        if paginacion is not None and paginacion.total is not None:
            total = paginacion.total
        return jsonify(build_paginated_response(items, int(total), page, page_size))

    return jsonify(items)

@productos_bp.route('/', methods=['POST'])
@require_roles('admin')
def crear_producto():
    data, image_files = get_payload_and_images()
    uploaded_photo_paths = []
    try:
        if len(image_files) > MAX_PRODUCT_IMAGES:
            raise ValueError(f'Solo se permiten hasta {MAX_PRODUCT_IMAGES} fotos por producto.')

        nuevo = Producto()
        nuevo.codigo = data.get('codigo')
        nuevo.nombre = data['nombre']
        nuevo.descripcion = data.get('descripcion')
        nuevo.ubicacion = data.get('ubicacion')
        nuevo.marca = data.get('marca')
        nuevo.modelo = data.get('modelo')
        nuevo.unidad = data.get('unidad')
        nuevo.precio_costo = parse_float(data.get('precio_costo'), 0)
        price_values = extract_price_values(data)
        nuevo.porcentaje_ganancia = price_values['porcentaje_ganancia']
        nuevo.precio_dolares = price_values['precio_dolares']
        nuevo.precio_1_dolares = price_values['precio_1_dolares']
        nuevo.precio_2_dolares = price_values['precio_2_dolares']
        nuevo.precio_3_dolares = price_values['precio_3_dolares']
        nuevo.porcentaje_ganancia_1 = price_values['porcentaje_ganancia_1']
        nuevo.porcentaje_ganancia_2 = price_values['porcentaje_ganancia_2']
        nuevo.porcentaje_ganancia_3 = price_values['porcentaje_ganancia_3']
        nuevo.cantidad = 0
        nuevo.categoria = data.get('categoria')
        nuevo.metodo_redondeo = data.get('metodo_redondeo', 'none')
        uploaded_photo_paths = [save_producto_image(image_file) for image_file in image_files]
        nuevo.fotos = uploaded_photo_paths
        db.session.add(nuevo)
        db.session.commit()
        return jsonify({'mensaje': 'Producto creado', 'id': nuevo.id}), 201
    except Exception as e:
        db.session.rollback()
        remove_producto_images(uploaded_photo_paths)
        return jsonify({'error': str(e)}), 400

@productos_bp.route('/<int:id>', methods=['PUT'])
@require_roles('admin')
def editar_producto(id):
    data, image_files = get_payload_and_images()
    prod = Producto.query.get_or_404(id)
    uploaded_photo_paths = []
    try:
        if len(image_files) > MAX_PRODUCT_IMAGES:
            raise ValueError(f'Solo se permiten hasta {MAX_PRODUCT_IMAGES} fotos por producto.')

        old_photo_paths = list(prod.fotos)
        old_price_values = {
            'precio_1_dolares': prod.precio_1_dolares,
            'precio_2_dolares': prod.precio_2_dolares,
            'precio_3_dolares': prod.precio_3_dolares,
        }
        price_values = extract_price_values(data, prod)

        prod.nombre = data.get('nombre', prod.nombre)
        prod.codigo = data.get('codigo', prod.codigo)
        prod.descripcion = data.get('descripcion', prod.descripcion)
        prod.ubicacion = data.get('ubicacion', prod.ubicacion)
        prod.marca = data.get('marca', prod.marca)
        prod.modelo = data.get('modelo', prod.modelo)
        prod.unidad = data.get('unidad', prod.unidad)
        prod.precio_costo = parse_float(data.get('precio_costo'), prod.precio_costo)
        prod.porcentaje_ganancia = price_values['porcentaje_ganancia']
        prod.precio_dolares = price_values['precio_dolares']
        prod.precio_1_dolares = price_values['precio_1_dolares']
        prod.precio_2_dolares = price_values['precio_2_dolares']
        prod.precio_3_dolares = price_values['precio_3_dolares']
        prod.porcentaje_ganancia_1 = price_values['porcentaje_ganancia_1']
        prod.porcentaje_ganancia_2 = price_values['porcentaje_ganancia_2']
        prod.porcentaje_ganancia_3 = price_values['porcentaje_ganancia_3']
        prod.categoria = data.get('categoria', prod.categoria)
        prod.metodo_redondeo = data.get('metodo_redondeo', prod.metodo_redondeo)

        fotos_finales, uploaded_photo_paths = build_updated_photos(prod, data, image_files)
        prod.fotos = fotos_finales

        registrar_historial_precios(prod, old_price_values)
        
        db.session.commit()

        fotos_eliminadas = [foto for foto in old_photo_paths if foto not in prod.fotos]
        remove_producto_images(fotos_eliminadas)

        return jsonify({'mensaje': 'Producto actualizado'})
    except Exception as e:
        db.session.rollback()
        remove_producto_images(uploaded_photo_paths)
        return jsonify({'error': str(e)}), 400

@productos_bp.route('/<int:id>', methods=['DELETE'])
@require_roles('admin')
def eliminar_producto(id):
    prod = Producto.query.get_or_404(id)
    try:
        fotos = list(prod.fotos)
        db.session.delete(prod)
        db.session.commit()

        remove_producto_images(fotos)

        return jsonify({'mensaje': 'Producto eliminado'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@productos_bp.route('/<int:id>/historial-precios', methods=['GET'])
def get_historial_precios(id):
    historial = HistorialPrecio.query.filter_by(producto_id=id).order_by(HistorialPrecio.fecha_cambio.desc()).all()
    return jsonify([{
        'id': h.id,
        'precio_anterior': h.precio_anterior,
        'precio_nuevo': h.precio_nuevo,
        'tipo_precio': h.tipo_precio or 'precio_1',
        'motivo': h.motivo,
        'fecha': h.fecha_cambio.strftime('%d/%m/%Y %H:%M')
    } for h in historial])
