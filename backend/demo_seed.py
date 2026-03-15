from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash

from database import db
from models import (
    AbonoCuentaPorCobrar,
    Cliente,
    Compra,
    CuentaPorCobrar,
    DetalleCompra,
    DetalleVenta,
    MovimientoCuentaCliente,
    PagoVenta,
    Producto,
    Proveedor,
    Usuario,
    Venta,
)


def ensure_user(username: str, password: str, rol: str) -> Usuario:
    user = Usuario.query.filter_by(username=username).first()
    if not user:
        user = Usuario(username=username, password=generate_password_hash(password), rol=rol)
        db.session.add(user)
        db.session.commit()
        print(f'Usuario inicial creado: {username} / {password}')
        return user

    updated = False
    if user.rol != rol:
        user.rol = rol
        updated = True
    if not user.password:
        user.password = generate_password_hash(password)
        updated = True
    if updated:
        db.session.commit()
    return user


def ensure_default_users(app_mode: str) -> None:
    if app_mode == 'demo':
        ensure_user('demo-admin', '1234', 'admin')
        ensure_user('demo-cajero', '1234', 'cajero')
        return

    ensure_user('admin', '1234', 'admin')
    ensure_user('cajero', '1234', 'cajero')


def ensure_demo_dataset() -> None:
    if Producto.query.filter_by(codigo='DEMO-ACE-001').first():
        return

    demo_admin = ensure_user('demo-admin', '1234', 'admin')
    demo_cajero = ensure_user('demo-cajero', '1234', 'cajero')

    proveedor = Proveedor.query.filter_by(rif='J-DEMO-0001').first()
    if not proveedor:
        proveedor = Proveedor(
            nombre='Proveedor Demo Central',
            rif='J-DEMO-0001',
            telefono='0412-0000001',
            email='demo-proveedor@local.test',
            direccion='Zona Industrial Demo',
            activo=True,
        )
        db.session.add(proveedor)
        db.session.flush()

    cliente_credito = Cliente.query.filter_by(documento='V-DEMO-0001').first()
    if not cliente_credito:
        cliente_credito = Cliente(
            nombre='Cliente Demo Credito',
            documento='V-DEMO-0001',
            telefono='0412-0000002',
            email='cliente-demo@local.test',
            direccion='Av. Principal Demo',
            activo=True,
        )
        db.session.add(cliente_credito)
        db.session.flush()

    cliente_contado = Cliente.query.filter_by(documento='V-DEMO-0002').first()
    if not cliente_contado:
        cliente_contado = Cliente(
            nombre='Cliente Demo Contado',
            documento='V-DEMO-0002',
            telefono='0412-0000003',
            email='contado-demo@local.test',
            direccion='Centro Demo',
            activo=True,
        )
        db.session.add(cliente_contado)
        db.session.flush()

    productos_demo = [
        {
            'codigo': 'DEMO-ACE-001',
            'nombre': 'Aceite 20W50 Demo',
            'descripcion': 'Producto de practica para ventas rapidas',
            'categoria': 'Lubricantes',
            'marca': 'DemoParts',
            'modelo': '20W50',
            'unidad': 'unidad',
            'ubicacion': 'A1',
            'precio_costo': 8.5,
            'precio_1_dolares': 12.0,
            'precio_2_dolares': 11.5,
            'precio_3_dolares': 11.0,
            'cantidad': 18,
        },
        {
            'codigo': 'DEMO-FIL-002',
            'nombre': 'Filtro de Aceite Demo',
            'descripcion': 'Filtro de prueba para compras y ventas',
            'categoria': 'Repuestos',
            'marca': 'DemoParts',
            'modelo': 'FA-100',
            'unidad': 'unidad',
            'ubicacion': 'A2',
            'precio_costo': 4.0,
            'precio_1_dolares': 6.5,
            'precio_2_dolares': 6.2,
            'precio_3_dolares': 6.0,
            'cantidad': 14,
        },
        {
            'codigo': 'DEMO-BUJ-003',
            'nombre': 'Bujia Platinum Demo',
            'descripcion': 'Producto de ejemplo para lista de precios',
            'categoria': 'Repuestos',
            'marca': 'IgniteX',
            'modelo': 'PL-9',
            'unidad': 'unidad',
            'ubicacion': 'B1',
            'precio_costo': 3.5,
            'precio_1_dolares': 5.8,
            'precio_2_dolares': 5.5,
            'precio_3_dolares': 5.2,
            'cantidad': 24,
        },
        {
            'codigo': 'DEMO-BAT-004',
            'nombre': 'Bateria 12V Demo',
            'descripcion': 'Producto demo para ventas a credito',
            'categoria': 'Electricidad',
            'marca': 'PowerDemo',
            'modelo': '12V-55A',
            'unidad': 'unidad',
            'ubicacion': 'C1',
            'precio_costo': 38.0,
            'precio_1_dolares': 52.0,
            'precio_2_dolares': 50.0,
            'precio_3_dolares': 48.0,
            'cantidad': 5,
        },
    ]

    productos_por_codigo: dict[str, Producto] = {}
    for item in productos_demo:
        producto = Producto.query.filter_by(codigo=item['codigo']).first()
        if not producto:
            producto = Producto(codigo=item['codigo'], nombre=item['nombre'], precio_dolares=item['precio_1_dolares'])
            db.session.add(producto)
            db.session.flush()

        producto.descripcion = item['descripcion']
        producto.categoria = item['categoria']
        producto.marca = item['marca']
        producto.modelo = item['modelo']
        producto.unidad = item['unidad']
        producto.ubicacion = item['ubicacion']
        producto.precio_costo = item['precio_costo']
        producto.precio_dolares = item['precio_1_dolares']
        producto.precio_1_dolares = item['precio_1_dolares']
        producto.precio_2_dolares = item['precio_2_dolares']
        producto.precio_3_dolares = item['precio_3_dolares']
        producto.porcentaje_ganancia = 30.0
        producto.porcentaje_ganancia_1 = 30.0
        producto.porcentaje_ganancia_2 = 25.0
        producto.porcentaje_ganancia_3 = 20.0
        producto.cantidad = item['cantidad']
        productos_por_codigo[item['codigo']] = producto

    db.session.flush()

    compra = Compra.query.filter_by(nro_factura='DEMO-COMPRA-001').first()
    if not compra:
        compra = Compra(
            numero_compra=1001,
            fecha=datetime.utcnow().date() - timedelta(days=10),
            nro_factura='DEMO-COMPRA-001',
            fecha_libro=datetime.utcnow().date() - timedelta(days=10),
            proveedor_id=proveedor.id,
            total_dolares=110.0,
            total_bs=0.0,
            estado='pagada',
        )
        db.session.add(compra)
        db.session.flush()

        detalles_compra = [
            ('DEMO-ACE-001', 12, 8.5),
            ('DEMO-FIL-002', 10, 4.0),
            ('DEMO-BAT-004', 1, 38.0),
        ]
        for codigo, cantidad, precio in detalles_compra:
            producto = productos_por_codigo[codigo]
            db.session.add(DetalleCompra(
                compra_id=compra.id,
                producto_id=producto.id,
                producto_nombre=producto.nombre,
                cantidad=cantidad,
                precio_unitario=precio,
                subtotal=round(cantidad * precio, 2),
            ))

    venta_contado = Venta.query.filter_by(usuario_username='demo-cajero', total_dolares=18.5).first()
    if not venta_contado:
        venta_contado = Venta(
            fecha=datetime.utcnow() - timedelta(days=3),
            cliente_id=cliente_contado.id,
            cliente=cliente_contado.nombre,
            usuario_username=demo_cajero.username,
            usuario_rol=demo_cajero.rol,
            tipo_venta='contado',
            total_dolares=18.5,
            total_bolivares=0.0,
            descuento_total=0.0,
            porcentaje_bono=0.0,
            total_pagado_dolares=18.5,
            total_pagado_bs=0.0,
            saldo_pendiente_usd=0.0,
            saldo_a_favor_generado_usd=0.0,
            vuelto_entregado=[],
        )
        db.session.add(venta_contado)
        db.session.flush()
        venta_contado.numero_venta = venta_contado.id
        db.session.add(DetalleVenta(
            venta_id=venta_contado.id,
            producto_id=productos_por_codigo['DEMO-ACE-001'].id,
            producto_nombre=productos_por_codigo['DEMO-ACE-001'].nombre,
            cantidad=1,
            precio_unitario=12.0,
            subtotal=12.0,
            lista_precio=1,
        ))
        db.session.add(DetalleVenta(
            venta_id=venta_contado.id,
            producto_id=productos_por_codigo['DEMO-FIL-002'].id,
            producto_nombre=productos_por_codigo['DEMO-FIL-002'].nombre,
            cantidad=1,
            precio_unitario=6.5,
            subtotal=6.5,
            lista_precio=1,
        ))
        db.session.add(PagoVenta(
            venta_id=venta_contado.id,
            medio='Efectivo USD',
            monto=18.5,
            moneda='USD',
            valor_reconocido_usd=18.5,
            descuento_aplicado=0.0,
        ))

    venta_credito = Venta.query.filter_by(usuario_username='demo-admin', total_dolares=52.0).first()
    if not venta_credito:
        venta_credito = Venta(
            fecha=datetime.utcnow() - timedelta(days=2),
            cliente_id=cliente_credito.id,
            cliente=cliente_credito.nombre,
            usuario_username=demo_admin.username,
            usuario_rol=demo_admin.rol,
            tipo_venta='credito',
            total_dolares=52.0,
            total_bolivares=0.0,
            descuento_total=0.0,
            porcentaje_bono=0.0,
            total_pagado_dolares=12.0,
            total_pagado_bs=0.0,
            saldo_pendiente_usd=40.0,
            saldo_a_favor_generado_usd=0.0,
            vuelto_entregado=[],
        )
        db.session.add(venta_credito)
        db.session.flush()
        venta_credito.numero_venta = venta_credito.id
        db.session.add(DetalleVenta(
            venta_id=venta_credito.id,
            producto_id=productos_por_codigo['DEMO-BAT-004'].id,
            producto_nombre=productos_por_codigo['DEMO-BAT-004'].nombre,
            cantidad=1,
            precio_unitario=52.0,
            subtotal=52.0,
            lista_precio=1,
        ))
        db.session.add(PagoVenta(
            venta_id=venta_credito.id,
            medio='Pago movil',
            monto=12.0,
            moneda='USD',
            valor_reconocido_usd=12.0,
            descuento_aplicado=0.0,
        ))

        cuenta = CuentaPorCobrar(
            cliente_id=cliente_credito.id,
            venta_id=venta_credito.id,
            numero_venta=venta_credito.numero_venta,
            fecha_emision=venta_credito.fecha,
            fecha_vencimiento=datetime.utcnow() + timedelta(days=15),
            monto_original_usd=40.0,
            monto_abonado_usd=15.0,
            saldo_pendiente_usd=25.0,
            estado='abonada',
            observacion='Cuenta por cobrar de practica creada automaticamente',
        )
        db.session.add(cuenta)
        db.session.flush()

        db.session.add(MovimientoCuentaCliente(
            cliente_id=cliente_credito.id,
            venta_id=venta_credito.id,
            cuenta_por_cobrar_id=cuenta.id,
            fecha=venta_credito.fecha,
            tipo_movimiento='cargo_venta_credito',
            monto_usd=40.0,
            saldo_disponible_usd=0.0,
            moneda_origen='USD',
            monto_origen=40.0,
            tasa_usada=1.0,
            medio='Credito',
            descripcion=f'Saldo pendiente generado por la venta #{venta_credito.numero_venta}',
            usuario_username=demo_admin.username,
        ))

        abono = AbonoCuentaPorCobrar(
            cuenta_por_cobrar_id=cuenta.id,
            fecha=datetime.utcnow() - timedelta(days=1),
            medio='Efectivo USD',
            moneda='USD',
            monto=15.0,
            tasa_usada=1.0,
            origen_tasa='manual',
            equivalente_usd=15.0,
            usuario_username=demo_cajero.username,
            observacion='Abono demo para practicar seguimiento de cuentas',
        )
        db.session.add(abono)
        db.session.flush()

        db.session.add(MovimientoCuentaCliente(
            cliente_id=cliente_credito.id,
            venta_id=venta_credito.id,
            cuenta_por_cobrar_id=cuenta.id,
            abono_id=abono.id,
            fecha=abono.fecha,
            tipo_movimiento='abono_cliente',
            monto_usd=15.0,
            saldo_disponible_usd=0.0,
            moneda_origen='USD',
            monto_origen=15.0,
            tasa_usada=1.0,
            medio='Efectivo USD',
            descripcion='Abono demo registrado automaticamente',
            usuario_username=demo_cajero.username,
        ))

    db.session.commit()
    print('Base demo inicial preparada con usuarios y datos de practica')
