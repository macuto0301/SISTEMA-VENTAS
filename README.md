# Sistema Ventas

Aplicacion web para gestionar inventario, ventas, clientes, cuentas por cobrar, proveedores, compras e indicadores comerciales desde una sola interfaz.

## Descripcion

El proyecto esta compuesto por:

- `backend/`: API en Flask con SQLAlchemy y PostgreSQL.
- `frontend/`: interfaz web en HTML, CSS y JavaScript vanilla.
- `docker-compose.yml`: servicio local de PostgreSQL para desarrollo.
- `backend/mcp/server.py`: servidor MCP para consultas a la base de datos.

La aplicacion sirve el frontend desde Flask en `http://localhost:5000` y expone la API bajo `/api`.

## Funcionalidades principales

- Gestion de productos con precios en dolares y bolivares.
- Registro de ventas y devoluciones.
- Gestion de clientes y cuentas por cobrar.
- Gestion de proveedores y compras.
- Configuracion comercial, incluyendo tasa BCV.
- Inicio de sesion con roles `admin` y `cajero`.
- Carga y entrega de archivos en `backend/uploads`.

## Stack

- Backend: Flask, Flask-SQLAlchemy, Flask-CORS, python-dotenv
- Base de datos: PostgreSQL
- Frontend: HTML, CSS y JavaScript vanilla
- Utilidades adicionales: Pillow, requests, beautifulsoup4, MCP

## Estructura del proyecto

```text
SISTEMA-VENTAS/
|- backend/
|  |- app.py
|  |- auth_utils.py
|  |- database.py
|  |- models.py
|  |- pagination.py
|  |- requirements.txt
|  |- mcp/
|  |  \- server.py
|  \- routes/
|     |- auth.py
|     |- clientes.py
|     |- compras.py
|     |- config.py
|     |- cuentas_por_cobrar.py
|     |- productos.py
|     |- proveedores.py
|     \- ventas.py
|- frontend/
|  |- index.html
|  |- script.js
|  |- styles.css
|  \- js/
|- docker-compose.yml
|- AGENTS.md
\- README.md
```

## Requisitos

- Python 3.10 o superior
- Docker Desktop o una instancia local de PostgreSQL

## Configuracion

Crea `backend/.env` con una configuracion similar a esta:

```env
DATABASE_URL=postgresql://admin:secret_password@localhost:5432/ventas_db
PORT=5000
DEBUG=True
CORS_ORIGINS=http://localhost:5000,http://127.0.0.1:5000
```

Notas:

- Si usas `docker-compose.yml`, la base de datos local queda disponible en `localhost:5432`.
- Flask tambien permite origenes locales comunes como `5500`, `8000` y `3000` para trabajar el frontend por separado.

## Puesta en marcha

### Instalacion automatica en Windows (sin Docker)

Este proyecto incluye un instalador que hace todo en una sola ejecucion:

- clona o actualiza el repositorio
- instala Git y Python (si faltan)
- verifica conexion a PostgreSQL local
- si no hay conexion, ofrece instalar PostgreSQL
- crea usuario y base de datos
- crea `backend/.env`
- crea entorno virtual e instala dependencias

Ejecuta en PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\install_windows.ps1 -StartApp
```

Notas:

- El script no usa Docker.
- Si PostgreSQL ya esta instalado, reutiliza el servicio local.
- Puedes cambiar credenciales o rutas con parametros como `-InstallDir`, `-DbUser`, `-DbPassword`, `-DbName`, `-PgAdminPassword`.

### 1. Levantar PostgreSQL

```bash
docker-compose up -d
```

### 2. Crear entorno virtual

```bash
python -m venv backend/.venv
```

### 3. Instalar dependencias

En Windows:

```bash
backend\.venv\Scripts\pip.exe install -r backend/requirements.txt
```

En Linux o macOS:

```bash
backend/.venv/bin/pip install -r backend/requirements.txt
```

### 4. Ejecutar la aplicacion

En Windows:

```bash
backend\.venv\Scripts\python.exe backend/app.py
```

En Linux o macOS:

```bash
backend/.venv/bin/python backend/app.py
```

### 5. Abrir el sistema

- App web: `http://localhost:5000`
- API: `http://localhost:5000/api`

## Credenciales iniciales

Al iniciar por primera vez, el backend crea estos usuarios si no existen:

- `admin / 1234`
- `cajero / 1234`

## Flujo de desarrollo

### Ejecutar en modo debug

PowerShell:

```powershell
$env:FLASK_DEBUG="True"; python backend/app.py
```

O usando el interprete del entorno virtual:

```powershell
$env:FLASK_DEBUG="True"; backend\.venv\Scripts\python.exe backend/app.py
```

### Trabajar el frontend por separado

No hace falta un servidor estatico adicional porque Flask ya sirve `frontend/index.html`. Si quieres abrir el frontend por separado, el codigo intenta consumir la API desde `http://localhost:5000/api`.

Ejemplo:

```bash
python -m http.server 8080 --directory frontend
```

## Base de datos y esquema

- Las tablas se crean automaticamente al iniciar la aplicacion.
- `backend/app.py` tambien aplica ajustes de esquema en arranque para columnas e indices faltantes.
- No hay migraciones formales con Alembic u otra herramienta en este repositorio.

## API disponible

Rutas principales registradas por el backend:

- `/api/auth`
- `/api/productos`
- `/api/ventas`
- `/api/clientes`
- `/api/cuentas-por-cobrar`
- `/api/proveedores`
- `/api/compras`
- `/api/config`

## Pruebas

Actualmente no existe una suite de pruebas automatizadas versionada en el proyecto.

Si agregas pruebas con `pytest`, puedes ejecutarlas asi:

```bash
pytest
pytest tests/test_productos.py
pytest tests/test_productos.py::test_get_productos
pytest -vv tests/test_productos.py::test_get_productos
```

## Verificaciones manuales utiles

Consultar productos:

```bash
curl http://localhost:5000/api/productos/
```

Iniciar sesion:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"1234\"}"
```

## MCP

El repositorio incluye un servidor MCP en `backend/mcp/server.py` para consultar la base de datos desde herramientas compatibles.

Su conexion usa `DATABASE_URL` desde `backend/.env` y expone herramientas para:

- listar tablas
- consultar productos
- consultar ventas
- ejecutar consultas `SELECT`

## Docker

Levantar la base de datos:

```bash
docker-compose up -d
```

Detener contenedores:

```bash
docker-compose down
```

Detener y eliminar volumenes:

```bash
docker-compose down -v
```

## Notas

- No se usa Node, bundler ni paso de build para el frontend.
- Evita commitear `backend/.env`, `backend/.venv`, `backend/uploads` y archivos generados.
- El frontend carga modulos en un orden fijo desde `frontend/index.html`; si haces cambios, conserva ese orden.

## Licencia

Este proyecto se distribuye bajo la licencia MIT.
