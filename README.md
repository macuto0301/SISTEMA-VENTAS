# Sistema Ventas - Gestión de Ventas

Aplicación de gestión de ventas con backend en Python Flask y frontend en JavaScript vanilla.

## 📋 Descripción

Sistema Ventas es una aplicación para la gestión de ventas, productos, clientes y compras. Utiliza:
- **Backend**: Python Flask con SQLAlchemy ORM y PostgreSQL
- **Frontend**: JavaScript vanilla, HTML y CSS
- **Base de datos**: PostgreSQL (gestionado vía Docker)

## 🚀 Puesta en marcha

### Prerrequisitos

- Docker Desktop instalado y en ejecucion si vas a usar el `docker-compose.yml`
- Python 3.8+ para ejecutar el backend
- Git (opcional)

### Paso a paso

1. **Clonar el repositorio** (si aplica):
   ```bash
   git clone <url-del-repositorio>
   cd sistema-ventas
   ```

2. **Iniciar la base de datos PostgreSQL**:
   ```bash
   docker-compose up -d
   ```
   Esto iniciara un contenedor de PostgreSQL en el puerto 5432.

   Si Docker Desktop no esta levantado, el comando fallara. En ese caso debes iniciar Docker Desktop o usar una instancia local de PostgreSQL con los mismos datos del archivo `backend/.env`.

3. **Instalar dependencias del backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Ejecutar la aplicación Flask**:
   ```bash
   # Opción 1: Ejecución estándar
   python app.py
   
   # Opción 2: Con entorno virtual (si está configurado)
   .venv\Scripts\python.exe app.py  # Windows
   # source .venv/bin/activate && python app.py  # Linux/Mac
   
    # Opcion 3: Modo debug en Windows
    set FLASK_DEBUG=True && python app.py

    # Opcion 4: Modo debug en Linux/Mac
    FLASK_DEBUG=True python app.py
   ```

5. **Acceder a la aplicación**:
   - La aplicacion completa queda disponible en: `http://localhost:5000`
   - Flask sirve automaticamente `frontend/index.html` desde la ruta raiz `/`
   - La API del backend queda disponible bajo `http://localhost:5000/api/...`

### Credenciales predeterminadas

Al iniciar la aplicacion por primera vez, se creara automaticamente:
- **Usuario**: `admin`
- **Contrasena**: `1234`

## 🛠️ Desarrollo

### Instalación de dependencias

```bash
# Backend
cd backend
pip install -r requirements.txt

# No hay dependencias específicas para el frontend (JavaScript vanilla)
```

### Migraciones de base de datos

Las tablas se crean automáticamente al iniciar la aplicación mediante `db.create_all()` en `app.py`.

### Ejecutar en modo desarrollo

```bash
# Terminal 1 - Base de datos
docker-compose up -d

# Terminal 2 - Backend
cd backend
set FLASK_DEBUG=True && python app.py

# Terminal 3 - Frontend
# No es obligatorio levantar un servidor estatico aparte porque Flask ya sirve el frontend en http://localhost:5000
# Solo usa un servidor estatico si quieres trabajar el frontend por separado
cd frontend
python -m http.server 8080
```

## 🧪 Pruebas

> **Nota**: Actualmente este proyecto no tiene una suite de pruebas formal configurada.

Si se añaden pruebas en el futuro, se podrá utilizar pytest:

```bash
# Instalar pytest
pip install pytest

# Ejecutar todas las pruebas
pytest

# Ejecutar un archivo de prueba específico
pytest tests/test_productos.py

# Ejecutar una función de prueba específica
pytest tests/test_productos.py::test_get_productos
```

## 📁 Estructura del proyecto

```
sistema-ventas/
├── backend/
│   ├── app.py              # Servidor Flask principal
│   ├── database.py         # Inicialización de SQLAlchemy
│   ├── models.py           # Modelos de base de datos
│   ├── requirements.txt    # Dependencias de Python
│   ├── .env               # Variables de entorno (NO commitear)
│   ├── .venv/             # Entorno virtual (NO commitear)
│   ├── mcp/               # Servidor MCP (Model Context Protocol)
│   └── routes/
│       ├── productos.py    # API de productos
│       ├── ventas.py      # API de ventas
│       ├── config.py      # API de configuración
│       ├── auth.py        # API de autenticación
│       ├── proveedores.py # API de proveedores
│       └── compras.py     # API de compras
├── frontend/
│   ├── index.html         # Archivo HTML principal
│   ├── script.js          # Lógica de la aplicación JavaScript
│   └── styles.css         # Estilos CSS
├── docker-compose.yml     # Configuración de PostgreSQL
└── AGENTS.md             # Guía de desarrollo (este archivo)
```

## ⚙️ Configuración

### Variables de entorno

Crear un archivo `.env` en el directorio `backend/` basado en el ejemplo siguiente:

```env
DATABASE_URL=postgresql://admin:secret_password@localhost:5432/ventas_db
PORT=5000
DEBUG=True
```

### Puertos

- **PostgreSQL**: 5432 (gestionado por Docker)
- **Flask API**: 5000
- **Frontend**: Se abre directamente en el navegador o se sirve en cualquier puerto estático

## 🐳 Docker

El archivo `docker-compose.yml` incluye un servicio para PostgreSQL:

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    container_name: postgres_ventas
    restart: always
    environment:
      POSTGRES_DB: ventas_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Para detener y eliminar los contenedores:
```bash
docker-compose down
```

Para eliminar también los volúmenes (borrará todos los datos):
```bash
docker-compose down -v
```

## 📝 Licencia

Este proyecto está bajo la licencia MIT - ver el archivo LICENSE para más detalles.
