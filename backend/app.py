import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from database import db
from demo_seed import ensure_default_users, ensure_demo_dataset
from runtime_config import apply_runtime_env, get_app_mode

apply_runtime_env()

# Ruta del frontend
FRONTEND_PATH = os.path.join(os.path.dirname(__file__), '..', 'frontend')
BACKEND_PATH = os.path.dirname(__file__)
UPLOADS_PATH = os.path.join(BACKEND_PATH, 'uploads')
PRODUCTOS_UPLOADS_PATH = os.path.join(UPLOADS_PATH, 'productos')
CLIENTES_UPLOADS_PATH = os.path.join(UPLOADS_PATH, 'clientes')

DEFAULT_CORS_ORIGINS = [
    'null',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]


def parse_env_list(env_name: str, default_items: list[str]) -> list[str]:
    env_value = os.getenv(env_name, '')
    env_items = [item.strip() for item in env_value.split(',') if item.strip()]

    merged_items = default_items + env_items
    unique_items = []

    for item in merged_items:
        if item not in unique_items:
            unique_items.append(item)

    return unique_items

def create_app():
    app = Flask(__name__)
    app_mode = get_app_mode()
    app.config['UPLOAD_FOLDER'] = UPLOADS_PATH
    app.config['PRODUCTOS_UPLOAD_FOLDER'] = PRODUCTOS_UPLOADS_PATH
    app.config['CLIENTES_UPLOAD_FOLDER'] = CLIENTES_UPLOADS_PATH
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
    app.config['APP_MODE'] = app_mode
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY') or os.getenv('SECRET_KEY') or 'dev-change-this-jwt-secret'
    app.config['JWT_ACCESS_TOKEN_EXPIRES_MINUTES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', '480'))
    os.makedirs(app.config['PRODUCTOS_UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['CLIENTES_UPLOAD_FOLDER'], exist_ok=True)
    
    # Servir archivos estáticos del frontend
    @app.route('/')
    def serve_frontend():
        return send_from_directory(FRONTEND_PATH, 'index.html')

    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
    @app.route('/<path:filename>')
    def serve_static(filename):
        return send_from_directory(FRONTEND_PATH, filename)
    
    cors_origins = parse_env_list('CORS_ORIGINS', DEFAULT_CORS_ORIGINS)
    cors_methods = parse_env_list(
        'CORS_METHODS',
        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    )
    cors_headers = parse_env_list(
        'CORS_ALLOW_HEADERS',
        ['Content-Type', 'Authorization']
    )

    CORS(app, resources={
        r"/api/*": {
            "origins": cors_origins,
            "methods": cors_methods,
            "allow_headers": cors_headers
        }
    })

    # Configuración de la base de datos (PostgreSQL vía .env)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    # Registro de Blueprints
    from routes.productos import productos_bp
    from routes.ventas import ventas_bp
    from routes.config import config_bp
    from routes.auth import auth_bp
    from routes.clientes import clientes_bp
    from routes.proveedores import proveedores_bp
    from routes.compras import compras_bp
    from routes.cuentas_por_cobrar import cuentas_por_cobrar_bp

    app.register_blueprint(productos_bp, url_prefix='/api/productos')
    app.register_blueprint(ventas_bp, url_prefix='/api/ventas')
    app.register_blueprint(config_bp, url_prefix='/api/config')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(clientes_bp, url_prefix='/api/clientes')
    app.register_blueprint(proveedores_bp, url_prefix='/api/proveedores')
    app.register_blueprint(compras_bp, url_prefix='/api/compras')
    app.register_blueprint(cuentas_por_cobrar_bp, url_prefix='/api/cuentas-por-cobrar')

    with app.app_context():
        db.create_all()
        
        try:
            from sqlalchemy import text
            
            # Verificar columnas en tabla compra
            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='compra'"))
            columnas_compra = [row[0] for row in result.fetchall()]
            print(f"Columnas en compra: {columnas_compra}")
            
            if 'estado' not in columnas_compra:
                db.session.execute(text("ALTER TABLE compra ADD COLUMN estado VARCHAR(20) DEFAULT 'pendiente'"))
                db.session.commit()
                print("Columna estado agregada a tabla compra")
            
            if 'total_bs' not in columnas_compra:
                db.session.execute(text("ALTER TABLE compra ADD COLUMN total_bs FLOAT DEFAULT 0.0"))
                db.session.commit()
                print("Columna total_bs agregada a tabla compra")
            
            if 'nro_factura' not in columnas_compra:
                db.session.execute(text("ALTER TABLE compra ADD COLUMN nro_factura VARCHAR(50)"))
                db.session.commit()
                print("Columna nro_factura agregada a tabla compra")
            
            if 'fecha_libro' not in columnas_compra:
                db.session.execute(text("ALTER TABLE compra ADD COLUMN fecha_libro DATE"))
                db.session.commit()
                print("Columna fecha_libro agregada a tabla compra")
            
            if 'created_at' not in columnas_compra:
                db.session.execute(text("ALTER TABLE compra ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                db.session.commit()
                print("Columna created_at agregada a tabla compra")

            if 'numero_compra' not in columnas_compra:
                db.session.execute(text("ALTER TABLE compra ADD COLUMN numero_compra INTEGER"))
                db.session.commit()
                print("Columna numero_compra agregada a tabla compra")

            db.session.execute(text("UPDATE compra SET numero_compra = id WHERE numero_compra IS NULL"))
            db.session.commit()

            result = db.session.execute(text("SELECT 1 FROM pg_indexes WHERE tablename='compra' AND indexname='ix_compra_numero_compra'"))
            tiene_indice_numero_compra = result.scalar() is not None
            if not tiene_indice_numero_compra:
                db.session.execute(text("CREATE UNIQUE INDEX ix_compra_numero_compra ON compra (numero_compra)"))
                db.session.commit()
                print("Indice unico ix_compra_numero_compra creado")

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='venta'"))
            columnas_venta = [row[0] for row in result.fetchall()]
            print(f"Columnas en venta: {columnas_venta}")

            if 'usuario_username' not in columnas_venta:
                db.session.execute(text("ALTER TABLE venta ADD COLUMN usuario_username VARCHAR(50)"))
                db.session.commit()
                print("Columna usuario_username agregada a tabla venta")

            if 'usuario_rol' not in columnas_venta:
                db.session.execute(text("ALTER TABLE venta ADD COLUMN usuario_rol VARCHAR(20)"))
                db.session.commit()
                print("Columna usuario_rol agregada a tabla venta")

            if 'numero_venta' not in columnas_venta:
                db.session.execute(text("ALTER TABLE venta ADD COLUMN numero_venta INTEGER"))
                db.session.commit()
                print("Columna numero_venta agregada a tabla venta")

            if 'cliente_id' not in columnas_venta:
                db.session.execute(text("ALTER TABLE venta ADD COLUMN cliente_id INTEGER"))
                db.session.commit()
                print("Columna cliente_id agregada a tabla venta")

            if 'tipo_venta' not in columnas_venta:
                db.session.execute(text("ALTER TABLE venta ADD COLUMN tipo_venta VARCHAR(20) DEFAULT 'contado'"))
                db.session.commit()
                print("Columna tipo_venta agregada a tabla venta")

            if 'saldo_pendiente_usd' not in columnas_venta:
                db.session.execute(text("ALTER TABLE venta ADD COLUMN saldo_pendiente_usd FLOAT DEFAULT 0.0"))
                db.session.commit()
                print("Columna saldo_pendiente_usd agregada a tabla venta")

            if 'saldo_a_favor_generado_usd' not in columnas_venta:
                db.session.execute(text("ALTER TABLE venta ADD COLUMN saldo_a_favor_generado_usd FLOAT DEFAULT 0.0"))
                db.session.commit()
                print("Columna saldo_a_favor_generado_usd agregada a tabla venta")

            db.session.execute(text("UPDATE venta SET numero_venta = id WHERE numero_venta IS NULL"))
            db.session.commit()

            result = db.session.execute(text("SELECT 1 FROM pg_indexes WHERE tablename='venta' AND indexname='ix_venta_numero_venta'"))
            tiene_indice_numero_venta = result.scalar() is not None
            if not tiene_indice_numero_venta:
                db.session.execute(text("CREATE UNIQUE INDEX ix_venta_numero_venta ON venta (numero_venta)"))
                db.session.commit()
                print("Indice unico ix_venta_numero_venta creado")
            
            # Verificar columnas en tabla proveedor
            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='proveedor'"))
            columnas_proveedor = [row[0] for row in result.fetchall()]
            print(f"Columnas en proveedor: {columnas_proveedor}")

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='producto'"))
            columnas_producto = [row[0] for row in result.fetchall()]
            print(f"Columnas en producto: {columnas_producto}")

            if columnas_producto and 'foto_path' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN foto_path VARCHAR(255)"))
                db.session.commit()
                print("Columna foto_path agregada a tabla producto")

            if columnas_producto and 'fotos_json' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN fotos_json TEXT"))
                db.session.commit()
                print("Columna fotos_json agregada a tabla producto")

            if columnas_producto and 'precio_1_dolares' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN precio_1_dolares FLOAT DEFAULT 0.0"))
                db.session.commit()
                print("Columna precio_1_dolares agregada a tabla producto")

            if columnas_producto and 'precio_2_dolares' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN precio_2_dolares FLOAT DEFAULT 0.0"))
                db.session.commit()
                print("Columna precio_2_dolares agregada a tabla producto")

            if columnas_producto and 'precio_3_dolares' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN precio_3_dolares FLOAT DEFAULT 0.0"))
                db.session.commit()
                print("Columna precio_3_dolares agregada a tabla producto")

            if columnas_producto and 'porcentaje_ganancia_1' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN porcentaje_ganancia_1 FLOAT DEFAULT 30.0"))
                db.session.commit()
                print("Columna porcentaje_ganancia_1 agregada a tabla producto")

            if columnas_producto and 'porcentaje_ganancia_2' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN porcentaje_ganancia_2 FLOAT DEFAULT 30.0"))
                db.session.commit()
                print("Columna porcentaje_ganancia_2 agregada a tabla producto")

            if columnas_producto and 'porcentaje_ganancia_3' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN porcentaje_ganancia_3 FLOAT DEFAULT 30.0"))
                db.session.commit()
                print("Columna porcentaje_ganancia_3 agregada a tabla producto")

            if columnas_producto and 'ubicacion' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN ubicacion VARCHAR(100)"))
                db.session.commit()
                print("Columna ubicacion agregada a tabla producto")

            if columnas_producto and 'marca' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN marca VARCHAR(100)"))
                db.session.commit()
                print("Columna marca agregada a tabla producto")

            if columnas_producto and 'modelo' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN modelo VARCHAR(100)"))
                db.session.commit()
                print("Columna modelo agregada a tabla producto")

            if columnas_producto and 'unidad' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN unidad VARCHAR(50)"))
                db.session.commit()
                print("Columna unidad agregada a tabla producto")

            if columnas_producto and 'tipo' not in columnas_producto:
                db.session.execute(text("ALTER TABLE producto ADD COLUMN tipo VARCHAR(20) DEFAULT 'producto'"))
                db.session.commit()
                print("Columna tipo agregada a tabla producto")

            if columnas_producto:
                db.session.execute(text("UPDATE producto SET fotos_json = CONCAT('[\"', foto_path, '\"]') WHERE foto_path IS NOT NULL AND foto_path <> '' AND (fotos_json IS NULL OR fotos_json = '')"))
                db.session.execute(text("UPDATE producto SET precio_1_dolares = precio_dolares WHERE precio_1_dolares IS NULL OR precio_1_dolares = 0"))
                db.session.execute(text("UPDATE producto SET precio_2_dolares = precio_dolares WHERE precio_2_dolares IS NULL OR precio_2_dolares = 0"))
                db.session.execute(text("UPDATE producto SET precio_3_dolares = precio_dolares WHERE precio_3_dolares IS NULL OR precio_3_dolares = 0"))
                db.session.execute(text("UPDATE producto SET porcentaje_ganancia_1 = porcentaje_ganancia WHERE porcentaje_ganancia_1 IS NULL OR porcentaje_ganancia_1 = 0"))
                db.session.execute(text("UPDATE producto SET porcentaje_ganancia_2 = porcentaje_ganancia WHERE porcentaje_ganancia_2 IS NULL OR porcentaje_ganancia_2 = 0"))
                db.session.execute(text("UPDATE producto SET porcentaje_ganancia_3 = porcentaje_ganancia WHERE porcentaje_ganancia_3 IS NULL OR porcentaje_ganancia_3 = 0"))
                db.session.execute(text("UPDATE producto SET precio_dolares = precio_1_dolares WHERE precio_dolares IS NULL OR precio_dolares = 0"))
                db.session.execute(text("UPDATE producto SET porcentaje_ganancia = porcentaje_ganancia_1 WHERE porcentaje_ganancia IS NULL OR porcentaje_ganancia = 0"))
                db.session.execute(text("UPDATE producto SET tipo = 'producto' WHERE tipo IS NULL OR TRIM(tipo) = ''"))
                db.session.commit()

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='historial_precio'"))
            columnas_historial_precio = [row[0] for row in result.fetchall()]
            print(f"Columnas en historial_precio: {columnas_historial_precio}")

            if columnas_historial_precio and 'tipo_precio' not in columnas_historial_precio:
                db.session.execute(text("ALTER TABLE historial_precio ADD COLUMN tipo_precio VARCHAR(20) DEFAULT 'precio_1'"))
                db.session.commit()
                print("Columna tipo_precio agregada a tabla historial_precio")

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='detalle_venta'"))
            columnas_detalle_venta = [row[0] for row in result.fetchall()]
            print(f"Columnas en detalle_venta: {columnas_detalle_venta}")

            if columnas_detalle_venta and 'lista_precio' not in columnas_detalle_venta:
                db.session.execute(text("ALTER TABLE detalle_venta ADD COLUMN lista_precio INTEGER DEFAULT 1"))
                db.session.commit()
                print("Columna lista_precio agregada a tabla detalle_venta")

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='detalle_devolucion_venta'"))
            columnas_detalle_devolucion = [row[0] for row in result.fetchall()]
            print(f"Columnas en detalle_devolucion_venta: {columnas_detalle_devolucion}")

            if columnas_detalle_devolucion and 'lista_precio' not in columnas_detalle_devolucion:
                db.session.execute(text("ALTER TABLE detalle_devolucion_venta ADD COLUMN lista_precio INTEGER DEFAULT 1"))
                db.session.commit()
                print("Columna lista_precio agregada a tabla detalle_devolucion_venta")
            
            if 'activo' not in columnas_proveedor:
                db.session.execute(text("ALTER TABLE proveedor ADD COLUMN activo BOOLEAN DEFAULT TRUE"))
                db.session.commit()
                print("Columna activo agregada a tabla proveedor")
            
            if 'fecha_creado' not in columnas_proveedor:
                db.session.execute(text("ALTER TABLE proveedor ADD COLUMN fecha_creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                db.session.commit()
                print("Columna fecha_creado agregada a tabla proveedor")

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='cliente'"))
            columnas_cliente = [row[0] for row in result.fetchall()]
            print(f"Columnas en cliente: {columnas_cliente}")

            if columnas_cliente and 'saldo_a_favor_usd' not in columnas_cliente:
                db.session.execute(text("ALTER TABLE cliente ADD COLUMN saldo_a_favor_usd FLOAT DEFAULT 0.0"))
                db.session.commit()
                print("Columna saldo_a_favor_usd agregada a tabla cliente")

            if columnas_cliente and 'activo' not in columnas_cliente:
                db.session.execute(text("ALTER TABLE cliente ADD COLUMN activo BOOLEAN DEFAULT TRUE"))
                db.session.commit()
                print("Columna activo agregada a tabla cliente")

            if columnas_cliente and 'fecha_creado' not in columnas_cliente:
                db.session.execute(text("ALTER TABLE cliente ADD COLUMN fecha_creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                db.session.commit()
                print("Columna fecha_creado agregada a tabla cliente")

            if columnas_cliente and 'foto_perfil_path' not in columnas_cliente:
                db.session.execute(text("ALTER TABLE cliente ADD COLUMN foto_perfil_path VARCHAR(255)"))
                db.session.commit()
                print("Columna foto_perfil_path agregada a tabla cliente")

            if columnas_cliente and 'foto_cedula_path' not in columnas_cliente:
                db.session.execute(text("ALTER TABLE cliente ADD COLUMN foto_cedula_path VARCHAR(255)"))
                db.session.commit()
                print("Columna foto_cedula_path agregada a tabla cliente")

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='cuenta_por_cobrar'"))
            columnas_cxc = [row[0] for row in result.fetchall()]
            print(f"Columnas en cuenta_por_cobrar: {columnas_cxc}")

            if columnas_cxc and 'numero_venta' not in columnas_cxc:
                db.session.execute(text("ALTER TABLE cuenta_por_cobrar ADD COLUMN numero_venta INTEGER"))
                db.session.commit()
                print("Columna numero_venta agregada a tabla cuenta_por_cobrar")

            if columnas_cxc and 'monto_abonado_usd' not in columnas_cxc:
                db.session.execute(text("ALTER TABLE cuenta_por_cobrar ADD COLUMN monto_abonado_usd FLOAT DEFAULT 0.0"))
                db.session.commit()
                print("Columna monto_abonado_usd agregada a tabla cuenta_por_cobrar")

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='abono_cuenta_por_cobrar'"))
            columnas_abono = [row[0] for row in result.fetchall()]
            print(f"Columnas en abono_cuenta_por_cobrar: {columnas_abono}")

            if columnas_abono and 'origen_tasa' not in columnas_abono:
                db.session.execute(text("ALTER TABLE abono_cuenta_por_cobrar ADD COLUMN origen_tasa VARCHAR(20) DEFAULT 'sistema'"))
                db.session.commit()
                print("Columna origen_tasa agregada a tabla abono_cuenta_por_cobrar")

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='movimiento_cuenta_cliente'"))
            columnas_movimiento_cliente = [row[0] for row in result.fetchall()]
            print(f"Columnas en movimiento_cuenta_cliente: {columnas_movimiento_cliente}")

            if columnas_movimiento_cliente and 'movimiento_referencia_id' not in columnas_movimiento_cliente:
                db.session.execute(text("ALTER TABLE movimiento_cuenta_cliente ADD COLUMN movimiento_referencia_id INTEGER"))
                db.session.commit()
                print("Columna movimiento_referencia_id agregada a tabla movimiento_cuenta_cliente")

            if columnas_movimiento_cliente and 'saldo_disponible_usd' not in columnas_movimiento_cliente:
                db.session.execute(text("ALTER TABLE movimiento_cuenta_cliente ADD COLUMN saldo_disponible_usd FLOAT DEFAULT 0.0"))
                db.session.commit()
                print("Columna saldo_disponible_usd agregada a tabla movimiento_cuenta_cliente")

            if columnas_movimiento_cliente:
                db.session.execute(text("UPDATE movimiento_cuenta_cliente SET saldo_disponible_usd = monto_usd WHERE tipo_movimiento = 'saldo_a_favor' AND (saldo_disponible_usd IS NULL OR saldo_disponible_usd = 0)"))
                db.session.commit()

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='devolucion_venta'"))
            columnas_devolucion = [row[0] for row in result.fetchall()]
            print(f"Columnas en devolucion_venta: {columnas_devolucion}")

            if columnas_devolucion and 'reintegros_entregados' not in columnas_devolucion:
                db.session.execute(text("ALTER TABLE devolucion_venta ADD COLUMN reintegros_entregados JSON"))
                db.session.commit()
                print("Columna reintegros_entregados agregada a tabla devolucion_venta")

            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='usuario'"))
            columnas_usuario = [row[0] for row in result.fetchall()]
            print(f"Columnas en usuario: {columnas_usuario}")

            if 'rol' not in columnas_usuario:
                db.session.execute(text("ALTER TABLE usuario ADD COLUMN rol VARCHAR(20) DEFAULT 'admin'"))
                db.session.commit()
                print("Columna rol agregada a tabla usuario")

            db.session.execute(text("ALTER TABLE usuario ALTER COLUMN password TYPE VARCHAR(255)"))
            db.session.commit()

            db.session.execute(text("UPDATE usuario SET rol='admin' WHERE rol IS NULL OR rol = ''"))
            db.session.commit()

            # Tabla movimiento_inventario (ajustes manuales de stock)
            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='movimiento_inventario'"))
            columnas_mov_inv = [row[0] for row in result.fetchall()]
            if not columnas_mov_inv:
                db.session.execute(text("""
                    CREATE TABLE IF NOT EXISTS movimiento_inventario (
                        id SERIAL PRIMARY KEY,
                        producto_id INTEGER NOT NULL REFERENCES producto(id),
                        tipo_movimiento VARCHAR(20) NOT NULL,
                        cantidad INTEGER NOT NULL,
                        stock_anterior INTEGER NOT NULL DEFAULT 0,
                        stock_nuevo INTEGER NOT NULL DEFAULT 0,
                        motivo VARCHAR(100) NOT NULL,
                        observacion TEXT,
                        usuario_username VARCHAR(50),
                        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                db.session.commit()
                print("Tabla movimiento_inventario creada")

        except Exception as e:
            print(f"Error verificando columnas: {e}")
        
        ensure_default_users(app_mode)
        if app_mode == 'demo':
            ensure_demo_dataset()
            print('Aplicacion iniciada en modo demo')
        else:
            print('Aplicacion iniciada en modo real')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
