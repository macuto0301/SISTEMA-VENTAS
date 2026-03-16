from datetime import datetime
from io import BytesIO
import os
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from PIL import Image, ImageOps
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from auth_utils import get_current_user, require_roles
from cuenta_corriente_utils import obtener_saldos_a_favor_disponibles, reconciliar_saldos_a_favor_cliente
from database import db
from models import Cliente, CuentaPorCobrar, MovimientoCuentaCliente
from pagination import build_paginated_response, get_pagination_params, has_pagination_args


clientes_bp = Blueprint('clientes', __name__)

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
STANDARD_IMAGE_SIZE = (800, 800)
IMAGE_QUALITY = 82


def build_cliente_foto_url(foto_path: str | None) -> str | None:
    if not foto_path:
        return None
    return f"/uploads/{foto_path.replace(os.sep, '/')}"


def parse_bool(value) -> bool:
    return str(value or '').strip().lower() in {'1', 'true', 'si', 'sí', 'yes', 'on'}


def get_payload_and_images() -> tuple[dict, FileStorage | None, FileStorage | None]:
    if request.content_type and 'multipart/form-data' in request.content_type:
        return (
            request.form.to_dict(),
            request.files.get('foto_perfil'),
            request.files.get('foto_cedula')
        )
    return request.get_json() or {}, None, None


def remove_cliente_image(foto_path: str | None) -> None:
    if not foto_path:
        return

    full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], foto_path)
    if os.path.exists(full_path):
        os.remove(full_path)


def save_cliente_image(image_file: FileStorage, prefix: str) -> str:
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

    output_name = f"{prefix}_{uuid4().hex}.jpg"
    relative_path = os.path.join('clientes', output_name)
    full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], relative_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    with open(full_path, 'wb') as image_output:
        image_output.write(output.getvalue())

    return relative_path


def serializar_cliente(cliente: Cliente) -> dict:
    saldo_por_cobrar = db.session.query(
        db.func.coalesce(db.func.sum(CuentaPorCobrar.saldo_pendiente_usd), 0.0)
    ).filter(
        CuentaPorCobrar.cliente_id == cliente.id,
        CuentaPorCobrar.estado.in_(['pendiente', 'abonada'])
    ).scalar() or 0.0

    return {
        'id': cliente.id,
        'nombre': cliente.nombre,
        'documento': cliente.documento or '',
        'telefono': cliente.telefono or '',
        'email': cliente.email or '',
        'direccion': cliente.direccion or '',
        'foto_perfil_path': cliente.foto_perfil_path,
        'foto_perfil_url': build_cliente_foto_url(cliente.foto_perfil_path),
        'foto_cedula_path': cliente.foto_cedula_path,
        'foto_cedula_url': build_cliente_foto_url(cliente.foto_cedula_path),
        'activo': bool(cliente.activo),
        'saldo_a_favor_usd': round(cliente.saldo_a_favor_usd or 0.0, 2),
        'saldo_por_cobrar_usd': round(saldo_por_cobrar, 2),
        'fecha_creado': cliente.fecha_creado.strftime('%d/%m/%Y %H:%M') if cliente.fecha_creado else '',
    }


def build_cliente_integrity_error_message(error: IntegrityError) -> str:
    detalle = str(getattr(error, 'orig', error)).lower()
    if 'rif_cedula' in detalle and 'not-null' in detalle:
        return 'El documento del cliente es obligatorio'
    if 'rif_cedula' in detalle and 'duplicate' in detalle:
        return 'Ya existe un cliente con ese documento'
    return 'No se pudo guardar el cliente'


@clientes_bp.route('/', methods=['GET'])
def get_clientes():
    query = Cliente.query.filter_by(activo=True).order_by(Cliente.nombre.asc())
    page = 1
    page_size = 20
    paginacion = None

    busqueda = (request.args.get('q') or '').strip()
    nombre = (request.args.get('nombre') or '').strip()
    documento = (request.args.get('documento') or '').strip()

    if busqueda:
        termino = f'%{busqueda}%'
        query = query.filter(or_(
            Cliente.nombre.ilike(termino),
            Cliente.documento.ilike(termino),
            Cliente.telefono.ilike(termino),
            Cliente.email.ilike(termino),
        ))

    if nombre:
        query = query.filter(Cliente.nombre.ilike(f'%{nombre}%'))
    if documento:
        query = query.filter(Cliente.documento.ilike(f'%{documento}%'))

    if has_pagination_args():
        page, page_size = get_pagination_params()
        paginacion = query.paginate(page=page, per_page=page_size, error_out=False)
        clientes = paginacion.items
    else:
        clientes = query.all()

    items = [serializar_cliente(cliente) for cliente in clientes]
    if has_pagination_args():
        total = int(paginacion.total) if paginacion and paginacion.total is not None else len(items)
        return jsonify(build_paginated_response(items, total, page, page_size))

    return jsonify(items)


@clientes_bp.route('/', methods=['POST'])
@require_roles('admin', 'cajero')
def crear_cliente():
    data, foto_perfil, foto_cedula = get_payload_and_images()
    nombre = (data.get('nombre') or '').strip()
    documento = (data.get('documento') or '').strip() or None

    if not nombre:
        return jsonify({'error': 'El nombre del cliente es obligatorio'}), 400

    if not documento:
        return jsonify({'error': 'El documento del cliente es obligatorio'}), 400

    if documento and Cliente.query.filter_by(documento=documento).first():
        return jsonify({'error': 'Ya existe un cliente con ese documento'}), 400

    foto_perfil_path = None
    foto_cedula_path = None
    try:
        if foto_perfil and foto_perfil.filename:
            foto_perfil_path = save_cliente_image(foto_perfil, 'perfil')
        if foto_cedula and foto_cedula.filename:
            foto_cedula_path = save_cliente_image(foto_cedula, 'cedula')

        nuevo = Cliente()
        nuevo.nombre = nombre
        nuevo.documento = documento
        nuevo.telefono = (data.get('telefono') or '').strip() or None
        nuevo.email = (data.get('email') or '').strip() or None
        nuevo.direccion = (data.get('direccion') or '').strip() or None
        nuevo.foto_perfil_path = foto_perfil_path
        nuevo.foto_cedula_path = foto_cedula_path
        db.session.add(nuevo)
        db.session.commit()
        return jsonify({'mensaje': 'Cliente creado', 'cliente': serializar_cliente(nuevo)}), 201
    except IntegrityError as e:
        db.session.rollback()
        remove_cliente_image(foto_perfil_path)
        remove_cliente_image(foto_cedula_path)
        return jsonify({'error': build_cliente_integrity_error_message(e)}), 400
    except Exception as e:
        db.session.rollback()
        remove_cliente_image(foto_perfil_path)
        remove_cliente_image(foto_cedula_path)
        return jsonify({'error': str(e)}), 400


@clientes_bp.route('/<int:cliente_id>', methods=['GET'])
def get_cliente(cliente_id: int):
    cliente = Cliente.query.get_or_404(cliente_id)
    return jsonify(serializar_cliente(cliente))


@clientes_bp.route('/<int:cliente_id>', methods=['PUT'])
@require_roles('admin', 'cajero')
def actualizar_cliente(cliente_id: int):
    cliente = Cliente.query.get_or_404(cliente_id)
    data, foto_perfil, foto_cedula = get_payload_and_images()
    documento = (data.get('documento') or '').strip() or None

    if not (data.get('nombre') or '').strip():
        return jsonify({'error': 'El nombre del cliente es obligatorio'}), 400

    if not documento:
        return jsonify({'error': 'El documento del cliente es obligatorio'}), 400

    if documento:
        existente = Cliente.query.filter(Cliente.documento == documento, Cliente.id != cliente.id).first()
        if existente:
            return jsonify({'error': 'Ya existe un cliente con ese documento'}), 400

    uploaded_perfil_path = None
    uploaded_cedula_path = None
    old_perfil = cliente.foto_perfil_path
    old_cedula = cliente.foto_cedula_path

    try:
        cliente.nombre = (data.get('nombre') or cliente.nombre).strip()
        cliente.documento = documento
        cliente.telefono = (data.get('telefono') or '').strip() or None
        cliente.email = (data.get('email') or '').strip() or None
        cliente.direccion = (data.get('direccion') or '').strip() or None
        if foto_perfil and foto_perfil.filename:
            uploaded_perfil_path = save_cliente_image(foto_perfil, 'perfil')
            cliente.foto_perfil_path = uploaded_perfil_path
        elif parse_bool(data.get('remove_foto_perfil')):
            cliente.foto_perfil_path = None

        if foto_cedula and foto_cedula.filename:
            uploaded_cedula_path = save_cliente_image(foto_cedula, 'cedula')
            cliente.foto_cedula_path = uploaded_cedula_path
        elif parse_bool(data.get('remove_foto_cedula')):
            cliente.foto_cedula_path = None

        if 'activo' in data:
            cliente.activo = bool(data.get('activo'))
        db.session.commit()

        if old_perfil and old_perfil != cliente.foto_perfil_path:
            remove_cliente_image(old_perfil)
        if old_cedula and old_cedula != cliente.foto_cedula_path:
            remove_cliente_image(old_cedula)

        return jsonify({'mensaje': 'Cliente actualizado', 'cliente': serializar_cliente(cliente)})
    except IntegrityError as e:
        db.session.rollback()
        remove_cliente_image(uploaded_perfil_path)
        remove_cliente_image(uploaded_cedula_path)
        return jsonify({'error': build_cliente_integrity_error_message(e)}), 400
    except Exception as e:
        db.session.rollback()
        remove_cliente_image(uploaded_perfil_path)
        remove_cliente_image(uploaded_cedula_path)
        return jsonify({'error': str(e)}), 400


@clientes_bp.route('/<int:cliente_id>/estado-cuenta', methods=['GET'])
def get_estado_cuenta(cliente_id: int):
    cliente = Cliente.query.get_or_404(cliente_id)
    reconciliar_saldos_a_favor_cliente(cliente.id)
    cuentas = CuentaPorCobrar.query.filter_by(cliente_id=cliente.id).order_by(CuentaPorCobrar.fecha_emision.desc()).all()
    movimientos = MovimientoCuentaCliente.query.filter_by(cliente_id=cliente.id).order_by(MovimientoCuentaCliente.fecha.desc()).all()

    cuentas_payload = []
    transacciones = []

    for cuenta in cuentas:
        abonos_payload = [{
            'id': abono.id,
            'fecha': abono.fecha.strftime('%d/%m/%Y %H:%M') if abono.fecha else '',
            'medio': abono.medio,
            'moneda': abono.moneda,
            'monto': round(abono.monto or 0.0, 2),
            'tasa_usada': round(abono.tasa_usada or 0.0, 4),
            'origen_tasa': abono.origen_tasa or 'sistema',
            'equivalente_usd': round(abono.equivalente_usd or 0.0, 2),
            'observacion': abono.observacion or '',
            'usuario_username': abono.usuario_username or '',
        } for abono in cuenta.abonos]

        cuentas_payload.append({
            'id': cuenta.id,
            'cliente_id': cliente.id,
            'cliente_nombre': cliente.nombre,
            'venta_id': cuenta.venta_id,
            'numero_venta': cuenta.numero_venta,
            'fecha_emision': cuenta.fecha_emision.strftime('%d/%m/%Y %H:%M') if cuenta.fecha_emision else '',
            'monto_original_usd': round(cuenta.monto_original_usd or 0.0, 2),
            'monto_abonado_usd': round(cuenta.monto_abonado_usd or 0.0, 2),
            'saldo_pendiente_usd': round(cuenta.saldo_pendiente_usd or 0.0, 2),
            'estado': cuenta.estado,
            'abonos': abonos_payload,
        })

        transacciones.append({
            'tipo': 'FACT',
            'fecha': cuenta.fecha_emision.strftime('%d/%m/%Y %H:%M') if cuenta.fecha_emision else '',
            'cuenta_id': cuenta.id,
            'venta_id': cuenta.venta_id,
            'numero_venta': cuenta.numero_venta,
            'descripcion': f'Factura / Venta #{cuenta.numero_venta or cuenta.venta_id}',
            'cargo_usd': round(cuenta.monto_original_usd or 0.0, 2),
            'abono_usd': 0.0,
            'saldo_documento_usd': round(cuenta.saldo_pendiente_usd or 0.0, 2),
            'estado': cuenta.estado,
        })

        for abono in abonos_payload:
            transacciones.append({
                'tipo': 'PAGO',
                'fecha': abono['fecha'],
                'cuenta_id': cuenta.id,
                'venta_id': cuenta.venta_id,
                'numero_venta': cuenta.numero_venta,
                'descripcion': f"{abono['medio']} {abono['moneda']} {abono['monto']:.2f}",
                'cargo_usd': 0.0,
                'abono_usd': round(abono['equivalente_usd'] or 0.0, 2),
                'saldo_documento_usd': round(cuenta.saldo_pendiente_usd or 0.0, 2),
                'estado': cuenta.estado,
            })

    for movimiento in movimientos:
        if movimiento.tipo_movimiento not in ('aplicacion_saldo_favor', 'aplicacion_saldo_favor_venta', 'saldo_a_favor', 'devolucion_saldo_favor'):
            continue
        referencia = movimiento.movimiento_referencia
        numero_venta_origen = None
        if referencia and referencia.venta:
            numero_venta_origen = referencia.venta.numero_venta or referencia.venta_id
        elif movimiento.venta:
            numero_venta_origen = movimiento.venta.numero_venta or movimiento.venta_id

        descripcion = movimiento.descripcion or 'Movimiento de saldo a favor'
        if movimiento.tipo_movimiento == 'saldo_a_favor' and numero_venta_origen:
            descripcion = f'Saldo a favor generado por la venta #{numero_venta_origen}'
        elif movimiento.tipo_movimiento in ('aplicacion_saldo_favor', 'aplicacion_saldo_favor_venta') and numero_venta_origen:
            numero_destino = None
            if movimiento.cuenta_por_cobrar and movimiento.cuenta_por_cobrar.numero_venta:
                numero_destino = movimiento.cuenta_por_cobrar.numero_venta
            elif movimiento.venta:
                numero_destino = movimiento.venta.numero_venta or movimiento.venta_id
            descripcion = f'Saldo a favor aplicado desde venta #{numero_venta_origen}' + (f' a factura #{numero_destino}' if numero_destino else '')
        elif movimiento.tipo_movimiento == 'devolucion_saldo_favor':
            descripcion = movimiento.descripcion or 'Devolucion de saldo a favor al cliente'

        transacciones.append({
            'tipo': 'SALDO' if movimiento.tipo_movimiento == 'saldo_a_favor' else ('DEVOLUCION' if movimiento.tipo_movimiento == 'devolucion_saldo_favor' else 'APLICACION'),
            'fecha': movimiento.fecha.strftime('%d/%m/%Y %H:%M') if movimiento.fecha else '',
            'cuenta_id': movimiento.cuenta_por_cobrar_id,
            'venta_id': movimiento.venta_id,
            'numero_venta': None,
            'descripcion': descripcion,
            'cargo_usd': round(movimiento.monto_usd or 0.0, 2) if movimiento.tipo_movimiento == 'saldo_a_favor' else 0.0,
            'abono_usd': 0.0 if movimiento.tipo_movimiento == 'saldo_a_favor' else round(movimiento.monto_usd or 0.0, 2),
            'saldo_documento_usd': None,
            'estado': '',
            'movimiento_referencia_id': movimiento.movimiento_referencia_id,
        })

    transacciones.sort(key=lambda item: datetime.strptime(item['fecha'], '%d/%m/%Y %H:%M') if item['fecha'] else datetime.min, reverse=True)

    return jsonify({
        'cliente': serializar_cliente(cliente),
        'cuentas_por_cobrar': cuentas_payload,
        'transacciones': transacciones,
    })


@clientes_bp.route('/<int:cliente_id>/devolver-saldo-favor', methods=['POST'])
@require_roles('admin', 'cajero')
def devolver_saldo_a_favor(cliente_id: int):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json() or {}
    current_user = get_current_user()

    monto_usd = round(float(data.get('monto_usd') or 0), 2)
    medio = (data.get('medio') or '').strip() or 'Efectivo'
    observacion = (data.get('observacion') or '').strip()

    if monto_usd <= 0:
        return jsonify({'error': 'El monto a devolver debe ser mayor a cero'}), 400

    saldo_actual = round(cliente.saldo_a_favor_usd or 0.0, 2)
    if saldo_actual <= 0.001:
        return jsonify({'error': 'El cliente no tiene saldo a favor para devolver'}), 400
    if monto_usd > saldo_actual + 0.001:
        return jsonify({'error': 'El monto excede el saldo a favor disponible'}), 400

    try:
        restante_por_devolver = monto_usd
        fuentes_saldo = obtener_saldos_a_favor_disponibles(cliente.id)

        for fuente in fuentes_saldo:
            if restante_por_devolver <= 0.001:
                break
            disponible = round(fuente.saldo_disponible_usd or 0.0, 2)
            if disponible <= 0.001:
                continue

            monto_desde_fuente = round(min(disponible, restante_por_devolver), 2)
            fuente.saldo_disponible_usd = round(disponible - monto_desde_fuente, 2)

            movimiento = MovimientoCuentaCliente(
                cliente_id=cliente.id,
                venta_id=fuente.venta_id,
                movimiento_referencia_id=fuente.id,
                tipo_movimiento='devolucion_saldo_favor',
                monto_usd=monto_desde_fuente,
                saldo_disponible_usd=0.0,
                moneda_origen='USD',
                monto_origen=monto_desde_fuente,
                tasa_usada=1.0,
                medio=medio,
                descripcion=observacion or 'Devolucion de saldo a favor al cliente',
                usuario_username=current_user.username if current_user else None,
            )
            db.session.add(movimiento)
            restante_por_devolver = round(restante_por_devolver - monto_desde_fuente, 2)

        if restante_por_devolver > 0.001:
            db.session.rollback()
            return jsonify({'error': 'No se pudo rastrear el origen del saldo a favor para la devolucion'}), 400

        cliente.saldo_a_favor_usd = round(max(0.0, saldo_actual - monto_usd), 2)
        db.session.commit()

        return jsonify({
            'mensaje': 'Devolucion de saldo a favor registrada con exito',
            'cliente': serializar_cliente(cliente),
            'monto_devuelto_usd': monto_usd,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
