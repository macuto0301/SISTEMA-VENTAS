from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request

from models import Usuario


def create_access_token(user: Usuario) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    expires_minutes = max(1, int(current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', 480) or 480))
    expires_at = now + timedelta(minutes=expires_minutes)
    payload = {
        'sub': str(user.id),
        'username': user.username,
        'rol': user.rol,
        'iat': now,
        'exp': expires_at,
    }
    token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
    return token, expires_at


def _get_bearer_token() -> str:
    auth_header = request.headers.get('Authorization', '').strip()
    if not auth_header:
        return ''

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return ''

    return parts[1].strip()


def _decode_access_token(token: str) -> tuple[dict | None, str | None]:
    if not token:
        return None, 'missing'

    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, 'expired'
    except jwt.InvalidTokenError:
        return None, 'invalid'


def get_current_user() -> Usuario | None:
    if hasattr(g, 'current_user'):
        return g.current_user

    g.auth_error = None
    token = _get_bearer_token()
    payload, error = _decode_access_token(token)
    if error:
        g.current_user = None
        g.auth_error = error
        return None

    user = None
    user_id = payload.get('sub') if payload else None
    if user_id is not None:
        try:
            user = Usuario.query.get(int(user_id))
        except (TypeError, ValueError):
            user = None

    if not user and payload:
        username = str(payload.get('username') or '').strip()
        if username:
            user = Usuario.query.filter_by(username=username).first()

    if not user:
        g.current_user = None
        g.auth_error = 'user_not_found'
        return None

    g.current_user = user
    g.jwt_payload = payload
    return user


def get_auth_error_message() -> str:
    auth_error = getattr(g, 'auth_error', None)
    if auth_error == 'expired':
        return 'La sesion ha vencido'
    if auth_error == 'invalid':
        return 'Token no valido'
    return 'Sesion no valida'


def require_roles(*allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapped(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'error': get_auth_error_message()}), 401

            if user.rol not in allowed_roles:
                return jsonify({'error': 'No tiene permisos para esta accion'}), 403

            return view_func(*args, **kwargs)

        return wrapped

    return decorator
