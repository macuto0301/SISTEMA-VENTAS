from functools import wraps

from flask import jsonify, request

from models import Usuario


def get_current_user() -> Usuario | None:
    username = request.headers.get('X-Auth-Username', '').strip()
    if not username:
        return None

    return Usuario.query.filter_by(username=username).first()


def require_roles(*allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapped(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'error': 'Sesion no valida'}), 401

            if user.rol not in allowed_roles:
                return jsonify({'error': 'No tiene permisos para esta accion'}), 403

            return view_func(*args, **kwargs)

        return wrapped

    return decorator
