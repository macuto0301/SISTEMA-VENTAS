from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from auth_utils import get_current_user, require_roles
from cuenta_corriente_utils import obtener_saldos_a_favor_disponibles
from database import db
from models import AbonoCuentaPorCobrar, Cliente, CuentaPorCobrar, MovimientoCuentaCliente, ahora_local
from pagination import build_paginated_response, get_pagination_params, has_pagination_args


cuentas_por_cobrar_bp = Blueprint('cuentas_por_cobrar', __name__)
VENTANA_ABONO_DUPLICADO_SEGUNDOS = 8


def serializar_abono(abono: AbonoCuentaPorCobrar) -> dict:
    return {
        'id': abono.id,
        'fecha': abono.fecha.strftime('%d/%m/%Y %H:%M') if abono.fecha else '',
        'medio': abono.medio,
        'moneda': abono.moneda,
        'monto': round(abono.monto or 0.0, 2),
        'tasa_usada': round(abono.tasa_usada or 0.0, 4),
        'origen_tasa': abono.origen_tasa or 'sistema',
        'equivalente_usd': round(abono.equivalente_usd or 0.0, 2),
        'usuario_username': abono.usuario_username or '',
        'observacion': abono.observacion or '',
    }


def serializar_cuenta(cuenta: CuentaPorCobrar) -> dict:
    cliente = cuenta.cliente
    return {
        'id': cuenta.id,
        'cliente_id': cuenta.cliente_id,
        'cliente_nombre': cliente.nombre if cliente else '',
        'venta_id': cuenta.venta_id,
        'numero_venta': cuenta.numero_venta,
        'fecha_emision': cuenta.fecha_emision.strftime('%d/%m/%Y %H:%M') if cuenta.fecha_emision else '',
        'fecha_vencimiento': cuenta.fecha_vencimiento.strftime('%d/%m/%Y') if cuenta.fecha_vencimiento else '',
        'monto_original_usd': round(cuenta.monto_original_usd or 0.0, 2),
        'monto_abonado_usd': round(cuenta.monto_abonado_usd or 0.0, 2),
        'saldo_pendiente_usd': round(cuenta.saldo_pendiente_usd or 0.0, 2),
        'estado': cuenta.estado,
        'observacion': cuenta.observacion or '',
        'abonos': [serializar_abono(abono) for abono in cuenta.abonos],
    }


def buscar_abono_duplicado_reciente(
    cuenta_id: int,
    medio: str,
    moneda: str,
    monto: float,
    equivalente_usd: float,
    usuario_username: str | None,
) -> AbonoCuentaPorCobrar | None:
    limite = ahora_local() - timedelta(seconds=VENTANA_ABONO_DUPLICADO_SEGUNDOS)
    query = AbonoCuentaPorCobrar.query.filter(
        AbonoCuentaPorCobrar.cuenta_por_cobrar_id == cuenta_id,
        AbonoCuentaPorCobrar.fecha >= limite,
        AbonoCuentaPorCobrar.medio == medio,
        AbonoCuentaPorCobrar.moneda == moneda,
        AbonoCuentaPorCobrar.monto == monto,
        AbonoCuentaPorCobrar.equivalente_usd == equivalente_usd,
    )
    if usuario_username:
        query = query.filter(AbonoCuentaPorCobrar.usuario_username == usuario_username)
    return query.order_by(AbonoCuentaPorCobrar.id.desc()).first()


@cuentas_por_cobrar_bp.route('/', methods=['GET'])
def get_cuentas_por_cobrar():
    query = CuentaPorCobrar.query.join(Cliente, CuentaPorCobrar.cliente_id == Cliente.id)
    page = 1
    page_size = 20
    paginacion = None

    busqueda = (request.args.get('q') or '').strip()
    cliente = (request.args.get('cliente') or '').strip()
    estado = (request.args.get('estado') or '').strip()

    if busqueda:
        termino = f'%{busqueda}%'
        query = query.filter(or_(
            Cliente.nombre.ilike(termino),
            Cliente.documento.ilike(termino),
            db.cast(CuentaPorCobrar.numero_venta, db.String).ilike(termino),
            db.cast(CuentaPorCobrar.venta_id, db.String).ilike(termino),
        ))

    if cliente:
        query = query.filter(Cliente.nombre.ilike(f'%{cliente}%'))
    if estado:
        query = query.filter(CuentaPorCobrar.estado == estado)

    query = query.order_by(CuentaPorCobrar.fecha_emision.desc())
    if has_pagination_args():
        page, page_size = get_pagination_params()
        paginacion = query.paginate(page=page, per_page=page_size, error_out=False)
        cuentas = paginacion.items
    else:
        cuentas = query.all()

    items = [serializar_cuenta(cuenta) for cuenta in cuentas]
    if has_pagination_args():
        total = paginacion.total if paginacion else len(items)
        return jsonify(build_paginated_response(items, total, page, page_size))

    return jsonify(items)


@cuentas_por_cobrar_bp.route('/<int:cuenta_id>', methods=['GET'])
def get_cuenta_por_cobrar(cuenta_id: int):
    cuenta = CuentaPorCobrar.query.get_or_404(cuenta_id)
    return jsonify(serializar_cuenta(cuenta))


@cuentas_por_cobrar_bp.route('/<int:cuenta_id>/abonos', methods=['POST'])
@require_roles('admin', 'cajero')
def registrar_abono(cuenta_id: int):
    cuenta = CuentaPorCobrar.query.get_or_404(cuenta_id)
    data = request.get_json() or {}
    current_user = get_current_user()

    moneda = (data.get('moneda') or 'USD').upper()
    medio = (data.get('medio') or '').strip()
    origen_tasa = (data.get('origen_tasa') or 'sistema').strip() or 'sistema'
    monto = round(float(data.get('monto') or 0), 2)
    tasa_usada = float(data.get('tasa_usada') or 0)
    equivalente_usd = round(float(data.get('equivalente_usd') or 0), 2)
    usar_saldo_a_favor = bool(data.get('usar_saldo_a_favor'))

    if cuenta.estado == 'pagada':
        return jsonify({'error': 'La cuenta ya esta pagada'}), 400

    if usar_saldo_a_favor:
        cliente = cuenta.cliente
        monto_saldo = round(float(data.get('monto_saldo_a_favor_usd') or 0), 2)
        if monto_saldo <= 0:
            return jsonify({'error': 'Debe indicar un monto de saldo a favor valido'}), 400
        if monto_saldo > round(cliente.saldo_a_favor_usd or 0.0, 2) + 0.001:
            return jsonify({'error': 'El cliente no tiene suficiente saldo a favor'}), 400
        if monto_saldo > round(cuenta.saldo_pendiente_usd or 0.0, 2) + 0.001:
            return jsonify({'error': 'El saldo a favor supera la deuda pendiente'}), 400

        try:
            cliente.saldo_a_favor_usd = round((cliente.saldo_a_favor_usd or 0.0) - monto_saldo, 2)
            cuenta.monto_abonado_usd = round((cuenta.monto_abonado_usd or 0.0) + monto_saldo, 2)
            cuenta.saldo_pendiente_usd = round(max(0.0, (cuenta.saldo_pendiente_usd or 0.0) - monto_saldo), 2)
            cuenta.estado = 'pagada' if cuenta.saldo_pendiente_usd <= 0.01 else 'abonada'

            restante_por_aplicar = monto_saldo
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
                numero_venta_destino = cuenta.numero_venta or cuenta.venta_id

                movimiento = MovimientoCuentaCliente(
                    cliente_id=cliente.id,
                    venta_id=cuenta.venta_id,
                    cuenta_por_cobrar_id=cuenta.id,
                    movimiento_referencia_id=fuente.id,
                    tipo_movimiento='aplicacion_saldo_favor',
                    monto_usd=monto_desde_fuente,
                    saldo_disponible_usd=0.0,
                    moneda_origen='USD',
                    monto_origen=monto_desde_fuente,
                    tasa_usada=1.0,
                    medio='Saldo a favor',
                    descripcion=data.get('observacion') or f'Aplicacion de saldo a favor originado en la venta #{numero_venta_origen} a la factura #{numero_venta_destino}',
                    usuario_username=current_user.username if current_user else None,
                )
                db.session.add(movimiento)
                restante_por_aplicar = round(restante_por_aplicar - monto_desde_fuente, 2)

            if restante_por_aplicar > 0.001:
                db.session.rollback()
                return jsonify({'error': 'No se pudo rastrear la factura origen del saldo a favor aplicado'}), 400

            db.session.commit()
            return jsonify({'mensaje': 'Saldo a favor aplicado', 'cuenta': serializar_cuenta(cuenta)})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400

    if not medio:
        return jsonify({'error': 'El medio de pago es obligatorio'}), 400
    if moneda not in ('USD', 'BS'):
        return jsonify({'error': 'La moneda del abono es invalida'}), 400
    if monto <= 0:
        return jsonify({'error': 'El monto del abono debe ser mayor a cero'}), 400

    usuario_username = current_user.username if current_user else None

    if moneda == 'USD':
        tasa_usada = 1.0
        equivalente_usd = monto
    else:
        if tasa_usada <= 0:
            return jsonify({'error': 'La tasa usada debe ser mayor a cero'}), 400
        if equivalente_usd <= 0:
            equivalente_usd = round(monto / tasa_usada, 2)

    try:
        abono_duplicado = buscar_abono_duplicado_reciente(
            cuenta_id=cuenta.id,
            medio=medio,
            moneda=moneda,
            monto=monto,
            equivalente_usd=equivalente_usd,
            usuario_username=usuario_username,
        )
        if abono_duplicado:
            return jsonify({'error': 'Ya se registro un abono igual hace unos segundos. Verifique antes de reintentar.'}), 409

        abono_aplicable = min(round(cuenta.saldo_pendiente_usd or 0.0, 2), equivalente_usd)
        excedente = round(max(0.0, equivalente_usd - abono_aplicable), 2)

        abono = AbonoCuentaPorCobrar(
            cuenta_por_cobrar_id=cuenta.id,
            medio=medio,
            moneda=moneda,
            monto=monto,
            tasa_usada=tasa_usada,
            origen_tasa=origen_tasa,
            equivalente_usd=equivalente_usd,
            usuario_username=usuario_username,
            observacion=(data.get('observacion') or '').strip() or None,
        )
        db.session.add(abono)
        db.session.flush()

        cuenta.monto_abonado_usd = round((cuenta.monto_abonado_usd or 0.0) + abono_aplicable, 2)
        cuenta.saldo_pendiente_usd = round(max(0.0, (cuenta.saldo_pendiente_usd or 0.0) - abono_aplicable), 2)
        cuenta.estado = 'pagada' if cuenta.saldo_pendiente_usd <= 0.01 else 'abonada'

        movimiento_abono = MovimientoCuentaCliente(
            cliente_id=cuenta.cliente_id,
            venta_id=cuenta.venta_id,
            cuenta_por_cobrar_id=cuenta.id,
            abono_id=abono.id,
            tipo_movimiento='abono_cliente',
            monto_usd=abono_aplicable,
            moneda_origen=moneda,
            monto_origen=monto,
            tasa_usada=tasa_usada,
            medio=medio,
            descripcion=(data.get('observacion') or '').strip() or 'Abono registrado a cuenta por cobrar',
            usuario_username=usuario_username,
        )
        db.session.add(movimiento_abono)

        if excedente > 0.001:
            cuenta.cliente.saldo_a_favor_usd = round((cuenta.cliente.saldo_a_favor_usd or 0.0) + excedente, 2)
            movimiento_favor = MovimientoCuentaCliente(
                cliente_id=cuenta.cliente_id,
                venta_id=cuenta.venta_id,
                cuenta_por_cobrar_id=cuenta.id,
                abono_id=abono.id,
                tipo_movimiento='saldo_a_favor',
                monto_usd=excedente,
                saldo_disponible_usd=excedente,
                moneda_origen=moneda,
                monto_origen=round(excedente if moneda == 'USD' else excedente * tasa_usada, 2),
                tasa_usada=tasa_usada,
                medio=medio,
                descripcion='Excedente generado al abonar una cuenta por cobrar',
                usuario_username=usuario_username,
            )
            db.session.add(movimiento_favor)

        db.session.commit()
        return jsonify({
            'mensaje': 'Abono registrado con exito',
            'cuenta': serializar_cuenta(cuenta),
            'excedente_convertido_a_favor_usd': excedente,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
