from flask import Blueprint, jsonify, request
from datetime import datetime
from sqlalchemy import or_
from auth_utils import require_roles
from database import db
from models import Compra, DetalleCompra, HistorialPrecio, Producto, Proveedor
from pagination import build_paginated_response, get_pagination_params, has_pagination_args

compras_bp = Blueprint('compras', __name__)

@compras_bp.route('/', methods=['GET'])
def get_compras():
    try:
        query = Compra.query.outerjoin(Proveedor, Compra.proveedor_id == Proveedor.id)
        page = 1
        page_size = 20
        paginacion = None

        busqueda = (request.args.get('q') or '').strip()
        factura = (request.args.get('factura') or '').strip()
        fecha = (request.args.get('fecha') or '').strip()
        fecha_libro = (request.args.get('fecha_libro') or '').strip()
        proveedor = (request.args.get('proveedor') or '').strip()
        estado = (request.args.get('estado') or '').strip()
        fecha_inicio = (request.args.get('fecha_inicio') or '').strip()
        fecha_fin = (request.args.get('fecha_fin') or '').strip()

        if busqueda:
            termino = f'%{busqueda}%'
            query = query.filter(or_(
                db.cast(Compra.numero_compra, db.String).ilike(termino),
                Compra.nro_factura.ilike(termino),
                Proveedor.nombre.ilike(termino),
                Compra.estado.ilike(termino),
            ))

        if factura:
            query = query.filter(Compra.nro_factura.ilike(f'%{factura}%'))
        if fecha:
            query = query.filter(db.cast(Compra.fecha, db.String).ilike(f'%{fecha}%'))
        if fecha_libro:
            query = query.filter(db.cast(Compra.fecha_libro, db.String).ilike(f'%{fecha_libro}%'))
        if proveedor:
            query = query.filter(Proveedor.nombre.ilike(f'%{proveedor}%'))
        if estado:
            query = query.filter(Compra.estado == estado)
        if fecha_inicio:
            query = query.filter(Compra.fecha >= datetime.strptime(fecha_inicio, '%Y-%m-%d').date())
        if fecha_fin:
            query = query.filter(Compra.fecha <= datetime.strptime(fecha_fin, '%Y-%m-%d').date())

        query = query.order_by(Compra.created_at.desc())
        if has_pagination_args():
            page, page_size = get_pagination_params()
            paginacion = query.paginate(page=page, per_page=page_size, error_out=False)
            compras = paginacion.items
        else:
            compras = query.all()

        items = [{
            'id': c.id,
            'numero_compra': c.numero_compra or c.id,
            'nro_factura': c.nro_factura,
            'fecha': c.fecha.strftime('%Y-%m-%d') if c.fecha else '',
            'fecha_libro': c.fecha_libro.strftime('%Y-%m-%d') if c.fecha_libro else '',
            'proveedor_id': c.proveedor_id,
            'proveedor_nombre': c.proveedor.nombre if c.proveedor else '',
            'total_dolares': c.total_dolares,
            'total_bs': c.total_bs if hasattr(c, 'total_bs') else 0,
            'estado': c.estado
        } for c in compras]

        if has_pagination_args():
            total = paginacion.total if paginacion and paginacion.total is not None else len(items)
            return jsonify(build_paginated_response(items, total, page, page_size))

        return jsonify(items)
    except Exception as e:
        import traceback
        print("Error en get_compras:", traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@compras_bp.route('/', methods=['POST'])
@require_roles('admin')
def crear_compra():
    data = request.get_json()
    try:
        # Verificar que el proveedor existe
        from models import Proveedor
        proveedor_id = data.get('proveedor_id')

        if proveedor_id:
            proveedor = Proveedor.query.get(proveedor_id)
            if not proveedor:
                return jsonify({'error': 'Proveedor no encontrado'}), 404
        
        nueva = Compra(
            proveedor_id=proveedor_id,
            nro_factura=data.get('nro_factura'),
            fecha=datetime.strptime(data['fecha'], '%Y-%m-%d').date() if data.get('fecha') else datetime.utcnow().date(),
            fecha_libro=datetime.strptime(data['fecha_libro'], '%Y-%m-%d').date() if data.get('fecha_libro') else None,
            total_dolares=data['total_dolares'],
            total_bs=data.get('total_bs', 0),
            estado=data.get('estado', 'pendiente')
        )
        db.session.add(nueva)
        db.session.flush()
        nueva.numero_compra = nueva.id

        for item in data.get('detalles', []):
            detalle = DetalleCompra(
                compra_id=nueva.id,
                producto_id=item.get('producto_id'),
                producto_nombre=item['producto_nombre'],
                cantidad=item['cantidad'],
                precio_unitario=item['precio_unitario'],
                subtotal=item['subtotal']
            )
            db.session.add(detalle)

            producto = Producto.query.get(item.get('producto_id'))
            if producto:
                precio_anterior = producto.precio_costo
                producto.cantidad += item['cantidad']
                producto.precio_costo = item['precio_unitario']
                
                if precio_anterior != item['precio_unitario']:
                    historial = HistorialPrecio(
                        producto_id=producto.id,
                        precio_anterior=precio_anterior,
                        precio_nuevo=item['precio_unitario'],
                        tipo_precio='costo',
                        motivo='compra'
                    )
                    db.session.add(historial)

        db.session.commit()
        return jsonify({
            'mensaje': 'Compra registrada',
            'id': nueva.id,
            'numero_compra': nueva.numero_compra,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@compras_bp.route('/<int:id>', methods=['GET'])
def get_compra(id):
    compra = Compra.query.get_or_404(id)
    return jsonify({
        'id': compra.id,
        'numero_compra': compra.numero_compra or compra.id,
        'nro_factura': compra.nro_factura,
        'fecha': compra.fecha.strftime('%Y-%m-%d') if compra.fecha else '',
        'fecha_libro': compra.fecha_libro.strftime('%Y-%m-%d') if compra.fecha_libro else '',
        'proveedor_id': compra.proveedor_id,
        'proveedor_nombre': compra.proveedor.nombre if compra.proveedor else '',
        'proveedor_rif': compra.proveedor.rif if compra.proveedor else '',
        'total_dolares': compra.total_dolares,
        'total_bs': compra.total_bs,
        'estado': compra.estado,
        'detalles': [{
            'id': d.id,
            'producto_id': d.producto_id,
            'producto_nombre': d.producto_nombre,
            'cantidad': d.cantidad,
            'precio_unitario': d.precio_unitario,
            'subtotal': d.subtotal
        } for d in compra.detalles]
    })

@compras_bp.route('/<int:id>/estado', methods=['PUT'])
@require_roles('admin')
def actualizar_estado_compra(id):
    compra = Compra.query.get_or_404(id)
    data = request.get_json()
    try:
        compra.estado = data.get('estado', compra.estado)
        db.session.commit()
        return jsonify({'mensaje': 'Estado actualizado'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@compras_bp.route('/<int:id>', methods=['DELETE'])
@require_roles('admin')
def eliminar_compra(id):
    compra = Compra.query.get_or_404(id)
    try:
        for detalle in compra.detalles:
            if detalle.producto_id:
                producto = Producto.query.get(detalle.producto_id)
                if producto and producto.cantidad >= detalle.cantidad:
                    producto.cantidad -= detalle.cantidad
        compra.estado = 'cancelada'
        db.session.commit()
        return jsonify({'mensaje': 'Compra cancelada'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
