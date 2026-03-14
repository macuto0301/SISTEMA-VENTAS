from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from database import db
import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv()

# Ruta del frontend
FRONTEND_PATH = os.path.join(os.path.dirname(__file__), '..', 'frontend')

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
    
    # Servir archivos estáticos del frontend
    @app.route('/')
    def serve_frontend():
        return send_from_directory(FRONTEND_PATH, 'index.html')
    
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
        ['Content-Type', 'Authorization', 'X-Auth-Username']
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
    from routes.proveedores import proveedores_bp
    from routes.compras import compras_bp

    app.register_blueprint(productos_bp, url_prefix='/api/productos')
    app.register_blueprint(ventas_bp, url_prefix='/api/ventas')
    app.register_blueprint(config_bp, url_prefix='/api/config')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(proveedores_bp, url_prefix='/api/proveedores')
    app.register_blueprint(compras_bp, url_prefix='/api/compras')

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
            
            # Verificar columnas en tabla proveedor
            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='proveedor'"))
            columnas_proveedor = [row[0] for row in result.fetchall()]
            print(f"Columnas en proveedor: {columnas_proveedor}")
            
            if 'activo' not in columnas_proveedor:
                db.session.execute(text("ALTER TABLE proveedor ADD COLUMN activo BOOLEAN DEFAULT TRUE"))
                db.session.commit()
                print("Columna activo agregada a tabla proveedor")
            
            if 'fecha_creado' not in columnas_proveedor:
                db.session.execute(text("ALTER TABLE proveedor ADD COLUMN fecha_creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                db.session.commit()
                print("Columna fecha_creado agregada a tabla proveedor")

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

            db.session.execute(text("UPDATE usuario SET rol='admin' WHERE rol IS NULL OR rol = ''"))
            db.session.commit()
                 
        except Exception as e:
            print(f"Error verificando columnas: {e}")
        
        # Verificar e inicializar admin si no existe
        from models import Usuario
        if not Usuario.query.filter_by(username='admin').first():
            admin = Usuario(username='admin', password=generate_password_hash('1234'), rol='admin')
            db.session.add(admin)
            db.session.commit()
            print("Admin inicial creado: admin / 1234")

        admin = Usuario.query.filter_by(username='admin').first()
        if admin and admin.rol != 'admin':
            admin.rol = 'admin'
            db.session.commit()

        if not Usuario.query.filter_by(username='cajero').first():
            cajero = Usuario(username='cajero', password=generate_password_hash('1234'), rol='cajero')
            db.session.add(cajero)
            db.session.commit()
            print("Usuario cajero inicial creado: cajero / 1234")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
