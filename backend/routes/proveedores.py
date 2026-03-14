from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from auth_utils import require_roles
from database import db
from models import Proveedor, Compra, DetalleCompra, HistorialPrecio, Producto
from pagination import build_paginated_response, get_pagination_params, has_pagination_args

proveedores_bp = Blueprint('proveedores', __name__)

@proveedores_bp.route('/', methods=['GET'])
def get_proveedores():
    query = Proveedor.query.filter_by(activo=True).order_by(Proveedor.nombre)
    page = 1
    page_size = 20
    paginacion = None

    busqueda = (request.args.get('q') or '').strip()
    nombre = (request.args.get('nombre') or '').strip()
    rif = (request.args.get('rif') or '').strip()
    telefono = (request.args.get('telefono') or '').strip()
    email = (request.args.get('email') or '').strip()

    if busqueda:
        termino = f'%{busqueda}%'
        query = query.filter(or_(
            Proveedor.nombre.ilike(termino),
            Proveedor.rif.ilike(termino),
            Proveedor.telefono.ilike(termino),
            Proveedor.email.ilike(termino),
            Proveedor.direccion.ilike(termino),
        ))

    if nombre:
        query = query.filter(Proveedor.nombre.ilike(f'%{nombre}%'))
    if rif:
        query = query.filter(Proveedor.rif.ilike(f'%{rif}%'))
    if telefono:
        query = query.filter(Proveedor.telefono.ilike(f'%{telefono}%'))
    if email:
        query = query.filter(Proveedor.email.ilike(f'%{email}%'))

    if has_pagination_args():
        page, page_size = get_pagination_params()
        paginacion = query.paginate(page=page, per_page=page_size, error_out=False)
        proveedores = paginacion.items
    else:
        proveedores = query.all()

    items = [{
        'id': p.id,
        'nombre': p.nombre,
        'rif': p.rif,
        'telefono': p.telefono,
        'email': p.email,
        'direccion': p.direccion,
        'activo': p.activo
    } for p in proveedores]

    if has_pagination_args():
        total = paginacion.total if paginacion else len(items)
        return jsonify(build_paginated_response(items, total, page, page_size))

    return jsonify(items)

@proveedores_bp.route('/', methods=['POST'])
@require_roles('admin')
def crear_proveedor():
    data = request.get_json()
    try:
        nuevo = Proveedor(
            nombre=data['nombre'],
            rif=data['rif'],
            telefono=data.get('telefono'),
            email=data.get('email'),
            direccion=data.get('direccion')
        )
        db.session.add(nuevo)
        db.session.commit()
        return jsonify({'mensaje': 'Proveedor creado', 'id': nuevo.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@proveedores_bp.route('/<int:id>', methods=['GET'])
def get_proveedor(id):
    proveedor = Proveedor.query.get_or_404(id)
    return jsonify({
        'id': proveedor.id,
        'nombre': proveedor.nombre,
        'rif': proveedor.rif,
        'telefono': proveedor.telefono,
        'email': proveedor.email,
        'direccion': proveedor.direccion,
        'activo': proveedor.activo
    })

@proveedores_bp.route('/<int:id>', methods=['PUT'])
@require_roles('admin')
def actualizar_proveedor(id):
    proveedor = Proveedor.query.get_or_404(id)
    data = request.get_json()
    try:
        proveedor.nombre = data.get('nombre', proveedor.nombre)
        proveedor.rif = data.get('rif', proveedor.rif)
        proveedor.telefono = data.get('telefono', proveedor.telefono)
        proveedor.email = data.get('email', proveedor.email)
        proveedor.direccion = data.get('direccion', proveedor.direccion)
        if 'activo' in data:
            proveedor.activo = data['activo']
        db.session.commit()
        return jsonify({'mensaje': 'Proveedor actualizado'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@proveedores_bp.route('/<int:id>', methods=['DELETE'])
@require_roles('admin')
def eliminar_proveedor(id):
    proveedor = Proveedor.query.get_or_404(id)
    proveedor.activo = False
    db.session.commit()
    return jsonify({'mensaje': 'Proveedor eliminado'})

@proveedores_bp.route('/<int:id>/compras', methods=['GET'])
def get_compras_proveedor(id):
    compras = Compra.query.filter_by(proveedor_id=id).order_by(Compra.fecha.desc()).all()
    return jsonify([{
        'id': c.id,
        'fecha': c.fecha.strftime('%d/%m/%Y %H:%M'),
        'total_dolares': c.total_dolares,
        'total_bs': c.total_bs,
        'estado': c.estado,
        'detalles': [{
            'producto_nombre': d.producto_nombre,
            'cantidad': d.cantidad,
            'precio_unitario': d.precio_unitario,
            'subtotal': d.subtotal
        } for d in c.detalles]
    } for c in compras])
