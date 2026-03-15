from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from mcp.server import NotificationOptions
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os
from pathlib import Path

from runtime_config import apply_runtime_env, get_active_database_url

# Cargar .env desde la carpeta backend
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, '.env'))
apply_runtime_env()

DATABASE_URL = get_active_database_url()

app = Server("sistema-ventas-db")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="query_productos",
            description="Consultar productos de la base de datos",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {"type": "number", "description": "Límite de resultados", "default": 100}
                }
            }
        ),
        Tool(
            name="query_ventas",
            description="Consultar ventas de la base de datos",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {"type": "number", "description": "Límite de resultados", "default": 50}
                }
            }
        ),
        Tool(
            name="ejecutar_sql",
            description="Ejecutar una consulta SQL personalizada",
            inputSchema={
                "type": "object",
                "properties": {
                    "sql": {"type": "string", "description": "Consulta SQL a ejecutar"}
                }
            },
            required=["sql"]
        ),
        Tool(
            name="get_tablas",
            description="Listar todas las tablas de la base de datos",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if name == "query_productos":
            limit = arguments.get("limit", 100)
            cursor.execute(f"SELECT * FROM producto ORDER BY nombre LIMIT {limit}")
            resultados = cursor.fetchall()
            return [TextContent(type="text", text=str(resultados))]
        
        elif name == "query_ventas":
            limit = arguments.get("limit", 50)
            cursor.execute(f"SELECT * FROM venta ORDER BY fecha DESC LIMIT {limit}")
            resultados = cursor.fetchall()
            return [TextContent(type="text", text=str(resultados))]
        
        elif name == "ejecutar_sql":
            sql = arguments.get("sql", "")
            if not sql.strip():
                return [TextContent(type="text", text="Error: SQL no puede estar vacío")]
            
            # Solo permitir SELECT para seguridad
            if not sql.strip().lower().startswith("select"):
                return [TextContent(type="text", text="Error: Solo se permiten consultas SELECT")]
            
            cursor.execute(sql)
            resultados = cursor.fetchall()
            return [TextContent(type="text", text=str(resultados))]
        
        elif name == "get_tablas":
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tablas = cursor.fetchall()
            return [TextContent(type="text", text=str(tablas))]
        
        return [TextContent(type="text", text="Tool no reconocida")]
    
    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import asyncio
    
    async def main():
        async with stdio_server() as (read_stream, write_stream):
            await app.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="sistema-ventas-db",
                    server_version="1.0.0",
                    capabilities={},
                    notification_options=NotificationOptions()
                )
            )
    
    asyncio.run(main())
