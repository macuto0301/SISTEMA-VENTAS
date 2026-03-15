(function initPurchaseModalComponent() {
    const MODAL_ID = 'modalCompra';
    const TEMPLATE = `
        <div id="modalCompra" class="modal">
            <div class="modal-content">
                <span id="btnCerrarModalCompra" class="close">&times;</span>
                <h2 style="text-align: center; margin-bottom: 20px;">🛒 Nueva Compra</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label for="compraNroFactura" style="font-weight: bold; display: block; margin-bottom: 5px;">Nro. Factura:</label>
                        <input type="text" id="compraNroFactura" placeholder="Ej: FAC-001234" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraNroFactura">
                    </div>
                    <div>
                        <label for="compraFecha" style="font-weight: bold; display: block; margin-bottom: 5px;">Fecha Factura:</label>
                        <input type="date" id="compraFecha" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraFecha">
                    </div>
                    <div>
                        <label for="compraFechaLibro" style="font-weight: bold; display: block; margin-bottom: 5px;">Fecha Libro:</label>
                        <input type="date" id="compraFechaLibro" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraFechaLibro">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label for="compraProveedor" style="font-weight: bold; display: block; margin-bottom: 5px;">Proveedor:</label>
                        <select id="compraProveedor" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraProveedor">
                            <option value="">Seleccionar proveedor...</option>
                        </select>
                    </div>
                    <div>
                        <div style="font-weight: bold; display: block; margin-bottom: 5px;">Total:</div>
                        <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">
                            $ <span id="compraTotal">0.00</span>
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 15px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0;">Agregar Producto</h4>
                    <div style="position: relative;">
                        <input type="text" id="buscarProductoCompra" name="buscarProductoCompra" class="form-control" aria-label="Buscar producto para compra" placeholder="🔍 Buscar producto por nombre o código... (Ej: 5*codigo para agregar 5 unidades)" autocomplete="off" style="width: 100%; padding: 10px; font-size: 1em;">
                        <div id="sugerenciasCompra" class="sugerencias-productos" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 1000; max-height: 250px; overflow-y: auto; display: none;"></div>
                    </div>
                </div>
                <div id="listaProductosCompra" style="margin-bottom: 15px; max-height: 200px; overflow-y: auto;"></div>
                <div style="text-align: right; border-top: 1px solid #eee; padding-top: 15px;">
                    <button id="btnCancelarCompra" class="btn-secondary">Cancelar</button>
                    <button id="btnGuardarCompra" class="btn-primary">💾 Registrar Compra</button>
                </div>
            </div>
        </div>
    `;

    function ensureRendered() {
        let modal = document.getElementById(MODAL_ID);
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', TEMPLATE);
            modal = document.getElementById(MODAL_ID);
        }
        return modal;
    }

    window.PurchaseModalComponent = { ensureRendered };
})();
