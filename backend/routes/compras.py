from flask import Blueprint, jsonify, request
from datetime import datetime
from auth_utils import require_roles
from database import db
from models import Compra, DetalleCompra, HistorialPrecio, Producto

compras_bp = Blueprint('compras', __name__)

@compras_bp.route('/', methods=['GET'])
def get_compras():
    try:
        compras = Compra.query.order_by(Compra.created_at.desc()).all()
        return jsonify([{
            'id': c.id,
            'nro_factura': c.nro_factura,
            'fecha': c.fecha.strftime('%Y-%m-%d') if c.fecha else '',
            'fecha_libro': c.fecha_libro.strftime('%Y-%m-%d') if c.fecha_libro else '',
            'proveedor_id': c.proveedor_id,
            'proveedor_nombre': c.proveedor.nombre if c.proveedor else '',
            'total_dolares': c.total_dolares,
            'total_bs': c.total_bs if hasattr(c, 'total_bs') else 0,
            'estado': c.estado
        } for c in compras])
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
                        motivo='compra'
                    )
                    db.session.add(historial)

        db.session.commit()
        return jsonify({'mensaje': 'Compra registrada', 'id': nueva.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@compras_bp.route('/<int:id>', methods=['GET'])
def get_compra(id):
    compra = Compra.query.get_or_404(id)
    return jsonify({
        'id': compra.id,
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
