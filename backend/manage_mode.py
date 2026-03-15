import argparse
from pathlib import Path

from dotenv import dotenv_values


ENV_PATH = Path(__file__).resolve().parent / '.env'


def load_env_lines() -> list[str]:
    if not ENV_PATH.exists():
        return []
    return ENV_PATH.read_text(encoding='utf-8').splitlines()


def set_env_value(lines: list[str], key: str, value: str) -> list[str]:
    prefix = f'{key}='
    updated = False
    result: list[str] = []

    for line in lines:
        if line.startswith(prefix):
            result.append(f'{prefix}{value}')
            updated = True
        else:
            result.append(line)

    if not updated:
        result.append(f'{prefix}{value}')

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description='Activa el modo demo o real del sistema')
    parser.add_argument('mode', choices=['demo', 'real'])
    parser.add_argument('--database-url', dest='database_url', help='Actualiza DATABASE_URL_REAL antes de activar modo real')
    args = parser.parse_args()

    lines = load_env_lines()
    if args.database_url:
        lines = set_env_value(lines, 'DATABASE_URL_REAL', args.database_url)

    current_values = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    database_url_demo = current_values.get('DATABASE_URL_DEMO') or 'postgresql://admin:secret_password@localhost:5432/ventas_demo'
    database_url_real = args.database_url or current_values.get('DATABASE_URL_REAL') or current_values.get('DATABASE_URL') or 'postgresql://admin:secret_password@localhost:5432/ventas_db'
    active_database_url = database_url_real if args.mode == 'real' else database_url_demo

    lines = set_env_value(lines, 'APP_MODE', args.mode)
    lines = set_env_value(lines, 'DATABASE_URL', active_database_url)
    lines = set_env_value(lines, 'DATABASE_URL_DEMO', database_url_demo)
    lines = set_env_value(lines, 'DATABASE_URL_REAL', database_url_real)
    ENV_PATH.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'Modo activo actualizado a: {args.mode}')


if __name__ == '__main__':
    main()
