from flask import Blueprint, jsonify, request
from database import db
from models import Proveedor, Compra, DetalleCompra, HistorialPrecio, Producto

proveedores_bp = Blueprint('proveedores', __name__)

@proveedores_bp.route('/', methods=['GET'])
def get_proveedores():
    proveedores = Proveedor.query.filter_by(activo=True).order_by(Proveedor.nombre).all()
    return jsonify([{
        'id': p.id,
        'nombre': p.nombre,
        'rif': p.rif,
        'telefono': p.telefono,
        'email': p.email,
        'direccion': p.direccion,
        'activo': p.activo
    } for p in proveedores])

@proveedores_bp.route('/', methods=['POST'])
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
