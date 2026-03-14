from models import MovimientoCuentaCliente


def reconciliar_saldos_a_favor_cliente(cliente_id: int) -> None:
    movimientos_favor = MovimientoCuentaCliente.query.filter(
        MovimientoCuentaCliente.cliente_id == cliente_id,
        MovimientoCuentaCliente.tipo_movimiento == 'saldo_a_favor',
    ).order_by(MovimientoCuentaCliente.fecha.asc(), MovimientoCuentaCliente.id.asc()).all()

    movimientos_aplicacion = MovimientoCuentaCliente.query.filter(
        MovimientoCuentaCliente.cliente_id == cliente_id,
        MovimientoCuentaCliente.tipo_movimiento.in_(['aplicacion_saldo_favor', 'aplicacion_saldo_favor_venta']),
    ).order_by(MovimientoCuentaCliente.fecha.asc(), MovimientoCuentaCliente.id.asc()).all()

    for movimiento in movimientos_favor:
        movimiento.saldo_disponible_usd = round(movimiento.monto_usd or 0.0, 2)

    for movimiento in movimientos_aplicacion:
        restante = round(movimiento.monto_usd or 0.0, 2)
        fuente_asignada = None

        if movimiento.movimiento_referencia_id:
            referencia = next((item for item in movimientos_favor if item.id == movimiento.movimiento_referencia_id), None)
            if referencia and (referencia.saldo_disponible_usd or 0.0) > 0.001:
                consumido = min(round(referencia.saldo_disponible_usd or 0.0, 2), restante)
                referencia.saldo_disponible_usd = round((referencia.saldo_disponible_usd or 0.0) - consumido, 2)
                restante = round(restante - consumido, 2)
                if consumido > 0.001:
                    fuente_asignada = referencia

        if restante > 0.001:
            for fuente in movimientos_favor:
                disponible = round(fuente.saldo_disponible_usd or 0.0, 2)
                if disponible <= 0.001:
                    continue
                consumido = min(disponible, restante)
                fuente.saldo_disponible_usd = round(disponible - consumido, 2)
                restante = round(restante - consumido, 2)
                if consumido > 0.001 and not fuente_asignada:
                    fuente_asignada = fuente
                if restante <= 0.001:
                    break

        movimiento.movimiento_referencia_id = fuente_asignada.id if fuente_asignada else None


def obtener_saldos_a_favor_disponibles(cliente_id: int) -> list[MovimientoCuentaCliente]:
    reconciliar_saldos_a_favor_cliente(cliente_id)
    return MovimientoCuentaCliente.query.filter(
        MovimientoCuentaCliente.cliente_id == cliente_id,
        MovimientoCuentaCliente.tipo_movimiento == 'saldo_a_favor',
        MovimientoCuentaCliente.saldo_disponible_usd > 0.001,
    ).order_by(MovimientoCuentaCliente.fecha.asc(), MovimientoCuentaCliente.id.asc()).all()
