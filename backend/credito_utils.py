from datetime import timedelta

from werkzeug.security import check_password_hash

from models import CuentaPorCobrar, Usuario, ahora_local


ESTADOS_CXC_ABIERTOS = ('pendiente', 'abonada')


def password_matches(stored_password: str | None, provided_password: str | None) -> bool:
    if not stored_password or provided_password is None:
        return False

    if stored_password == provided_password:
        return True

    try:
        return check_password_hash(stored_password, provided_password)
    except (ValueError, TypeError):
        return False


def construir_fecha_vencimiento(fecha_base, dias_credito: int | None):
    dias = max(0, int(dias_credito or 0))
    return fecha_base + timedelta(days=dias)


def calcular_dias_mora(cuenta: CuentaPorCobrar, fecha_referencia=None) -> int:
    fecha_actual = fecha_referencia or ahora_local()
    if not cuenta.fecha_vencimiento or (cuenta.saldo_pendiente_usd or 0.0) <= 0.01:
        return 0

    diferencia = (fecha_actual.date() - cuenta.fecha_vencimiento.date()).days
    return max(0, int(diferencia))


def calcular_estado_riesgo_cuenta(cuenta: CuentaPorCobrar, fecha_referencia=None) -> str:
    if (cuenta.saldo_pendiente_usd or 0.0) <= 0.01 or cuenta.estado == 'pagada':
        return 'al_dia'

    fecha_actual = fecha_referencia or ahora_local()
    if not cuenta.fecha_vencimiento:
        return 'pendiente'

    dias_mora = calcular_dias_mora(cuenta, fecha_actual)
    dias_tolerancia = int(cuenta.dias_tolerancia_snapshot or 0)
    if dias_mora > dias_tolerancia:
        return 'bloqueada'
    if dias_mora > 0:
        return 'vencida'

    dias_para_vencer = (cuenta.fecha_vencimiento.date() - fecha_actual.date()).days
    if dias_para_vencer <= 3:
        return 'por_vencer'
    return 'al_dia'


def actualizar_estado_credito_cuenta(cuenta: CuentaPorCobrar, fecha_referencia=None) -> CuentaPorCobrar:
    cuenta.dias_mora = calcular_dias_mora(cuenta, fecha_referencia)
    cuenta.estado_riesgo = calcular_estado_riesgo_cuenta(cuenta, fecha_referencia)
    return cuenta


def obtener_resumen_credito_cliente(cliente_id: int, fecha_referencia=None) -> dict:
    fecha_actual = fecha_referencia or ahora_local()
    cuentas_abiertas = CuentaPorCobrar.query.filter(
        CuentaPorCobrar.cliente_id == cliente_id,
        CuentaPorCobrar.estado.in_(ESTADOS_CXC_ABIERTOS),
    ).all()

    saldo_por_cobrar = round(sum(c.saldo_pendiente_usd or 0.0 for c in cuentas_abiertas), 2)
    documentos_pendientes = len(cuentas_abiertas)
    cuentas_vencidas = 0
    max_dias_mora = 0
    cuentas_bloqueantes = 0

    for cuenta in cuentas_abiertas:
        dias_mora = calcular_dias_mora(cuenta, fecha_actual)
        if dias_mora > 0:
            cuentas_vencidas += 1
        max_dias_mora = max(max_dias_mora, dias_mora)

        dias_tolerancia = int(cuenta.dias_tolerancia_snapshot or 0)
        if dias_mora > dias_tolerancia:
            cuentas_bloqueantes += 1

    return {
        'saldo_por_cobrar_usd': saldo_por_cobrar,
        'documentos_pendientes': documentos_pendientes,
        'cuentas_vencidas': cuentas_vencidas,
        'cuentas_bloqueantes': cuentas_bloqueantes,
        'max_dias_mora': max_dias_mora,
        'fecha_referencia': fecha_actual,
    }


def validar_credito_cliente(cliente, monto_nuevo_usd: float = 0.0, fecha_referencia=None) -> dict:
    resumen = obtener_resumen_credito_cliente(cliente.id, fecha_referencia)
    razones: list[str] = []

    if bool(getattr(cliente, 'bloqueado_credito', False)):
        razones.append('El cliente tiene bloqueo manual de credito')

    limite_credito = round(float(getattr(cliente, 'limite_credito_usd', 0.0) or 0.0), 2)
    if limite_credito > 0 and resumen['saldo_por_cobrar_usd'] + monto_nuevo_usd > limite_credito + 0.001:
        disponible = max(0.0, limite_credito - resumen['saldo_por_cobrar_usd'])
        razones.append(f'El cliente supera su limite de credito. Disponible: ${disponible:.2f}')

    limite_documentos = int(getattr(cliente, 'limite_documentos', 0) or 0)
    if limite_documentos > 0 and resumen['documentos_pendientes'] + (1 if monto_nuevo_usd > 0.01 else 0) > limite_documentos:
        razones.append(f'El cliente supera el limite de {limite_documentos} documentos pendientes')

    if resumen['cuentas_bloqueantes'] > 0:
        razones.append('El cliente tiene facturas vencidas fuera de tolerancia')

    return {
        'aprobado': len(razones) == 0,
        'razones': razones,
        'resumen': resumen,
        'limite_credito_usd': limite_credito,
        'limite_documentos': limite_documentos,
        'dias_credito': int(getattr(cliente, 'dias_credito', 0) or 0),
        'dias_tolerancia': int(getattr(cliente, 'dias_tolerancia', 0) or 0),
    }


def resolver_supervisor_autorizado(current_user, supervisor_username: str | None, supervisor_password: str | None):
    if current_user and current_user.rol == 'admin':
        return current_user

    username = (supervisor_username or '').strip()
    password = str(supervisor_password or '')
    if not username or not password:
        return None

    supervisor = Usuario.query.filter_by(username=username).first()
    if not supervisor or supervisor.rol != 'admin':
        return None

    if not password_matches(supervisor.password, password):
        return None

    return supervisor
