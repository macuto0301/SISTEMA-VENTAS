# Roadmap de Cuenta por Cobrar

## Objetivo

Llevar el modulo actual de cuenta por cobrar desde un manejo operativo basico a un flujo empresarial con control de credito, cobranza, auditoria y reportes gerenciales.

## Diagnostico corto

- Ya existe base operativa: venta a credito, abonos, saldo a favor y estado de cuenta por cliente.
- Falta control preventivo: limites, vencimientos reales, bloqueo y autorizacion supervisor.
- Falta control correctivo: notas de credito/debito, ajuste de devoluciones sobre la deuda y seguimiento de cobranza.
- Falta analitica: antiguedad, cartera vencida y flujo de caja proyectado.

## Fase 1 - Control de credito y consistencia

### 1. Datos nuevos o extendidos

Agregar en `backend/models.py`:

#### Cliente

- `limite_credito_usd`
- `limite_documentos`
- `dias_credito`
- `dias_tolerancia`
- `bloqueado_credito`
- `requiere_supervision_credito`
- `politica_credito_id` opcional para una fase posterior

#### CuentaPorCobrar

- `dias_credito_snapshot`
- `dias_tolerancia_snapshot`
- `fecha_ultimo_abono`
- `dias_mora`
- `estado_riesgo` (`al_dia`, `por_vencer`, `vencida`, `bloqueada`)
- `origen_documento` (`venta`, `nota_debito`, `ajuste_manual`)

#### Nueva tabla sugerida: `AutorizacionCredito`

- `cliente_id`
- `venta_id`
- `motivo`
- `resultado`
- `autorizado_por`
- `observacion`
- `fecha`

### 2. Reglas de negocio

Aplicar antes de registrar una venta a credito en `backend/routes/ventas.py`:

- bloquear si el cliente supera `limite_credito_usd`
- bloquear si supera `limite_documentos`
- bloquear si tiene documentos con mora mayor al maximo permitido
- permitir excepcion solo con credencial o autorizacion de supervisor

Calculos minimos:

- `fecha_vencimiento = fecha_emision + dias_credito`
- `fecha_bloqueo = fecha_vencimiento + dias_tolerancia`
- `dias_mora = max(0, hoy - fecha_vencimiento)`

### 3. Endpoints a crear o ajustar

#### Ajustar

- `POST /api/ventas/`
  - validar politica de credito antes de crear CxC
  - guardar `fecha_vencimiento` y snapshots de politica

- `GET /api/clientes/:id/estado-cuenta`
  - incluir vencimiento, dias de mora, estado de riesgo, saldo corrido y resumen de cartera

- `GET /api/cuentas-por-cobrar/`
  - permitir filtros por `vencida`, `por_vencer`, `cliente_bloqueado`, `dias_mora`, `fecha_vencimiento`

#### Crear

- `POST /api/cuentas-por-cobrar/validar-credito`
  - devuelve si la venta puede pasar o requiere override

- `POST /api/cuentas-por-cobrar/autorizaciones`
  - registra excepcion de supervisor

### 4. UI a construir

#### Clientes

En la ficha del cliente:

- limite de credito en USD
- limite de documentos
- dias de credito
- dias de tolerancia
- interruptor de bloqueo manual
- badge de estado de riesgo

#### Ventas

Antes de confirmar una venta a credito:

- panel de validacion de credito
- mostrar cupo disponible
- mostrar documentos vencidos
- si falla, modal de autorizacion supervisor

#### CxC

- filtros rapidos: `Pendientes`, `Por vencer`, `Vencidas`, `Bloqueadas`
- columnas nuevas: vencimiento, mora, semaforo, cupo usado

### 5. Prioridad tecnica

Esta fase corrige el mayor riesgo actual: vender a credito sin control y sin vencimiento operativo.

## Fase 2 - Cobro inteligente y documentos de ajuste

### 1. Aplicacion de pagos inteligente

Mantener dos caminos:

- abono a factura especifica
- boton `Aplicar por antiguedad` para distribuir un pago sobre varias facturas abiertas en FIFO

#### Nueva tabla sugerida: `AplicacionPago`

- `abono_id`
- `cuenta_por_cobrar_id`
- `monto_aplicado_usd`
- `orden_aplicacion`

Esto separa el recibo del reparto contable del dinero.

### 2. Anticipos y saldos a favor

El saldo a favor actual ya existe, pero debe consolidarse como documento formal:

- tipo `anticipo_cliente`
- fecha origen
- saldo disponible
- referencia de aplicacion
- historial de consumo

### 3. Notas de credito y debito

#### Nueva tabla sugerida: `DocumentoCxc`

- `cliente_id`
- `tipo_documento` (`factura`, `nota_credito`, `nota_debito`, `anticipo`)
- `documento_relacionado_id`
- `monto_usd`
- `saldo_pendiente_usd`
- `fecha_emision`
- `fecha_vencimiento`
- `estado`
- `motivo`

Si prefieren cambio menor, se puede dejar `CuentaPorCobrar` y agregar tablas separadas:

- `NotaCreditoCliente`
- `NotaDebitoCliente`

#### Reglas

- nota de credito reduce deuda por devolucion, descuento posterior o ajuste
- nota de debito aumenta deuda por mora, gastos o cheque devuelto
- toda devolucion de una venta a credito debe reflejarse en CxC mediante nota de credito o rebaja directa controlada

### 4. Endpoints a crear

- `POST /api/cuentas-por-cobrar/aplicar-pago-fifo`
- `POST /api/clientes/:id/anticipos`
- `POST /api/notas-credito`
- `POST /api/notas-debito`
- `GET /api/clientes/:id/documentos-cxc`

### 5. UI a construir

- modal de recibo con opcion `Aplicar a factura` o `Aplicar por antiguedad`
- grilla de documentos unificada con facturas, notas, anticipos y pagos
- boton `Generar nota de credito` desde devoluciones
- boton `Generar nota de debito` desde cobranza o administracion

### 6. Prioridad tecnica

Esta fase resuelve el principal hueco contable: que devoluciones y pagos afecten la deuda de forma formal y auditable.

## Fase 3 - Cobranza y analitica gerencial

### 1. Gestion de cobranza

#### Nueva tabla sugerida: `GestionCobranza`

- `cliente_id`
- `cuenta_por_cobrar_id` opcional
- `tipo_gestion` (`llamada`, `whatsapp`, `correo`, `visita`, `promesa_pago`)
- `resultado`
- `fecha_compromiso`
- `monto_compromiso_usd`
- `observacion`
- `usuario_username`
- `fecha`

### 2. Reportes

#### Antiguedad de saldo

Tramos minimos:

- por vencer
- 1 a 7 dias
- 8 a 15 dias
- 16 a 30 dias
- mas de 30 dias

#### Flujo proyectado

Basado en:

- facturas por vencer
- promesas de pago
- comportamiento historico opcional en una etapa posterior

### 3. Estado de cuenta descargable

Salida inicial recomendada:

- HTML imprimible desde Flask
- opcion a PDF del navegador
- link directo para compartir por WhatsApp

Campos minimos:

- fecha
- documento
- concepto
- cargo
- abono
- saldo
- vencimiento
- dias de mora

### 4. Endpoints a crear

- `GET /api/reportes/cxc-aging`
- `GET /api/reportes/cxc-flujo-proyectado`
- `POST /api/cobranzas/gestiones`
- `GET /api/clientes/:id/gestiones-cobranza`
- `GET /api/clientes/:id/estado-cuenta/imprimible`

### 5. UI a construir

- bandeja de cobranzas con filtros por gestor y tramo de mora
- timeline de gestiones por cliente
- dashboard de cartera con resumen vencido y proyectado
- boton `Compartir estado de cuenta`

## Orden exacto de implementacion recomendado

1. Extender modelo de `Cliente` y `CuentaPorCobrar`
2. Guardar vencimiento y snapshots de credito al crear venta
3. Crear servicio central `validar_credito_cliente(...)`
4. Integrar bloqueo y override supervisor en ventas
5. Mejorar consulta y UI de CxC con mora y vencimiento
6. Corregir devoluciones para que rebajen deuda
7. Separar recibo de caja de aplicacion por documento
8. Implementar pago FIFO sobre cartera abierta
9. Crear notas de credito y debito
10. Agregar gestiones de cobranza
11. Generar aging y flujo proyectado
12. Publicar estado de cuenta imprimible/PDF

## Archivos del sistema actual que seran clave

- `backend/models.py`
- `backend/routes/ventas.py`
- `backend/routes/cuentas_por_cobrar.py`
- `backend/routes/clientes.py`
- `backend/routes/config.py`
- `backend/cuenta_corriente_utils.py`
- `frontend/js/features/cxc/management.js`
- `frontend/js/features/ventas/checkout.js`
- `frontend/js/features/ventas/payments.js`
- `frontend/index.html`

## Recomendacion operativa inmediata

Si solo se puede hacer una sola cosa primero, hacer esta combinacion:

- vencimiento real por factura
- bloqueo automatico por mora/cupo
- ajuste de devoluciones sobre CxC

Eso por si solo reduce riesgo comercial, contable y de cobranza.
