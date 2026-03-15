# AGENTS.md - Sistema Ventas

## Project Snapshot
- Flask backend in `backend/`, PostgreSQL via Docker, plain HTML/CSS/JS frontend in `frontend/`.
- No Node toolchain, bundler, or package manager config is present.
- Frontend is served by Flask and also has direct browser fallbacks for API access.
- Schema changes are handled imperatively in `backend/app.py` during startup.
- An MCP database server exists at `backend/mcp/server.py`.

## Rule Files
- No `.cursorrules` file was found.
- No files were found under `.cursor/rules/`.
- No `.github/copilot-instructions.md` file was found.

## Key Paths
```text
backend/app.py          Flask app entrypoint, static serving, schema patching, seed users
backend/models.py       SQLAlchemy ORM models
backend/routes/         API blueprints
backend/auth_utils.py   Header-based auth helpers and role checks
backend/pagination.py   Shared pagination helpers
backend/mcp/server.py   MCP database server
frontend/index.html     Main UI shell
frontend/script.js      Bridge delegating to window.* modules
frontend/js/            Feature and core modules loaded by script tags
frontend/styles.css     Full application styling
docker-compose.yml      Local PostgreSQL service
```

## Setup and Run
```bash
# Create virtualenv from repo root
python -m venv backend/.venv
backend\.venv\Scripts\activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Start PostgreSQL
docker-compose up -d

# Run the app
python backend/app.py

# Or use the venv interpreter explicitly
backend\.venv\Scripts\python.exe backend/app.py

# Start directly in demo mode
powershell -ExecutionPolicy Bypass -File .\start_demo.ps1

# Start directly in real mode
powershell -ExecutionPolicy Bypass -File .\start_real.ps1

# Debug reload in PowerShell
$env:FLASK_DEBUG="True"; python backend/app.py

# Stop PostgreSQL
docker-compose down
```

## Build, Lint, and Test
- There is no frontend build step.
- There is no committed lint configuration.
- There is no committed automated test suite yet.
- Preserve local formatting style instead of introducing new tooling unless the user asks.

```bash
# Frontend URL when Flask is running
http://localhost:5000

# If opening frontend/index.html directly, API calls default to:
http://localhost:5000/api

# Run all tests once pytest-based tests exist
pytest

# Run a single test file
pytest tests/test_productos.py

# Run a single test function
pytest tests/test_productos.py::test_get_productos

# Run a single test function verbosely
pytest -vv tests/test_productos.py::test_get_productos
```

## Manual Smoke Checks
```bash
curl http://localhost:5000/api/productos/
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"1234\"}"
```

## Coding Guidelines

### General
- Follow the existing patterns in the touched file instead of introducing a new architecture.
- Prefer small, local edits over broad refactors unless the task explicitly asks for one.
- Keep functions focused; extract helpers when route handlers or UI handlers become hard to scan.
- Use ASCII by default; much of the frontend source intentionally avoids accents.
- Use Spanish for user-facing copy and API messages; use English or established repo terms for identifiers.

### Python Style

#### Imports
- Group imports as standard library, third-party, then local modules.
- Prefer the repo's direct local import style, e.g. `from models import Producto`.
- Keep imports compact and avoid unused imports.

#### Formatting
- Use 4-space indentation and preserve the current compact blank-line style.
- Favor straightforward control flow over clever abstractions.
- Keep helper functions near the blueprint or module that uses them.

#### Types
- Add type hints for new helpers and non-trivial functions when practical.
- Use Python 3.10+ syntax already present in the repo, such as `str | None` and `list[str]`.
- Do not spend time retrofitting type hints everywhere unless required.

#### Naming
- Functions and variables: `snake_case`.
- Classes and SQLAlchemy models: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Blueprints use the `_bp` suffix, e.g. `productos_bp`, `ventas_bp`.
- Keep API payload keys and model field names aligned with existing Spanish domain terms.

#### Flask and API Conventions
- Organize endpoints in `backend/routes/*.py` using blueprints.
- Use `request.get_json() or {}` for JSON payloads.
- Return JSON with `jsonify(...)`; include explicit status codes for non-200 responses.
- Validate required fields early and return clear Spanish errors.
- Reuse shared helpers like `pagination.py` and `auth_utils.py` instead of duplicating behavior.
- Protect restricted endpoints with `@require_roles(...)`.

#### Database and SQLAlchemy
- Use `db.Model` from `backend/database.py`.
- Use `Model.query.get_or_404(id)` when missing data should be a 404.
- Wrap writes in `try/except`, call `db.session.rollback()` on failure, and return clear JSON errors.
- Commit only after related objects are ready; use `db.session.flush()` when an ID is needed before commit.
- Preserve the startup schema-patching behavior in `backend/app.py` unless the task is specifically to redesign migrations.

#### Error Handling
- Prefer explicit validation failures over generic exceptions.
- Use `400` for bad input, `401` for invalid session, `403` for forbidden, `404` for missing resources, and `500` only for unexpected failures.
- When uploads are involved, clean up partially written files on failure.

### Frontend Style

#### Structure
- `frontend/index.html` loads scripts directly in a fixed order; do not break that load order.
- `frontend/script.js` is a compatibility bridge that delegates to modules attached to `window`.
- Put new feature logic in `frontend/js/...` modules whenever possible rather than growing the bridge file.

#### JavaScript Conventions
- Use `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for constants.
- Prefer `async/await` over raw promise chains.
- Follow the existing browser-global module pattern unless the user requests a tooling migration.
- Guard calls into optional browser-global modules with optional chaining when consistent with nearby code.

#### Rendering and UI
- Favor small rendering helpers over very large nested template literals.
- Reuse existing utility modules such as pricing, media, auth, and state-cache helpers.
- Preserve the current design language in `frontend/styles.css`, including the tokenized `:root` variables and Manrope/Fraunces typography.
- Make sure changes still work on both desktop and mobile layouts.

## Practical Agent Notes
- Check for uncommitted work before editing and do not revert user changes you did not create.
- Be careful with `backend/app.py`; it seeds default users and patches schema at startup.
- Local dev credentials are seeded as `admin / 1234` and `cajero / 1234`.
- Never commit `.env`, `backend/.venv`, uploads, or generated cache files.
- If you add tests or lint tooling, update this file with the exact commands, especially single-test examples.
