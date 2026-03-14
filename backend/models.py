from database import db
from datetime import datetime

class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(50), unique=True, nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text)
    precio_costo = db.Column(db.Float, default=0.0)
    porcentaje_ganancia = db.Column(db.Float, default=30.0)
    precio_dolares = db.Column(db.Float, nullable=False)
    cantidad = db.Column(db.Integer, default=0)
    categoria = db.Column(db.String(50))
    metodo_redondeo = db.Column(db.String(20), default='none')

class Proveedor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    rif = db.Column(db.String(20), unique=True, nullable=False)
    telefono = db.Column(db.String(20))
    email = db.Column(db.String(100))
    direccion = db.Column(db.Text)
    activo = db.Column(db.Boolean, default=True)
    fecha_creado = db.Column(db.DateTime, default=datetime.utcnow)

class Compra(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, default=datetime.utcnow)
    nro_factura = db.Column(db.String(50), nullable=True)
    fecha_libro = db.Column(db.Date, nullable=True)
    proveedor_id = db.Column(db.Integer, db.ForeignKey('proveedor.id'), nullable=False)
    total_dolares = db.Column(db.Float, default=0.0)
    total_bs = db.Column(db.Float, default=0.0)
    estado = db.Column(db.String(20), default='pendiente')  # pendiente, pagada, cancelada
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    proveedor = db.relationship('Proveedor', backref='compras')

class DetalleCompra(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    compra_id = db.Column(db.Integer, db.ForeignKey('compra.id'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'))
    producto_nombre = db.Column(db.String(100), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    compra = db.relationship('Compra', backref='detalles')
    producto = db.relationship('Producto')

class HistorialPrecio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'), nullable=False)
    precio_anterior = db.Column(db.Float, nullable=False)
    precio_nuevo = db.Column(db.Float, nullable=False)
    motivo = db.Column(db.String(50), nullable=False)  # compra, ajuste_manual
    fecha_cambio = db.Column(db.DateTime, default=datetime.utcnow)
    producto = db.relationship('Producto', backref='historial_precios')

class Venta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    cliente = db.Column(db.String(100), default='Cliente General')
    usuario_username = db.Column(db.String(50))
    usuario_rol = db.Column(db.String(20))
    total_dolares = db.Column(db.Float, nullable=False) # Total de lista
    total_bolivares = db.Column(db.Float, nullable=False) # Total de lista en Bs
    descuento_total = db.Column(db.Float, default=0.0)
    porcentaje_bono = db.Column(db.Float, default=0.0)
    total_pagado_dolares = db.Column(db.Float, default=0.0)
    total_pagado_bs = db.Column(db.Float, default=0.0)
    vuelto_entregado = db.Column(db.JSON) # Para guardar la lista de vueltos entregados

class PagoVenta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    venta_id = db.Column(db.Integer, db.ForeignKey('venta.id'), nullable=False)
    medio = db.Column(db.String(50), nullable=False)
    monto = db.Column(db.Float, nullable=False)
    moneda = db.Column(db.String(10), nullable=False) # USD o BS
    valor_reconocido_usd = db.Column(db.Float, nullable=False)
    descuento_aplicado = db.Column(db.Float, default=0.0)

class DetalleVenta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    venta_id = db.Column(db.Integer, db.ForeignKey('venta.id'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'))
    producto_nombre = db.Column(db.String(100), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)

class DevolucionVenta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    venta_id = db.Column(db.Integer, db.ForeignKey('venta.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
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
    cantidad = db.Column(db.Integer, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)

class Configuracion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(50), unique=True, nullable=False)
    valor = db.Column(db.JSON) # Cambiado a JSON para soportar estructuras complejas

class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False) # En un entorno real debería estar hasheado
    rol = db.Column(db.String(20), nullable=False, default='admin')
