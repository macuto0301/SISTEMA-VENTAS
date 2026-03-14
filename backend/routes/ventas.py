from datetime import datetime

from flask import Blueprint, jsonify, request
from auth_utils import get_current_user, require_roles

from database import db
from models import (
    DetalleDevolucionVenta,
    DetalleVenta,
    DevolucionVenta,
    PagoVenta,
    Producto,
    Venta,
)

ventas_bp = Blueprint('ventas', __name__)


def serializar_detalle_venta(detalle: DetalleVenta, cantidad_devuelta: int = 0) -> dict:
    cantidad_disponible = max(0, detalle.cantidad - cantidad_devuelta)
    return {
        'id': detalle.id,
        'detalle_venta_id': detalle.id,
        'producto_id': detalle.producto_id,
        'nombre': detalle.producto_nombre,
        'cantidad': detalle.cantidad,
        'cantidad_devuelta': cantidad_devuelta,
        'cantidad_disponible_devolucion': cantidad_disponible,
        'precio_unitario_dolares': detalle.precio_unitario,
        'subtotal_dolares': detalle.subtotal,
    }


def serializar_devolucion(devolucion: DevolucionVenta) -> dict:
    detalles = DetalleDevolucionVenta.query.filter_by(devolucion_id=devolucion.id).all()
    reintegros = devolucion.reintegros_entregados or []
    if not reintegros and devolucion.monto_reintegrado:
        reintegros = [{
            'metodo': devolucion.metodo_reintegro,
            'moneda': devolucion.moneda_reintegro,
            'monto': devolucion.monto_reintegrado,
            'tasa': devolucion.tasa_reintegro or 0,
            'equivalente_usd': devolucion.total_reintegrado_dolares,
        }]
    return {
        'id': devolucion.id,
        'venta_id': devolucion.venta_id,
        'fecha': devolucion.fecha.strftime('%d/%m/%Y %H:%M'),
        'cliente': devolucion.cliente,
        'motivo': devolucion.motivo or '',
        'metodo_reintegro': devolucion.metodo_reintegro,
        'moneda_reintegro': devolucion.moneda_reintegro,
        'tasa_reintegro': devolucion.tasa_reintegro or 0,
        'monto_reintegrado': devolucion.monto_reintegrado,
        'total_reintegrado_dolares': devolucion.total_reintegrado_dolares,
        'total_reintegrado_bolivares': devolucion.total_reintegrado_bolivares,
        'reintegros_entregados': reintegros,
        'detalles': [{
            'id': d.id,
            'detalle_venta_id': d.detalle_venta_id,
            'producto_id': d.producto_id,
            'producto_nombre': d.producto_nombre,
            'cantidad': d.cantidad,
            'precio_unitario_dolares': d.precio_unitario,
            'subtotal_dolares': d.subtotal,
        } for d in detalles],
    }


def obtener_cantidades_devueltas(venta_id: int) -> dict[int, int]:
    detalles_devueltos = (
        db.session.query(
            DetalleDevolucionVenta.detalle_venta_id,
            db.func.sum(DetalleDevolucionVenta.cantidad),
        )
        .join(DevolucionVenta, DevolucionVenta.id == DetalleDevolucionVenta.devolucion_id)
        .filter(DevolucionVenta.venta_id == venta_id)
        .group_by(DetalleDevolucionVenta.detalle_venta_id)
        .all()
    )
    return {detalle_venta_id: int(total or 0) for detalle_venta_id, total in detalles_devueltos if detalle_venta_id}


@ventas_bp.route('/', methods=['POST'])
@require_roles('admin', 'cajero')
def registrar_venta():
    data = request.get_json()
    current_user = get_current_user()

    if not current_user:
        return jsonify({'error': 'Sesion no valida'}), 401

    try:
        nueva_venta = Venta(
            cliente=data.get('cliente', 'Cliente General'),
            usuario_username=current_user.username,
            usuario_rol=current_user.rol,
            total_dolares=data['total_dolares'],
            total_bolivares=data['total_bolivares'],
            descuento_total=data.get('descuento_dolares', 0),
            porcentaje_bono=data.get('porcentaje_descuento_usd', 0),
            total_pagado_dolares=data.get('total_pagado_real_dolares', 0),
            total_pagado_bs=data.get('total_pagado_real_bs', 0),
            vuelto_entregado=data.get('vueltos_entregados', []),
        )
        db.session.add(nueva_venta)
        db.session.flush()

        for item in data['productos']:
            prod = None
            producto_id = item.get('producto_id')

            if producto_id:
                prod = Producto.query.get(producto_id)
            if not prod:
                prod = Producto.query.filter_by(nombre=item['nombre']).first()

            if prod:
                if prod.cantidad < item['cantidad']:
                    db.session.rollback()
                    return jsonify({'error': f'Stock insuficiente para: {prod.nombre}'}), 400
                prod.cantidad -= item['cantidad']

            detalle = DetalleVenta(
                venta_id=nueva_venta.id,
                producto_id=prod.id if prod else producto_id,
                producto_nombre=item['nombre'],
                cantidad=item['cantidad'],
                precio_unitario=item['precio_unitario_dolares'],
                subtotal=item['subtotal_dolares'],
            )
            db.session.add(detalle)

        for p in data['pagos']:
            pago = PagoVenta(
                venta_id=nueva_venta.id,
                medio=p['medio'],
                monto=p['monto'],
                moneda=p['moneda'],
                valor_reconocido_usd=p['valor_reconocido'],
                descuento_aplicado=p['descuento_aplicado'],
            )
            db.session.add(pago)

        db.session.commit()
        return jsonify({'mensaje': 'Venta registrada con éxito', 'id': nueva_venta.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@ventas_bp.route('/<int:venta_id>/devoluciones', methods=['POST'])
@require_roles('admin', 'cajero')
def registrar_devolucion(venta_id: int):
    data = request.get_json() or {}
    venta = Venta.query.get_or_404(venta_id)

    try:
        items = data.get('items', [])
        if not items:
            return jsonify({'error': 'Debe indicar al menos un producto para devolver'}), 400

        reintegros = data.get('reintegros', [])
        motivo = (data.get('motivo') or '').strip()

        if not reintegros:
            moneda_reintegro = (data.get('moneda_reintegro') or 'USD').upper()
            metodo_reintegro = data.get('metodo_reintegro') or 'Efectivo'
            tasa_reintegro = float(data.get('tasa_reintegro') or 0)
            monto_reintegrado_legacy = float(data.get('monto_reintegrado') or 0)
            reintegros = [{
                'metodo': metodo_reintegro,
                'moneda': moneda_reintegro,
                'monto': monto_reintegrado_legacy,
                'tasa': tasa_reintegro,
            }]

        detalles_venta = {
            detalle.id: detalle
            for detalle in DetalleVenta.query.filter_by(venta_id=venta.id).all()
        }
        cantidades_devueltas = obtener_cantidades_devueltas(venta.id)

        detalles_validados = []
        total_reintegrado_dolares = 0.0

        for item in items:
            detalle_venta_id = item.get('detalle_venta_id')
            cantidad = int(item.get('cantidad') or 0)

            if not detalle_venta_id or detalle_venta_id not in detalles_venta:
                return jsonify({'error': 'Producto de venta no válido para devolución'}), 400
            if cantidad <= 0:
                return jsonify({'error': 'La cantidad a devolver debe ser mayor a cero'}), 400

            detalle_venta = detalles_venta[detalle_venta_id]
            cantidad_ya_devuelta = cantidades_devueltas.get(detalle_venta_id, 0)
            cantidad_disponible = detalle_venta.cantidad - cantidad_ya_devuelta

            if cantidad > cantidad_disponible:
                return jsonify({
                    'error': f'La cantidad a devolver de {detalle_venta.producto_nombre} supera lo disponible'
                }), 400

            subtotal = round(detalle_venta.precio_unitario * cantidad, 2)
            total_reintegrado_dolares += subtotal
            detalles_validados.append((detalle_venta, cantidad, subtotal))

        total_reintegrado_dolares = round(total_reintegrado_dolares, 2)

        reintegros_normalizados = []
        total_reintegrado_bs = 0.0
        total_entregado_usd = 0.0

        for reintegro in reintegros:
            metodo = (reintegro.get('metodo') or 'Efectivo').strip() or 'Efectivo'
            moneda = (reintegro.get('moneda') or 'USD').upper()
            monto = round(float(reintegro.get('monto') or 0), 2)
            tasa = float(reintegro.get('tasa') or 0)

            if moneda not in ('USD', 'BS'):
                return jsonify({'error': 'Moneda de reintegro inválida'}), 400
            if monto <= 0:
                return jsonify({'error': 'Cada entrega de reintegro debe ser mayor a cero'}), 400
            if moneda == 'BS' and tasa <= 0:
                return jsonify({'error': 'Cada reintegro en bolívares debe tener una tasa mayor a cero'}), 400

            equivalente_usd = round(monto / tasa, 2) if moneda == 'BS' else round(monto, 2)
            total_entregado_usd += equivalente_usd
            if moneda == 'BS':
                total_reintegrado_bs += monto

            reintegros_normalizados.append({
                'metodo': metodo,
                'moneda': moneda,
                'monto': monto,
                'tasa': tasa,
                'equivalente_usd': equivalente_usd,
            })

        total_entregado_usd = round(total_entregado_usd, 2)
        total_reintegrado_bs = round(total_reintegrado_bs, 2)

        if abs(total_entregado_usd - total_reintegrado_dolares) > 0.05:
            return jsonify({'error': 'El reintegro total no coincide con el monto de la devolución'}), 400

        if len(reintegros_normalizados) == 1:
            metodo_reintegro = reintegros_normalizados[0]['metodo']
            moneda_reintegro = reintegros_normalizados[0]['moneda']
            tasa_reintegro = reintegros_normalizados[0]['tasa']
            monto_reintegrado = reintegros_normalizados[0]['monto']
        else:
            metodo_reintegro = 'MULTIPLE'
            monedas = {item['moneda'] for item in reintegros_normalizados}
            moneda_reintegro = 'MIXTO' if len(monedas) > 1 else next(iter(monedas))
            tasa_reintegro = 0.0
            monto_reintegrado = total_reintegrado_dolares

        devolucion = DevolucionVenta(
            venta_id=venta.id,
            cliente=venta.cliente,
            motivo=motivo,
            reintegros_entregados=reintegros_normalizados,
            metodo_reintegro=metodo_reintegro,
            moneda_reintegro=moneda_reintegro,
            tasa_reintegro=tasa_reintegro,
            monto_reintegrado=monto_reintegrado,
            total_reintegrado_dolares=total_reintegrado_dolares,
            total_reintegrado_bolivares=total_reintegrado_bs,
        )
        db.session.add(devolucion)
        db.session.flush()

        for detalle_venta, cantidad, subtotal in detalles_validados:
            detalle_devolucion = DetalleDevolucionVenta(
                devolucion_id=devolucion.id,
                detalle_venta_id=detalle_venta.id,
                producto_id=detalle_venta.producto_id,
                producto_nombre=detalle_venta.producto_nombre,
                cantidad=cantidad,
                precio_unitario=detalle_venta.precio_unitario,
                subtotal=subtotal,
            )
            db.session.add(detalle_devolucion)

            if detalle_venta.producto_id:
                producto = Producto.query.get(detalle_venta.producto_id)
                if producto:
                    producto.cantidad += cantidad

        db.session.commit()
        return jsonify({
            'mensaje': 'Devolución registrada con éxito',
            'devolucion': serializar_devolucion(devolucion),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@ventas_bp.route('/', methods=['GET'])
def get_ventas():
    lista_ventas = Venta.query.order_by(Venta.fecha.desc()).all()
    res = []
    for v in lista_ventas:
        cantidades_devueltas = obtener_cantidades_devueltas(v.id)

        detalles = DetalleVenta.query.filter_by(venta_id=v.id).all()
        productos_list = [
            serializar_detalle_venta(d, cantidades_devueltas.get(d.id, 0))
            for d in detalles
        ]

        pagos = PagoVenta.query.filter_by(venta_id=v.id).all()
        pagos_list = [{
            'medio': p.medio,
            'monto': p.monto,
            'moneda': p.moneda,
            'valor_reconocido': p.valor_reconocido_usd,
            'descuento_aplicado': p.descuento_aplicado,
        } for p in pagos]

        devoluciones = DevolucionVenta.query.filter_by(venta_id=v.id).order_by(DevolucionVenta.fecha.desc()).all()
        devoluciones_list = [serializar_devolucion(d) for d in devoluciones]

        res.append({
            'id': v.id,
            'fecha': v.fecha.strftime('%d/%m/%Y %H:%M'),
            'cliente': v.cliente,
            'usuario_username': v.usuario_username,
            'usuario_rol': v.usuario_rol,
            'total_dolares': v.total_dolares,
            'total_bolivares': v.total_bolivares,
            'descuento_dolares': v.descuento_total,
            'productos': productos_list,
            'pagos': pagos_list,
            'vueltos_entregados': v.vuelto_entregado or [],
            'devoluciones': devoluciones_list,
            'total_devuelto_dolares': round(sum(d.total_reintegrado_dolares for d in devoluciones), 2),
            'total_devuelto_bolivares': round(sum(d.total_reintegrado_bolivares for d in devoluciones), 2),
            'cantidad_items_devueltos': sum(det.get('cantidad', 0) for d in devoluciones_list for det in d['detalles']),
        })
    return jsonify(res)
