from flask import Blueprint, jsonify, request
from models import Venta, DetalleVenta, PagoVenta, Producto
from database import db
from datetime import datetime

ventas_bp = Blueprint('ventas', __name__)

@ventas_bp.route('/', methods=['POST'])
def registrar_venta():
    data = request.get_json()
    try:
        # 1. Crear Venta Principal
        nueva_venta = Venta(
            cliente=data.get('cliente', 'Cliente General'),
            total_dolares=data['total_dolares'],
            total_bolivares=data['total_bolivares'],
            descuento_total=data.get('descuento_dolares', 0),
            porcentaje_bono=data.get('porcentaje_descuento_usd', 0),
            total_pagado_dolares=data.get('total_pagado_real_dolares', 0),
            total_pagado_bs=data.get('total_pagado_real_bs', 0),
            vuelto_entregado=data.get('vueltos_entregados', []) # Lista de objetos de vuelto
        )
        db.session.add(nueva_venta)
        db.session.flush() # Para obtener el ID

        # 2. Registrar Detalle y Actualizar Stock
        for item in data['productos']:
            # Buscar el producto para descontar stock
            # (En el front enviamos nombres, lo ideal es enviar ID)
            prod = Producto.query.filter_by(nombre=item['nombre']).first()
            if prod:
                if prod.cantidad < item['cantidad']:
                    db.session.rollback()
                    return jsonify({'error': f'Stock insuficiente para: {prod.nombre}'}), 400
                prod.cantidad -= item['cantidad']

            detalle = DetalleVenta(
                venta_id=nueva_venta.id,
                producto_id=prod.id if prod else None,
                producto_nombre=item['nombre'],
                cantidad=item['cantidad'],
                precio_unitario=item['precio_unitario_dolares'],
                subtotal=item['subtotal_dolares']
            )
            db.session.add(detalle)

        # 3. Registrar Pagos
        for p in data['pagos']:
            pago = PagoVenta(
                venta_id=nueva_venta.id,
                medio=p['medio'],
                monto=p['monto'],
                moneda=p['moneda'],
                valor_reconocido_usd=p['valor_reconocido'],
                descuento_aplicado=p['descuento_aplicado']
            )
            db.session.add(pago)

        db.session.commit()
        return jsonify({'mensaje': 'Venta registrada con éxito', 'id': nueva_venta.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ventas_bp.route('/', methods=['GET'])
def get_ventas():
    lista_ventas = Venta.query.order_by(Venta.fecha.desc()).all()
    res = []
    for v in lista_ventas:
        # Obtener detalles (productos)
        detalles = DetalleVenta.query.filter_by(venta_id=v.id).all()
        productos_list = [{
            'nombre': d.producto_nombre,
            'cantidad': d.cantidad,
            'precio_unitario_dolares': d.precio_unitario,
            'subtotal_dolares': d.subtotal
        } for d in detalles]

        # Obtener pagos
        pagos = PagoVenta.query.filter_by(venta_id=v.id).all()
        pagos_list = [{
            'medio': p.medio,
            'monto': p.monto,
            'moneda': p.moneda,
            'valor_reconocido': p.valor_reconocido_usd,
            'descuento_aplicado': p.descuento_aplicado
        } for p in pagos]

        res.append({
            'id': v.id,
            'fecha': v.fecha.strftime('%d/%m/%Y %H:%M'),
            'cliente': v.cliente,
            'total_dolares': v.total_dolares,
            'total_bolivares': v.total_bolivares,
            'descuento_dolares': v.descuento_total,
            'productos': productos_list,
            'pagos': pagos_list,
            'vueltos_entregados': v.vuelto_entregado or []
        })
    return jsonify(res)
