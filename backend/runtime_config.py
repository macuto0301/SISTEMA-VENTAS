import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / '.env'
DEFAULT_DEMO_DATABASE_URL = 'postgresql://admin:secret_password@localhost:5432/ventas_demo'
DEFAULT_REAL_DATABASE_URL = 'postgresql://admin:secret_password@localhost:5432/ventas_db'


def _normalize_mode(value: str | None) -> str:
    mode = (value or 'demo').strip().lower()
    if mode not in ('demo', 'real'):
        return 'demo'
    return mode


def apply_runtime_env() -> str:
    load_dotenv(ENV_PATH)
    mode = _normalize_mode(os.getenv('APP_MODE'))
    os.environ['APP_MODE'] = mode

    legacy_database_url = os.getenv('DATABASE_URL') or ''
    database_url_demo = os.getenv('DATABASE_URL_DEMO') or DEFAULT_DEMO_DATABASE_URL
    database_url_real = os.getenv('DATABASE_URL_REAL') or legacy_database_url or DEFAULT_REAL_DATABASE_URL

    if not os.getenv('DATABASE_URL_DEMO') and mode == 'demo' and legacy_database_url and legacy_database_url != database_url_real:
        database_url_demo = legacy_database_url

    active_database_url = database_url_real if mode == 'real' else database_url_demo

    os.environ['DATABASE_URL_DEMO'] = database_url_demo
    os.environ['DATABASE_URL_REAL'] = database_url_real
    os.environ['DATABASE_URL'] = active_database_url

    return mode


def get_app_mode() -> str:
    return _normalize_mode(os.getenv('APP_MODE'))


def get_active_database_url() -> str:
    mode = get_app_mode()
    legacy_database_url = os.getenv('DATABASE_URL') or ''
    database_url_demo = os.getenv('DATABASE_URL_DEMO') or DEFAULT_DEMO_DATABASE_URL
    database_url_real = os.getenv('DATABASE_URL_REAL') or legacy_database_url or DEFAULT_REAL_DATABASE_URL

    if not os.getenv('DATABASE_URL_DEMO') and mode == 'demo' and legacy_database_url and legacy_database_url != database_url_real:
        database_url_demo = legacy_database_url

    return database_url_real if mode == 'real' else database_url_demo
