from flask import Blueprint, request, jsonify
from auth_utils import create_access_token
from models import Usuario
from database import db
from werkzeug.security import check_password_hash, generate_password_hash

auth_bp = Blueprint('auth', __name__)


def password_matches(stored_password, provided_password):
    if not stored_password or provided_password is None:
        return False

    if stored_password == provided_password:
        return True

    try:
        return check_password_hash(stored_password, provided_password)
    except (ValueError, TypeError):
        return False

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = str(data.get('password') or '')

    if not username or not password:
        return jsonify({
            'success': False,
            'message': 'Usuario y contrasena son obligatorios'
        }), 400

    user = Usuario.query.filter_by(username=username).first()

    if user and password_matches(user.password, password):
        if user.password == password:
            user.password = generate_password_hash(password)
            db.session.commit()

        access_token, expires_at = create_access_token(user)

        return jsonify({
            'success': True,
            'message': 'Login exitoso',
            'access_token': access_token,
            'token_type': 'Bearer',
            'expires_at': expires_at.isoformat(),
            'user': {
                'id': user.id,
                'username': user.username,
                'rol': user.rol,
            }
        })
    
    return jsonify({
        'success': False,
        'message': 'Usuario o contrasena incorrectos'
    }), 401

@auth_bp.route('/init-admin', methods=['POST'])
def init_admin():
    # Solo crea el admin si no existe ninguno
    if Usuario.query.filter_by(username='admin').first():
        return jsonify({'message': 'Admin ya existe'}), 200
    
    admin = Usuario()
    admin.username = 'admin'
    admin.password = generate_password_hash('1234')
    admin.rol = 'admin'
    db.session.add(admin)
    db.session.commit()
    return jsonify({'message': 'Admin creado exitosamente'}), 201
