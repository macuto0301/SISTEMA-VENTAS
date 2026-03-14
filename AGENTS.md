# AGENTS.md - Development Guidelines for Sistema Ventas

## Project Overview

Sistema Ventas is a sales management application with:
- **Backend**: Python Flask with SQLAlchemy ORM and PostgreSQL
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Database**: PostgreSQL (via Docker)

## 1. Build, Run, and Test Commands

### Running the Application

```bash
# Start PostgreSQL container
docker-compose up -d

# Run Flask backend (from backend directory)
cd backend
python app.py
# Or with .venv activation
.venv\Scripts\python.exe app.py

# Access the app at http://localhost:5000
# Frontend is served separately (open frontend/index.html in browser)
```

### Development Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Database migrations (Flask-SQLAlchemy creates tables automatically)
# Tables are created on app startup via db.create_all()

# Run with debug mode (auto-reload on code changes)
FLASK_DEBUG=True python app.py
```

### Testing

> **Note**: This project currently has **no formal test suite** configured.

If tests are added in the future, use pytest:

```bash
# Install pytest
pip install pytest

# Run all tests
pytest

# Run a single test file
pytest tests/test_productos.py

# Run a single test function
pytest tests/test_productos.py::test_get_productos
```

## 2. Code Style Guidelines

### General Principles

- Follow the existing code patterns in the codebase
- Keep functions focused and concise (under 100 lines preferred)
- Add docstrings for complex functions and public APIs
- Use Spanish for user-facing strings, English for code identifiers

### Python (Backend)

#### Imports

```python
# Standard library first
from datetime import datetime
import os
import re

# Third-party packages
from flask import Blueprint, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

# Local application imports
from models import Producto, Usuario
from database import db
```

#### Naming Conventions

- **Variables/functions**: snake_case (`get_productos`, `nuevo_producto`)
- **Classes**: PascalCase (`Producto`, `Venta`, `DetalleCompra`)
- **Constants**: UPPER_SNAKE_CASE (`FRONTEND_PATH`, `API_URL`)
- **Database columns**: snake_case matching model definition
- **Blueprints**: `*_bp` suffix (`productos_bp`, `ventas_bp`)

#### Type Hints

Use type hints for function parameters and return values:

```python
def get_productos() -> list[dict]:
    """Get all products ordered by name."""
    productos = Producto.query.order_by(Producto.nombre).all()
    return jsonify([{
        'id': p.id,
        'nombre': p.nombre,
        # ...
    } for p in productos])

def crear_producto(data: dict) -> tuple[dict, int]:
    """Create a new product. Returns (response, status_code)."""
    # ...
```

#### Error Handling

Always use try/except with proper rollback for database operations:

```python
try:
    nuevo = Producto(...)
    db.session.add(nuevo)
    db.session.commit()
    return jsonify({'mensaje': 'Producto creado', 'id': nuevo.id}), 201
except Exception as e:
    db.session.rollback()
    return jsonify({'error': str(e)}), 400
```

Use appropriate HTTP status codes:
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

#### SQLAlchemy Patterns

- Use `db.Model` for all models
- Define relationships using `db.ForeignKey`
- Use `query.get_or_404(id)` for single-item retrieval with automatic 404
- Always use `db.session.commit()` after writes
- Always use `db.session.rollback()` in except blocks

```python
# Model definition example
class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(50), unique=True, nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    precio_dolares = db.Column(db.Float, nullable=False)
```

#### Flask Routes

- Use Blueprint for organizing routes
- Register blueprints with URL prefixes
- Return JSON responses using `jsonify()`

```python
productos_bp = Blueprint('productos', __name__)

@productos_bp.route('/', methods=['GET'])
def get_productos():
    # ... implementation
```

### JavaScript (Frontend)

#### Naming Conventions

- Variables: camelCase (`productos`, `tasaDolar`)
- Constants: UPPER_SNAKE_CASE (`API_URL`, `DEFAULT_TASA`)
- Functions: camelCase (`cargarProductos`, `agregarAlCarrito`)

#### Async/Await Patterns

Always handle errors in async functions:

```javascript
async function cargarProductos() {
    try {
        const res = await fetch(`${API_URL}/productos/`);
        if (res.ok) {
            productos = await res.json();
            // ... handle success
        }
    } catch (e) {
        console.warn("Usando productos de LocalStorage");
        // ... handle fallback
    }
}
```

#### DOM Manipulation

- Use `document.getElementById()` for single elements
- Use template literals for generating HTML
- Always validate user input before sending to backend

### Database

- Use PostgreSQL as the primary database
- Connection string stored in `.env` as `DATABASE_URL`
- Never commit secrets to version control
- Use `os.getenv()` for environment variables

### Git Practices

- Create feature branches for new functionality
- Commit frequently with descriptive messages
- Never commit `.env` files, `.venv` directories, or `__pycache__`

### Security

- Always hash passwords using `werkzeug.security.generate_password_hash`
- Validate all user inputs on both client and server
- Use parameterized queries (SQLAlchemy handles this automatically)
- Enable CORS only for known origins

## 3. Project Structure

```
sistema-ventas/
├── backend/
│   ├── app.py              # Flask application factory
│   ├── database.py         # SQLAlchemy initialization
│   ├── models.py           # Database models
│   ├── requirements.txt    # Python dependencies
│   ├── .env               # Environment variables (DO NOT COMMIT)
│   ├── .venv/             # Virtual environment (DO NOT COMMIT)
│   ├── mcp/               # Model Context Protocol server
│   └── routes/
│       ├── productos.py    # Products API
│       ├── ventas.py      # Sales API
│       ├── config.py      # Configuration API
│       ├── auth.py        # Authentication API
│       ├── proveedores.py # Suppliers API
│       └── compras.py     # Purchases API
├── frontend/
│   ├── index.html         # Main HTML file
│   ├── script.js          # JavaScript application
│   └── styles.css         # Stylesheets
├── docker-compose.yml     # PostgreSQL container
└── AGENTS.md             # This file
```

## 4. Common Development Tasks

### Adding a New Model

1. Add the model class to `backend/models.py`
2. Import it in `backend/app.py` if needed for initialization
3. The table will be created automatically on next app startup

### Adding a New API Endpoint

1. Create or update a route file in `backend/routes/`
2. Use the existing Blueprint pattern
3. Register the Blueprint in `backend/app.py`
4. Test with curl or Postman:
   ```bash
   curl http://localhost:5000/api/your-endpoint
   ```

### Modifying the Frontend

1. Edit `frontend/script.js` for JavaScript logic
2. Edit `frontend/styles.css` for styling
3. Edit `frontend/index.html` for structure
4. Open `frontend/index.html` directly in browser (no build step needed)

### Working with the MCP Server

The application includes a Model Context Protocol server in `backend/mcp/`:
- To run the MCP server: `python backend/mcp/server.py`
- The MCP server provides AI-assisted capabilities for the application