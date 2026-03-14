from flask import Blueprint, jsonify, request
from models import Producto, HistorialPrecio
from database import db

productos_bp = Blueprint('productos', __name__)

@productos_bp.route('/', methods=['GET'])
def get_productos():
    productos = Producto.query.order_by(Producto.nombre).all()
    return jsonify([{
        'id': p.id,
        'codigo': p.codigo,
        'nombre': p.nombre,
        'descripcion': p.descripcion,
        'precio_costo': p.precio_costo,
        'porcentaje_ganancia': p.porcentaje_ganancia,
        'precio_dolares': p.precio_dolares,
        'cantidad': p.cantidad,
        'categoria': p.categoria,
        'metodo_redondeo': p.metodo_redondeo
    } for p in productos])

@productos_bp.route('/', methods=['POST'])
def crear_producto():
    data = request.get_json()
    try:
        nuevo = Producto(
            codigo=data.get('codigo'),
            nombre=data['nombre'],
            descripcion=data.get('descripcion'),
            precio_costo=data.get('precio_costo', 0),
            porcentaje_ganancia=data.get('porcentaje_ganancia', 30),
            precio_dolares=data['precio_dolares'],
            cantidad=data.get('cantidad', 0),
            categoria=data.get('categoria'),
            metodo_redondeo=data.get('metodo_redondeo', 'none')
        )
        db.session.add(nuevo)
        db.session.commit()
        return jsonify({'mensaje': 'Producto creado', 'id': nuevo.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@productos_bp.route('/<int:id>', methods=['PUT'])
def editar_producto(id):
    data = request.get_json()
    prod = Producto.query.get_or_404(id)
    try:
        prod.nombre = data.get('nombre', prod.nombre)
        prod.codigo = data.get('codigo', prod.codigo)
        prod.descripcion = data.get('descripcion', prod.descripcion)
        prod.precio_costo = data.get('precio_costo', prod.precio_costo)
        prod.porcentaje_ganancia = data.get('porcentaje_ganancia', prod.porcentaje_ganancia)
        prod.precio_dolares = data.get('precio_dolares', prod.precio_dolares)
        prod.cantidad = data.get('cantidad', prod.cantidad)
        prod.categoria = data.get('categoria', prod.categoria)
        prod.metodo_redondeo = data.get('metodo_redondeo', prod.metodo_redondeo)
        
        db.session.commit()
        return jsonify({'mensaje': 'Producto actualizado'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@productos_bp.route('/<int:id>', methods=['DELETE'])
def eliminar_producto(id):
    prod = Producto.query.get_or_404(id)
    try:
        db.session.delete(prod)
        db.session.commit()
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
        'motivo': h.motivo,
        'fecha': h.fecha_cambio.strftime('%d/%m/%Y %H:%M')
    } for h in historial])
