-- =====================================================================
-- MIGRACION: Soporte para cantidades decimales (productos pesables)
-- Ejecutar manualmente en PostgreSQL si la actualizacion automatica falla
-- =====================================================================

-- 1. Agregar columna permite_decimal a la tabla producto
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'producto' AND column_name = 'permite_decimal'
    ) THEN
        ALTER TABLE producto ADD COLUMN permite_decimal BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Columna permite_decimal agregada a tabla producto';
    ELSE
        RAISE NOTICE 'Columna permite_decimal ya existe en tabla producto';
    END IF;
END $$;

-- 2. Migrar columna producto.cantidad de INTEGER a DOUBLE PRECISION
DO $$
DECLARE
    v_tipo TEXT;
BEGIN
    SELECT data_type INTO v_tipo
    FROM information_schema.columns
    WHERE table_name = 'producto' AND column_name = 'cantidad';

    IF v_tipo = 'integer' THEN
        ALTER TABLE producto ALTER COLUMN cantidad TYPE DOUBLE PRECISION USING cantidad::double precision;
        RAISE NOTICE 'producto.cantidad migrada a DOUBLE PRECISION';
    ELSE
        RAISE NOTICE 'producto.cantidad ya es %', v_tipo;
    END IF;
END $$;

-- 3. Migrar columna detalle_venta.cantidad de INTEGER a DOUBLE PRECISION
DO $$
DECLARE
    v_tipo TEXT;
BEGIN
    SELECT data_type INTO v_tipo
    FROM information_schema.columns
    WHERE table_name = 'detalle_venta' AND column_name = 'cantidad';

    IF v_tipo = 'integer' THEN
        ALTER TABLE detalle_venta ALTER COLUMN cantidad TYPE DOUBLE PRECISION USING cantidad::double precision;
        RAISE NOTICE 'detalle_venta.cantidad migrada a DOUBLE PRECISION';
    ELSE
        RAISE NOTICE 'detalle_venta.cantidad ya es %', v_tipo;
    END IF;
END $$;

-- 4. Migrar columna detalle_compra.cantidad de INTEGER a DOUBLE PRECISION
DO $$
DECLARE
    v_tipo TEXT;
BEGIN
    SELECT data_type INTO v_tipo
    FROM information_schema.columns
    WHERE table_name = 'detalle_compra' AND column_name = 'cantidad';

    IF v_tipo = 'integer' THEN
        ALTER TABLE detalle_compra ALTER COLUMN cantidad TYPE DOUBLE PRECISION USING cantidad::double precision;
        RAISE NOTICE 'detalle_compra.cantidad migrada a DOUBLE PRECISION';
    ELSE
        RAISE NOTICE 'detalle_compra.cantidad ya es %', v_tipo;
    END IF;
END $$;

-- 5. Migrar columna detalle_devolucion_venta.cantidad de INTEGER a DOUBLE PRECISION
DO $$
DECLARE
    v_tipo TEXT;
BEGIN
    SELECT data_type INTO v_tipo
    FROM information_schema.columns
    WHERE table_name = 'detalle_devolucion_venta' AND column_name = 'cantidad';

    IF v_tipo = 'integer' THEN
        ALTER TABLE detalle_devolucion_venta ALTER COLUMN cantidad TYPE DOUBLE PRECISION USING cantidad::double precision;
        RAISE NOTICE 'detalle_devolucion_venta.cantidad migrada a DOUBLE PRECISION';
    ELSE
        RAISE NOTICE 'detalle_devolucion_venta.cantidad ya es %', v_tipo;
    END IF;
END $$;

-- 6. Crear tabla movimiento_inventario si no existe (con columnas DOUBLE PRECISION)
CREATE TABLE IF NOT EXISTS movimiento_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES producto(id),
    tipo_movimiento VARCHAR(20) NOT NULL,
    cantidad DOUBLE PRECISION NOT NULL,
    stock_anterior DOUBLE PRECISION NOT NULL DEFAULT 0,
    stock_nuevo DOUBLE PRECISION NOT NULL DEFAULT 0,
    motivo VARCHAR(100) NOT NULL,
    observacion TEXT,
    usuario_username VARCHAR(50),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Migrar columnas de movimiento_inventario si ya existia con INTEGER
DO $$
DECLARE
    v_tipo TEXT;
BEGIN
    -- cantidad
    SELECT data_type INTO v_tipo
    FROM information_schema.columns
    WHERE table_name = 'movimiento_inventario' AND column_name = 'cantidad';

    IF v_tipo = 'integer' THEN
        ALTER TABLE movimiento_inventario ALTER COLUMN cantidad TYPE DOUBLE PRECISION USING cantidad::double precision;
        RAISE NOTICE 'movimiento_inventario.cantidad migrada a DOUBLE PRECISION';
    END IF;

    -- stock_anterior
    SELECT data_type INTO v_tipo
    FROM information_schema.columns
    WHERE table_name = 'movimiento_inventario' AND column_name = 'stock_anterior';

    IF v_tipo = 'integer' THEN
        ALTER TABLE movimiento_inventario ALTER COLUMN stock_anterior TYPE DOUBLE PRECISION USING stock_anterior::double precision;
        RAISE NOTICE 'movimiento_inventario.stock_anterior migrada a DOUBLE PRECISION';
    END IF;

    -- stock_nuevo
    SELECT data_type INTO v_tipo
    FROM information_schema.columns
    WHERE table_name = 'movimiento_inventario' AND column_name = 'stock_nuevo';

    IF v_tipo = 'integer' THEN
        ALTER TABLE movimiento_inventario ALTER COLUMN stock_nuevo TYPE DOUBLE PRECISION USING stock_nuevo::double precision;
        RAISE NOTICE 'movimiento_inventario.stock_nuevo migrada a DOUBLE PRECISION';
    END IF;
END $$;

-- =====================================================================
-- FIN DE LA MIGRACION
-- Verificar con: SELECT column_name, data_type FROM information_schema.columns
--                WHERE table_name = 'producto' AND column_name IN ('cantidad', 'permite_decimal');
-- =====================================================================
