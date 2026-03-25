from datetime import datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_
from auth_utils import get_current_user, require_roles
from cuenta_corriente_utils import obtener_saldos_a_favor_disponibles

from database import db
from pagination import build_paginated_response, get_pagination_params, has_pagination_args
from models import (
    Cliente,
    CuentaPorCobrar,
    DetalleDevolucionVenta,
    DetalleVenta,
    DevolucionVenta,
    MovimientoCuentaCliente,
    PagoVenta,
    Producto,
    Venta,
    ahora_local,
)

ventas_bp = Blueprint('ventas', __name__)


def producto_maneja_existencia(producto: Producto | None) -> bool:
    return bool(producto and getattr(producto, 'maneja_existencia', True))


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
        'costo_unitario': detalle.costo_unitario,
        'subtotal_dolares': detalle.subtotal,
        'lista_precio': detalle.lista_precio or 1,
    }


def serializar_devolucion(devolucion: DevolucionVenta) -> dict:
    detalles = DetalleDevolucionVenta.query.filter_by(devolucion_id=devolucion.id).all()
    reintegros = devolucion.reintegros_entregados or []
    venta = Venta.query.get(devolucion.venta_id)
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
        'venta_numero_venta': venta.numero_venta if venta and venta.numero_venta else devolucion.venta_id,
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
            'lista_precio': getattr(d, 'lista_precio', 1) or 1,
        } for d in detalles],
    }


def obtener_cantidades_devueltas(venta_id: int) -> dict[int, float]:
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
    return {detalle_venta_id: float(total or 0) for detalle_venta_id, total in detalles_devueltos if detalle_venta_id}


def crear_movimiento_cliente(
    cliente_id: int,
    tipo_movimiento: str,
    monto_usd: float,
    venta_id: int | None = None,
    cuenta_por_cobrar_id: int | None = None,
    moneda_origen: str = 'USD',
    monto_origen: float = 0.0,
    tasa_usada: float = 0.0,
    medio: str | None = None,
    descripcion: str | None = None,
    usuario_username: str | None = None,
    movimiento_referencia_id: int | None = None,
    saldo_disponible_usd: float | None = None,
) -> None:
    movimiento = MovimientoCuentaCliente(
        cliente_id=cliente_id,
        venta_id=venta_id,
        cuenta_por_cobrar_id=cuenta_por_cobrar_id,
        movimiento_referencia_id=movimiento_referencia_id,
        tipo_movimiento=tipo_movimiento,
        monto_usd=round(monto_usd or 0.0, 2),
        saldo_disponible_usd=round(saldo_disponible_usd if saldo_disponible_usd is not None else (monto_usd if tipo_movimiento == 'saldo_a_favor' else 0.0), 2),
        moneda_origen=moneda_origen,
        monto_origen=round(monto_origen or 0.0, 2),
        tasa_usada=tasa_usada or 0.0,
        medio=medio,
        descripcion=descripcion,
        usuario_username=usuario_username,
    )
    db.session.add(movimiento)


@ventas_bp.route('/', methods=['POST'])
@require_roles('admin', 'cajero')
def registrar_venta():
    data = request.get_json() or {}
    current_user = get_current_user()

    if not current_user:
        return jsonify({'error': 'Sesion no valida'}), 401

    try:
        cliente_id = data.get('cliente_id')
        cliente_nombre = (data.get('cliente') or 'Cliente General').strip() or 'Cliente General'
        cliente = Cliente.query.get(cliente_id) if cliente_id else None
        pagos = data.get('pagos', [])
        saldo_a_favor_aplicado_usd = round(float(data.get('saldo_a_favor_aplicado_usd') or 0), 2)
        saldo_a_favor_generado_usd = round(float(data.get('saldo_a_favor_generado_usd') or 0), 2)
        total_reconocido_pagos = round(sum(float(p.get('valor_reconocido') or 0) for p in pagos), 2)
        total_dolares = round(float(data['total_dolares']), 2)
        saldo_pendiente_usd = round(float(data.get('saldo_pendiente_usd') or max(0.0, total_dolares - total_reconocido_pagos - saldo_a_favor_aplicado_usd)), 2)
        tipo_venta = 'credito' if saldo_pendiente_usd > 0.01 else 'contado'

        if (saldo_pendiente_usd > 0.01 or saldo_a_favor_generado_usd > 0.01 or saldo_a_favor_aplicado_usd > 0.01) and not cliente:
            return jsonify({'error': 'Debe seleccionar un cliente para ventas con saldo pendiente o saldo a favor'}), 400

        if saldo_a_favor_aplicado_usd > 0.01:
            if not cliente:
                return jsonify({'error': 'No se encontro el cliente para aplicar saldo a favor'}), 400
            if saldo_a_favor_aplicado_usd > round(cliente.saldo_a_favor_usd or 0.0, 2) + 0.001:
                return jsonify({'error': 'El cliente no tiene suficiente saldo a favor'}), 400

        nueva_venta = Venta(
            fecha=ahora_local(),
            cliente_id=cliente.id if cliente else None,
            cliente=cliente.nombre if cliente else cliente_nombre,
            usuario_username=current_user.username,
            usuario_rol=current_user.rol,
            tipo_venta=tipo_venta,
            total_dolares=total_dolares,
            total_bolivares=data['total_bolivares'],
            descuento_total=data.get('descuento_dolares', 0),
            porcentaje_bono=data.get('porcentaje_descuento_usd', 0),
            total_pagado_dolares=data.get('total_pagado_real_dolares', 0),
            total_pagado_bs=data.get('total_pagado_real_bs', 0),
            saldo_pendiente_usd=saldo_pendiente_usd,
            saldo_a_favor_generado_usd=saldo_a_favor_generado_usd,
            vuelto_entregado=data.get('vueltos_entregados', []),
        )
        db.session.add(nueva_venta)
        db.session.flush()
        nueva_venta.numero_venta = nueva_venta.id

        for item in data['productos']:
            prod = None
            producto_id = item.get('producto_id')

            if producto_id:
                prod = Producto.query.get(producto_id)
            if not prod:
                prod = Producto.query.filter_by(nombre=item['nombre']).first()

            cantidad_item = float(item['cantidad'])

            # Validar decimales: solo permitir si el producto tiene permite_decimal
            if prod and not prod.permite_decimal and cantidad_item != int(cantidad_item):
                db.session.rollback()
                return jsonify({'error': f'El producto {prod.nombre} no permite cantidades decimales'}), 400

            if cantidad_item <= 0:
                db.session.rollback()
                return jsonify({'error': f'La cantidad debe ser mayor a cero para: {item["nombre"]}'}), 400

            if producto_maneja_existencia(prod):
                if prod.cantidad < cantidad_item:
                    db.session.rollback()
                    return jsonify({'error': f'Stock insuficiente para: {prod.nombre}'}), 400
                prod.cantidad -= cantidad_item

            detalle = DetalleVenta(
                venta_id=nueva_venta.id,
                producto_id=prod.id if prod else producto_id,
                producto_nombre=item['nombre'],
                cantidad=cantidad_item,
                precio_unitario=item['precio_unitario_dolares'],
                costo_unitario=(prod.precio_costo if prod else 0.0),
                subtotal=item['subtotal_dolares'],
                lista_precio=int(item.get('lista_precio') or 1),
            )
            db.session.add(detalle)

        for p in pagos:
            pago = PagoVenta(
                venta_id=nueva_venta.id,
                medio=p['medio'],
                monto=p['monto'],
                moneda=p['moneda'],
                valor_reconocido_usd=p['valor_reconocido'],
                descuento_aplicado=p['descuento_aplicado'],
            )
            db.session.add(pago)

        cuenta_por_cobrar = None
        if saldo_a_favor_aplicado_usd > 0.01 and cliente:
            cliente.saldo_a_favor_usd = round((cliente.saldo_a_favor_usd or 0.0) - saldo_a_favor_aplicado_usd, 2)
            restante_por_aplicar = saldo_a_favor_aplicado_usd
            fuentes_saldo = obtener_saldos_a_favor_disponibles(cliente.id)

            for fuente in fuentes_saldo:
                if restante_por_aplicar <= 0.001:
                    break
                disponible = round(fuente.saldo_disponible_usd or 0.0, 2)
                if disponible <= 0.001:
                    continue
                monto_desde_fuente = round(min(disponible, restante_por_aplicar), 2)
                fuente.saldo_disponible_usd = round(disponible - monto_desde_fuente, 2)
                numero_venta_origen = fuente.venta.numero_venta if fuente.venta and fuente.venta.numero_venta else fuente.venta_id
                crear_movimiento_cliente(
                    cliente_id=cliente.id,
                    venta_id=nueva_venta.id,
                    tipo_movimiento='aplicacion_saldo_favor_venta',
                    monto_usd=monto_desde_fuente,
                    moneda_origen='USD',
                    monto_origen=monto_desde_fuente,
                    tasa_usada=1.0,
                    medio='Saldo a favor',
                    descripcion=f'Saldo a favor aplicado a la venta #{nueva_venta.numero_venta} usando saldo originado en la venta #{numero_venta_origen}',
                    usuario_username=current_user.username,
                    movimiento_referencia_id=fuente.id,
                    saldo_disponible_usd=0.0,
                )
                restante_por_aplicar = round(restante_por_aplicar - monto_desde_fuente, 2)

            if restante_por_aplicar > 0.001:
                db.session.rollback()
                return jsonify({'error': 'No se pudo rastrear completamente el saldo a favor disponible del cliente'}), 400

        if saldo_pendiente_usd > 0.01 and cliente:
            cuenta_por_cobrar = CuentaPorCobrar(
                cliente_id=cliente.id,
                venta_id=nueva_venta.id,
                numero_venta=nueva_venta.numero_venta,
                monto_original_usd=saldo_pendiente_usd,
                monto_abonado_usd=0.0,
                saldo_pendiente_usd=saldo_pendiente_usd,
                estado='pendiente',
                observacion=(data.get('observacion_credito') or '').strip() or None,
            )
            db.session.add(cuenta_por_cobrar)
            db.session.flush()
            crear_movimiento_cliente(
                cliente_id=cliente.id,
                venta_id=nueva_venta.id,
                cuenta_por_cobrar_id=cuenta_por_cobrar.id,
                tipo_movimiento='cargo_venta_credito',
                monto_usd=saldo_pendiente_usd,
                moneda_origen='USD',
                monto_origen=saldo_pendiente_usd,
                tasa_usada=1.0,
                medio='Credito',
                descripcion=f'Saldo pendiente generado por la venta #{nueva_venta.numero_venta}',
                usuario_username=current_user.username,
            )

        if saldo_a_favor_generado_usd > 0.01 and cliente:
            cliente.saldo_a_favor_usd = round((cliente.saldo_a_favor_usd or 0.0) + saldo_a_favor_generado_usd, 2)
            crear_movimiento_cliente(
                cliente_id=cliente.id,
                venta_id=nueva_venta.id,
                cuenta_por_cobrar_id=cuenta_por_cobrar.id if cuenta_por_cobrar else None,
                tipo_movimiento='saldo_a_favor',
                monto_usd=saldo_a_favor_generado_usd,
                moneda_origen='USD',
                monto_origen=saldo_a_favor_generado_usd,
                tasa_usada=1.0,
                medio='Excedente sin vuelto',
                descripcion=f'Saldo a favor generado por excedente en la venta #{nueva_venta.numero_venta}',
                usuario_username=current_user.username,
            )

        db.session.commit()
        return jsonify({
            'mensaje': 'Venta registrada con éxito',
            'id': nueva_venta.id,
            'numero_venta': nueva_venta.numero_venta,
            'tipo_venta': nueva_venta.tipo_venta,
            'saldo_pendiente_usd': nueva_venta.saldo_pendiente_usd,
            'saldo_a_favor_generado_usd': nueva_venta.saldo_a_favor_generado_usd,
            'cuenta_por_cobrar_id': cuenta_por_cobrar.id if cuenta_por_cobrar else None,
        }), 201

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
            cantidad = float(item.get('cantidad') or 0)

            if not detalle_venta_id or detalle_venta_id not in detalles_venta:
                return jsonify({'error': 'Producto de venta no válido para devolución'}), 400
            if cantidad <= 0:
                return jsonify({'error': 'La cantidad a devolver debe ser mayor a cero'}), 400

            detalle_venta = detalles_venta[detalle_venta_id]

            # Validar decimales segun producto
            if detalle_venta.producto_id:
                producto_dev = Producto.query.get(detalle_venta.producto_id)
                if producto_dev and not producto_dev.permite_decimal and cantidad != int(cantidad):
                    return jsonify({
                        'error': f'El producto {detalle_venta.producto_nombre} no permite cantidades decimales'
                    }), 400

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
                lista_precio=detalle_venta.lista_precio or 1,
            )
            db.session.add(detalle_devolucion)

            if detalle_venta.producto_id:
                producto = Producto.query.get(detalle_venta.producto_id)
                if producto_maneja_existencia(producto):
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
    query = Venta.query
    page = 1
    page_size = 20
    paginacion = None
    summary = {
        'total_ventas': 0,
        'total_dolares': 0.0,
        'total_bolivares': 0.0,
        'promedio_dolares': 0.0,
        'promedio_bolivares': 0.0,
    }

    busqueda = (request.args.get('q') or '').strip()
    fecha = (request.args.get('fecha') or '').strip()
    usuario = (request.args.get('usuario') or '').strip()
    rol = (request.args.get('rol') or '').strip()
    cliente = (request.args.get('cliente') or '').strip()
    fecha_inicio = (request.args.get('fecha_inicio') or '').strip()
    fecha_fin = (request.args.get('fecha_fin') or '').strip()

    if busqueda:
        termino = f'%{busqueda}%'
        ventas_con_producto = db.session.query(DetalleVenta.venta_id).filter(
            DetalleVenta.producto_nombre.ilike(termino)
        )
        query = query.filter(or_(
            Venta.cliente.ilike(termino),
            Venta.usuario_username.ilike(termino),
            Venta.usuario_rol.ilike(termino),
            db.cast(Venta.fecha, db.String).ilike(termino),
            db.cast(Venta.numero_venta, db.String).ilike(termino),
            Venta.id.in_(ventas_con_producto),
        ))

    if fecha:
        query = query.filter(db.cast(Venta.fecha, db.String).ilike(f'%{fecha}%'))
    if usuario:
        query = query.filter(Venta.usuario_username.ilike(f'%{usuario}%'))
    if rol:
        query = query.filter(Venta.usuario_rol == rol)
    if cliente:
        query = query.filter(Venta.cliente.ilike(f'%{cliente}%'))
    if fecha_inicio:
        query = query.filter(Venta.fecha >= datetime.strptime(fecha_inicio, '%Y-%m-%d'))
    if fecha_fin:
        query = query.filter(Venta.fecha < datetime.strptime(fecha_fin, '%Y-%m-%d').replace(hour=23, minute=59, second=59))

    total_ventas, total_dolares, total_bolivares = query.with_entities(
        func.count(Venta.id),
        func.coalesce(func.sum(Venta.total_dolares), 0.0),
        func.coalesce(func.sum(Venta.total_bolivares), 0.0),
    ).first()

    # Calcular el costo total sumando los costos de los productos vendidos en el rango filtrado
    ventas_ids = [v.id for v in query.all()]
    total_costo = 0.0
    if ventas_ids:
        detalles = DetalleVenta.query.filter(DetalleVenta.venta_id.in_(ventas_ids)).all()
        total_costo = sum((d.costo_unitario or 0.0) * (d.cantidad or 0) for d in detalles)

    total_ventas = int(total_ventas or 0)
    total_dolares = float(total_dolares or 0.0)
    total_bolivares = float(total_bolivares or 0.0)
    summary = {
        'total_ventas': total_ventas,
        'total_dolares': round(total_dolares, 2),
        'total_bolivares': round(total_bolivares, 2),
        'total_costo': round(total_costo, 2),
        'promedio_dolares': round((total_dolares / total_ventas) if total_ventas else 0.0, 2),
        'promedio_bolivares': round((total_bolivares / total_ventas) if total_ventas else 0.0, 2),
    }

    query = query.order_by(Venta.fecha.desc())
    if has_pagination_args():
        page, page_size = get_pagination_params()
        paginacion = query.paginate(page=page, per_page=page_size, error_out=False)
        lista_ventas = paginacion.items
    else:
        lista_ventas = query.all()

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
            'numero_venta': v.numero_venta or v.id,
            'fecha': v.fecha.strftime('%d/%m/%Y %H:%M'),
            'cliente_id': v.cliente_id,
            'cliente': v.cliente,
            'usuario_username': v.usuario_username,
            'usuario_rol': v.usuario_rol,
            'tipo_venta': v.tipo_venta or 'contado',
            'total_dolares': v.total_dolares,
            'total_bolivares': v.total_bolivares,
            'descuento_dolares': v.descuento_total,
            'saldo_pendiente_usd': round(v.saldo_pendiente_usd or 0.0, 2),
            'saldo_a_favor_generado_usd': round(v.saldo_a_favor_generado_usd or 0.0, 2),
            'productos': productos_list,
            'pagos': pagos_list,
            'vueltos_entregados': v.vuelto_entregado or [],
            'devoluciones': devoluciones_list,
            'total_devuelto_dolares': round(sum(d.total_reintegrado_dolares for d in devoluciones), 2),
            'total_devuelto_bolivares': round(sum(d.total_reintegrado_bolivares for d in devoluciones), 2),
            'cantidad_items_devueltos': sum(det.get('cantidad', 0) for d in devoluciones_list for det in d['detalles']),
        })

    if has_pagination_args():
        total = paginacion.total if paginacion else len(res)
        response = build_paginated_response(res, total, page, page_size)
        response['summary'] = summary
        return jsonify(response)

    return jsonify(res)


@ventas_bp.route('/<int:id>', methods=['GET'])
@require_roles('admin', 'cajero')
def get_venta_por_id(id):
    v = Venta.query.get_or_404(id)
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
    return jsonify({
        'id': v.id,
        'numero_venta': v.numero_venta or v.id,
        'fecha': v.fecha.strftime('%d/%m/%Y %H:%M') if v.fecha else '-',
        'cliente_id': v.cliente_id,
        'cliente': v.cliente,
        'usuario_username': v.usuario_username,
        'usuario_rol': v.usuario_rol,
        'tipo_venta': v.tipo_venta or 'contado',
        'total_dolares': v.total_dolares,
        'total_bolivares': v.total_bolivares,
        'descuento_dolares': v.descuento_total,
        'saldo_pendiente_usd': round(v.saldo_pendiente_usd or 0.0, 2),
        'saldo_a_favor_generado_usd': round(v.saldo_a_favor_generado_usd or 0.0, 2),
        'productos': productos_list,
        'pagos': pagos_list,
        'vueltos_entregados': v.vuelto_entregado or [],
        'devoluciones': devoluciones_list,
        'total_devuelto_dolares': round(sum(d.total_reintegrado_dolares for d in devoluciones), 2),
        'total_devuelto_bolivares': round(sum(d.total_reintegrado_bolivares for d in devoluciones), 2),
        'cantidad_items_devueltos': sum(det.get('cantidad', 0) for d in devoluciones_list for det in d['detalles']),
    })


@ventas_bp.route('/informe-dia', methods=['GET'])
@require_roles('admin', 'cajero')
def informe_venta_dia():
    """Genera un informe consolidado de ventas para un dia especifico."""
    fecha_str = (request.args.get('fecha') or '').strip()
    if not fecha_str:
        return jsonify({'error': 'Debe indicar una fecha'}), 400

    try:
        fecha_base = datetime.strptime(fecha_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Formato de fecha invalido. Use YYYY-MM-DD'}), 400

    hora_inicio_str = (request.args.get('hora_inicio') or '00:00').strip()
    hora_fin_str = (request.args.get('hora_fin') or '23:59').strip()

    try:
        h_ini, m_ini = map(int, hora_inicio_str.split(':'))
        h_fin, m_fin = map(int, hora_fin_str.split(':'))
    except (ValueError, TypeError):
        return jsonify({'error': 'Formato de hora invalido. Use HH:MM'}), 400

    desde = fecha_base.replace(hour=h_ini, minute=m_ini, second=0)
    hasta = fecha_base.replace(hour=h_fin, minute=m_fin, second=59)

    secciones_str = (request.args.get('secciones') or '').strip()
    secciones = {s.strip() for s in secciones_str.split(',') if s.strip()} if secciones_str else {
        'resumen', 'metodos_pago', 'recibos_caja', 'ventas_detalladas', 'productos_vendidos',
        'cuentas_por_cobrar', 'devoluciones',
    }

    # Consulta base de ventas del dia
    ventas_query = Venta.query.filter(Venta.fecha >= desde, Venta.fecha <= hasta)
    ventas_dia = ventas_query.all()
    ventas_ids = [v.id for v in ventas_dia]

    resultado: dict = {
        'fecha': fecha_base.strftime('%d-%m-%Y'),
        'fecha_iso': fecha_str,
        'hora_inicio': hora_inicio_str,
        'hora_fin': hora_fin_str,
        'total_transacciones': len(ventas_dia),
    }

    # --- Resumen general ---
    if 'resumen' in secciones:
        ventas_brutas_usd = sum(v.total_dolares or 0 for v in ventas_dia)
        ventas_brutas_bs = sum(v.total_bolivares or 0 for v in ventas_dia)
        total_descuentos = sum(v.descuento_total or 0 for v in ventas_dia)

        contado = [v for v in ventas_dia if (v.tipo_venta or 'contado') == 'contado']
        credito = [v for v in ventas_dia if (v.tipo_venta or 'contado') == 'credito']
        total_contado_usd = sum(v.total_dolares or 0 for v in contado)
        total_credito_usd = sum(v.total_dolares or 0 for v in credito)

        # Calcular costos separados por tipo de venta
        total_costo = 0.0
        costo_contado = 0.0
        costo_credito = 0.0
        contado_ids = {v.id for v in contado}
        credito_ids = {v.id for v in credito}

        if ventas_ids:
            detalles_all = DetalleVenta.query.filter(DetalleVenta.venta_id.in_(ventas_ids)).all()
            for d in detalles_all:
                costo_linea = (d.costo_unitario or 0) * (d.cantidad or 0)
                total_costo += costo_linea
                if d.venta_id in contado_ids:
                    costo_contado += costo_linea
                elif d.venta_id in credito_ids:
                    costo_credito += costo_linea

        utilidad_contado = total_contado_usd - costo_contado
        utilidad_credito = total_credito_usd - costo_credito
        utilidad_total = ventas_brutas_usd - total_costo
        margen = round((utilidad_total / ventas_brutas_usd * 100) if ventas_brutas_usd else 0, 2)
        margen_contado = round((utilidad_contado / total_contado_usd * 100) if total_contado_usd else 0, 2)
        margen_credito = round((utilidad_credito / total_credito_usd * 100) if total_credito_usd else 0, 2)

        # Devoluciones del dia
        devs_dia = DevolucionVenta.query.filter(
            DevolucionVenta.venta_id.in_(ventas_ids) if ventas_ids else False,
        ).all() if ventas_ids else []
        total_devuelto_usd = sum(d.total_reintegrado_dolares or 0 for d in devs_dia)

        resultado['resumen'] = {
            'ventas_brutas_usd': round(ventas_brutas_usd, 2),
            'ventas_brutas_bs': round(ventas_brutas_bs, 2),
            'total_contado_usd': round(total_contado_usd, 2),
            'total_credito_usd': round(total_credito_usd, 2),
            'total_descuentos_usd': round(total_descuentos, 2),
            'total_costo': round(total_costo, 2),
            'costo_contado': round(costo_contado, 2),
            'costo_credito': round(costo_credito, 2),
            'utilidad_total': round(utilidad_total, 2),
            'utilidad_contado': round(utilidad_contado, 2),
            'utilidad_credito': round(utilidad_credito, 2),
            'margen_utilidad': margen,
            'margen_contado': margen_contado,
            'margen_credito': margen_credito,
            'total_transacciones': len(ventas_dia),
            'total_devoluciones_usd': round(total_devuelto_usd, 2),
        }

    # --- Metodos de pago ---
    if 'metodos_pago' in secciones and ventas_ids:
        pagos_dia = PagoVenta.query.filter(PagoVenta.venta_id.in_(ventas_ids)).all()
        medios: dict[str, dict] = {}
        for p in pagos_dia:
            clave = p.medio or 'Otro'
            if clave not in medios:
                medios[clave] = {'medio': clave, 'total_usd': 0.0, 'total_moneda': 0.0, 'moneda': p.moneda, 'cantidad_pagos': 0}
            medios[clave]['total_usd'] += p.valor_reconocido_usd or 0
            medios[clave]['total_moneda'] += p.monto or 0
            medios[clave]['cantidad_pagos'] += 1
        resultado['metodos_pago'] = [
            {**v, 'total_usd': round(v['total_usd'], 2), 'total_moneda': round(v['total_moneda'], 2)}
            for v in sorted(medios.values(), key=lambda x: x['total_usd'], reverse=True)
        ]
    elif 'metodos_pago' in secciones:
        resultado['metodos_pago'] = []

    # --- Recibos de caja ---
    if 'recibos_caja' in secciones:
        resultado['recibos_caja'] = [{
            'numero_venta': v.numero_venta or v.id,
            'hora': v.fecha.strftime('%H:%M') if v.fecha else '-',
            'cliente': v.cliente or 'Cliente General',
            'total_usd': round(v.total_dolares or 0, 2),
            'total_bs': round(v.total_bolivares or 0, 2),
            'tipo': v.tipo_venta or 'contado',
            'usuario': v.usuario_username or '-',
        } for v in sorted(ventas_dia, key=lambda x: x.fecha or datetime.min)]

    # --- Ventas detalladas ---
    if 'ventas_detalladas' in secciones:
        detalladas = []
        for v in sorted(ventas_dia, key=lambda x: x.fecha or datetime.min):
            detalles = DetalleVenta.query.filter_by(venta_id=v.id).all()
            pagos = PagoVenta.query.filter_by(venta_id=v.id).all()
            detalladas.append({
                'numero_venta': v.numero_venta or v.id,
                'hora': v.fecha.strftime('%H:%M') if v.fecha else '-',
                'cliente': v.cliente or 'Cliente General',
                'usuario': v.usuario_username or '-',
                'tipo': v.tipo_venta or 'contado',
                'total_usd': round(v.total_dolares or 0, 2),
                'total_bs': round(v.total_bolivares or 0, 2),
                'descuento': round(v.descuento_total or 0, 2),
                'productos': [{
                    'nombre': d.producto_nombre,
                    'cantidad': d.cantidad,
                    'precio_unitario': round(d.precio_unitario, 2),
                    'costo_unitario': round(d.costo_unitario or 0, 2),
                    'subtotal': round(d.subtotal, 2),
                } for d in detalles],
                'pagos': [{
                    'medio': p.medio,
                    'monto': round(p.monto, 2),
                    'moneda': p.moneda,
                    'valor_reconocido_usd': round(p.valor_reconocido_usd, 2),
                } for p in pagos],
            })
        resultado['ventas_detalladas'] = detalladas

    # --- Productos vendidos consolidados ---
    if 'productos_vendidos' in secciones and ventas_ids:
        detalles_todos = DetalleVenta.query.filter(DetalleVenta.venta_id.in_(ventas_ids)).all()
        prods_consolidado: dict[str, dict] = {}
        for d in detalles_todos:
            clave = d.producto_nombre or f'Producto #{d.producto_id}'
            if clave not in prods_consolidado:
                prods_consolidado[clave] = {
                    'producto': clave,
                    'producto_id': d.producto_id,
                    'cantidad_total': 0,
                    'total_usd': 0.0,
                    'costo_total': 0.0,
                }
            prods_consolidado[clave]['cantidad_total'] += d.cantidad or 0
            prods_consolidado[clave]['total_usd'] += d.subtotal or 0
            prods_consolidado[clave]['costo_total'] += (d.costo_unitario or 0) * (d.cantidad or 0)

        resultado['productos_vendidos'] = [
            {**v, 'cantidad_total': round(v['cantidad_total'], 2), 'total_usd': round(v['total_usd'], 2), 'costo_total': round(v['costo_total'], 2)}
            for v in sorted(prods_consolidado.values(), key=lambda x: x['total_usd'], reverse=True)
        ]
    elif 'productos_vendidos' in secciones:
        resultado['productos_vendidos'] = []

    # --- Cuentas por cobrar generadas ---
    if 'cuentas_por_cobrar' in secciones:
        cxc_dia = CuentaPorCobrar.query.filter(
            CuentaPorCobrar.fecha_emision >= desde,
            CuentaPorCobrar.fecha_emision <= hasta,
        ).all()
        resultado['cuentas_por_cobrar'] = [{
            'numero_venta': c.numero_venta or c.venta_id,
            'cliente': c.cliente.nombre if c.cliente else '-',
            'monto_original_usd': round(c.monto_original_usd, 2),
            'saldo_pendiente_usd': round(c.saldo_pendiente_usd, 2),
            'estado': c.estado,
        } for c in cxc_dia]

    # --- Devoluciones del dia ---
    if 'devoluciones' in secciones:
        devs = DevolucionVenta.query.filter(
            DevolucionVenta.fecha >= desde,
            DevolucionVenta.fecha <= hasta,
        ).all()
        resultado['devoluciones'] = [{
            'id': d.id,
            'venta_id': d.venta_id,
            'fecha': d.fecha.strftime('%H:%M') if d.fecha else '-',
            'cliente': d.cliente or '-',
            'motivo': d.motivo or '',
            'total_reintegrado_usd': round(d.total_reintegrado_dolares or 0, 2),
            'total_reintegrado_bs': round(d.total_reintegrado_bolivares or 0, 2),
            'metodo_reintegro': d.metodo_reintegro or '-',
        } for d in devs]

    return jsonify(resultado)
