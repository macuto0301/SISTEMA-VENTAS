from database import db
from datetime import datetime, timezone, timedelta
import json

# Zona horaria de Venezuela (UTC-4)
VET = timezone(timedelta(hours=-4))

def ahora_local():
    """Retorna la fecha y hora actual en la zona horaria local (Venezuela UTC-4)."""
    return datetime.now(VET).replace(tzinfo=None)


class Cliente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    documento = db.Column('rif_cedula', db.String(30), unique=True)
    telefono = db.Column(db.String(20))
    email = db.Column(db.String(100))
    direccion = db.Column(db.Text)
    foto_perfil_path = db.Column(db.String(255))
    foto_cedula_path = db.Column(db.String(255))
    activo = db.Column(db.Boolean, default=True)
    saldo_a_favor_usd = db.Column(db.Float, default=0.0)
    limite_credito_usd = db.Column(db.Float, default=0.0)
    limite_documentos = db.Column(db.Integer, default=0)
    dias_credito = db.Column(db.Integer, default=0)
    dias_tolerancia = db.Column(db.Integer, default=0)
    bloqueado_credito = db.Column(db.Boolean, default=False)
    fecha_creado = db.Column(db.DateTime, default=ahora_local)

class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(50), unique=True, nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.String(20), default='producto')
    descripcion = db.Column(db.Text)
    ubicacion = db.Column(db.String(100))
    marca = db.Column(db.String(100))
    modelo = db.Column(db.String(100))
    unidad = db.Column(db.String(50))
    precio_costo = db.Column(db.Float, default=0.0)
    porcentaje_ganancia = db.Column(db.Float, default=30.0)
    precio_dolares = db.Column(db.Float, nullable=False)
    precio_1_dolares = db.Column(db.Float, default=0.0)
    precio_2_dolares = db.Column(db.Float, default=0.0)
    precio_3_dolares = db.Column(db.Float, default=0.0)
    porcentaje_ganancia_1 = db.Column(db.Float, default=30.0)
    porcentaje_ganancia_2 = db.Column(db.Float, default=30.0)
    porcentaje_ganancia_3 = db.Column(db.Float, default=30.0)
    cantidad = db.Column(db.Float, default=0)
    permite_decimal = db.Column(db.Boolean, default=False)
    categoria = db.Column(db.String(50))
    metodo_redondeo = db.Column(db.String(20), default='none')
    almacen = db.Column(db.String(100))
    fecha_creado = db.Column(db.DateTime, default=ahora_local)
    foto_path = db.Column(db.String(255))
    fotos_json = db.Column(db.Text)

    @property
    def fotos(self):
        if self.fotos_json:
            try:
                fotos = json.loads(self.fotos_json)
                if isinstance(fotos, list):
                    return [foto for foto in fotos if isinstance(foto, str) and foto]
            except Exception:
                pass
        return [self.foto_path] if self.foto_path else []

    @fotos.setter
    def fotos(self, value):
        fotos = [foto for foto in (value or []) if isinstance(foto, str) and foto]
        self.fotos_json = json.dumps(fotos)
        self.foto_path = fotos[0] if fotos else None

    @property
    def es_servicio(self):
        return (self.tipo or 'producto').strip().lower() == 'servicio'

    @property
    def maneja_existencia(self):
        return not self.es_servicio

class Proveedor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    rif = db.Column(db.String(20), unique=True, nullable=False)
    telefono = db.Column(db.String(20))
    email = db.Column(db.String(100))
    direccion = db.Column(db.Text)
    activo = db.Column(db.Boolean, default=True)
    fecha_creado = db.Column(db.DateTime, default=ahora_local)

class Compra(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    numero_compra = db.Column(db.Integer, unique=True, index=True)
    fecha = db.Column(db.Date, default=ahora_local)
    nro_factura = db.Column(db.String(50), nullable=True)
    fecha_libro = db.Column(db.Date, nullable=True)
    proveedor_id = db.Column(db.Integer, db.ForeignKey('proveedor.id'), nullable=False)
    total_dolares = db.Column(db.Float, default=0.0)
    total_bs = db.Column(db.Float, default=0.0)
    estado = db.Column(db.String(20), default='pendiente')  # pendiente, pagada, cancelada
    created_at = db.Column(db.DateTime, default=ahora_local)
    proveedor = db.relationship('Proveedor', backref='compras')

class DetalleCompra(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    compra_id = db.Column(db.Integer, db.ForeignKey('compra.id'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'))
    producto_nombre = db.Column(db.String(100), nullable=False)
    cantidad = db.Column(db.Float, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    compra = db.relationship('Compra', backref='detalles')
    producto = db.relationship('Producto')

class HistorialPrecio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'), nullable=False)
    precio_anterior = db.Column(db.Float, nullable=False)
    precio_nuevo = db.Column(db.Float, nullable=False)
    tipo_precio = db.Column(db.String(20), default='precio_1')
    motivo = db.Column(db.String(50), nullable=False)  # compra, ajuste_manual
    fecha_cambio = db.Column(db.DateTime, default=ahora_local)
    producto = db.relationship('Producto', backref='historial_precios')


class MovimientoInventario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'), nullable=False)
    tipo_movimiento = db.Column(db.String(20), nullable=False)  # entrada, salida
    cantidad = db.Column(db.Float, nullable=False)
    stock_anterior = db.Column(db.Float, nullable=False, default=0)
    stock_nuevo = db.Column(db.Float, nullable=False, default=0)
    motivo = db.Column(db.String(100), nullable=False)
    observacion = db.Column(db.Text)
    usuario_username = db.Column(db.String(50))
    fecha = db.Column(db.DateTime, default=ahora_local)
    producto = db.relationship('Producto', backref='movimientos_inventario')

class Venta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    numero_venta = db.Column(db.Integer, unique=True, index=True)
    fecha = db.Column(db.DateTime, default=ahora_local)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'))
    cliente = db.Column(db.String(100), default='Cliente General')
    usuario_username = db.Column(db.String(50))
    usuario_rol = db.Column(db.String(20))
    tipo_venta = db.Column(db.String(20), default='contado')
    total_dolares = db.Column(db.Float, nullable=False) # Total de lista
    total_bolivares = db.Column(db.Float, nullable=False) # Total de lista en Bs
    descuento_total = db.Column(db.Float, default=0.0)
    porcentaje_bono = db.Column(db.Float, default=0.0)
    total_pagado_dolares = db.Column(db.Float, default=0.0)
    total_pagado_bs = db.Column(db.Float, default=0.0)
    saldo_pendiente_usd = db.Column(db.Float, default=0.0)
    saldo_a_favor_generado_usd = db.Column(db.Float, default=0.0)
    vuelto_entregado = db.Column(db.JSON) # Para guardar la lista de vueltos entregados
    cliente_rel = db.relationship('Cliente', backref='ventas')

class PagoVenta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    venta_id = db.Column(db.Integer, db.ForeignKey('venta.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=ahora_local)
    medio = db.Column(db.String(50), nullable=False)
    monto = db.Column(db.Float, nullable=False)
    moneda = db.Column(db.String(10), nullable=False) # USD o BS
    tasa_usada = db.Column(db.Float, default=1.0)
    usuario_username = db.Column(db.String(50))
    valor_reconocido_usd = db.Column(db.Float, nullable=False)
    descuento_aplicado = db.Column(db.Float, default=0.0)

class DetalleVenta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    venta_id = db.Column(db.Integer, db.ForeignKey('venta.id'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'))
    producto_nombre = db.Column(db.String(100), nullable=False)
    cantidad = db.Column(db.Float, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    costo_unitario = db.Column(db.Float, nullable=False, default=0.0)  # Costo del producto al momento de la venta
    subtotal = db.Column(db.Float, nullable=False)
    lista_precio = db.Column(db.Integer, default=1)


class CuentaPorCobrar(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    venta_id = db.Column(db.Integer, db.ForeignKey('venta.id'), nullable=False)
    numero_venta = db.Column(db.Integer, index=True)
    fecha_emision = db.Column(db.DateTime, default=ahora_local)
    fecha_vencimiento = db.Column(db.DateTime)
    monto_original_usd = db.Column(db.Float, nullable=False)
    monto_abonado_usd = db.Column(db.Float, default=0.0)
    saldo_pendiente_usd = db.Column(db.Float, nullable=False)
    estado = db.Column(db.String(20), default='pendiente')
    dias_credito_snapshot = db.Column(db.Integer, default=0)
    dias_tolerancia_snapshot = db.Column(db.Integer, default=0)
    fecha_ultimo_abono = db.Column(db.DateTime)
    fecha_ultima_mora = db.Column(db.DateTime)
    dias_mora = db.Column(db.Integer, default=0)
    estado_riesgo = db.Column(db.String(20), default='pendiente')
    observacion = db.Column(db.Text)
    cliente = db.relationship('Cliente', backref='cuentas_por_cobrar')
    venta = db.relationship('Venta', backref='cuentas_por_cobrar')


class AbonoCuentaPorCobrar(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cuenta_por_cobrar_id = db.Column(db.Integer, db.ForeignKey('cuenta_por_cobrar.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=ahora_local)
    medio = db.Column(db.String(50), nullable=False)
    moneda = db.Column(db.String(10), nullable=False)
    monto = db.Column(db.Float, nullable=False)
    tasa_usada = db.Column(db.Float, default=0.0)
    origen_tasa = db.Column(db.String(20), default='sistema')
    equivalente_usd = db.Column(db.Float, nullable=False)
    usuario_username = db.Column(db.String(50))
    observacion = db.Column(db.Text)
    cuenta_por_cobrar = db.relationship('CuentaPorCobrar', backref='abonos')


class MovimientoCuentaCliente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    venta_id = db.Column(db.Integer, db.ForeignKey('venta.id'))
    cuenta_por_cobrar_id = db.Column(db.Integer, db.ForeignKey('cuenta_por_cobrar.id'))
    abono_id = db.Column(db.Integer, db.ForeignKey('abono_cuenta_por_cobrar.id'))
    movimiento_referencia_id = db.Column(db.Integer, db.ForeignKey('movimiento_cuenta_cliente.id'))
    fecha = db.Column(db.DateTime, default=ahora_local)
    tipo_movimiento = db.Column(db.String(50), nullable=False)
    monto_usd = db.Column(db.Float, nullable=False)
    saldo_disponible_usd = db.Column(db.Float, default=0.0)
    moneda_origen = db.Column(db.String(10), default='USD')
    monto_origen = db.Column(db.Float, default=0.0)
    tasa_usada = db.Column(db.Float, default=0.0)
    medio = db.Column(db.String(50))
    descripcion = db.Column(db.Text)
    usuario_username = db.Column(db.String(50))
    cliente = db.relationship('Cliente', backref='movimientos_cuenta')
    venta = db.relationship('Venta', backref='movimientos_cuenta')
    cuenta_por_cobrar = db.relationship('CuentaPorCobrar', backref='movimientos')
    abono = db.relationship('AbonoCuentaPorCobrar', backref='movimientos')
    movimiento_referencia = db.relationship('MovimientoCuentaCliente', remote_side=[id], backref='aplicaciones_relacionadas')

class DevolucionVenta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    venta_id = db.Column(db.Integer, db.ForeignKey('venta.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=ahora_local)
    cliente = db.Column(db.String(100), default='Cliente General')
    motivo = db.Column(db.Text)
    reintegros_entregados = db.Column(db.JSON)
    metodo_reintegro = db.Column(db.String(50), nullable=False)
    moneda_reintegro = db.Column(db.String(10), nullable=False)
    tasa_reintegro = db.Column(db.Float, default=0.0)
    monto_reintegrado = db.Column(db.Float, nullable=False)
    total_reintegrado_dolares = db.Column(db.Float, nullable=False)
    total_reintegrado_bolivares = db.Column(db.Float, default=0.0)

class DetalleDevolucionVenta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    devolucion_id = db.Column(db.Integer, db.ForeignKey('devolucion_venta.id'), nullable=False)
    detalle_venta_id = db.Column(db.Integer, db.ForeignKey('detalle_venta.id'))
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'))
    producto_nombre = db.Column(db.String(100), nullable=False)
    cantidad = db.Column(db.Float, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    lista_precio = db.Column(db.Integer, default=1)

class Configuracion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(50), unique=True, nullable=False)
    valor = db.Column(db.JSON) # Cambiado a JSON para soportar estructuras complejas

class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False) # En un entorno real debería estar hasheado
    rol = db.Column(db.String(20), nullable=False, default='admin')
