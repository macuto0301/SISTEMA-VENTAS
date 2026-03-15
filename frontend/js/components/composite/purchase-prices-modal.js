(function initPurchasePricesModalComponent() {
    const MODAL_ID = 'modalCompraPrecios';
    const TEMPLATE = `
        <div id="modalCompraPrecios" class="modal">
            <div class="modal-content" style="max-width: 720px;">
                <span id="btnCerrarModalPreciosCompra" class="close">&times;</span>
                <h3 style="margin-bottom: 8px;">Actualizar precios</h3>
                <p style="margin: 0 0 18px 0; color: #64748b;">Ajusta el costo y los precios de venta del producto agregado a la compra.</p>
                <input type="hidden" id="compraPrecioIndex" name="compraPrecioIndex">
                <div style="margin-bottom: 16px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <strong id="compraPrecioProductoNombre">Producto</strong>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px;">
                    <div>
                        <label for="compraPrecioCostoModal" style="font-weight: bold; display: block; margin-bottom: 5px;">Costo ($):</label>
                        <input type="number" id="compraPrecioCostoModal" step="0.01" min="0" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraPrecioCostoModal">
                    </div>
                    <div>
                        <label for="compraPrecioBolivaresModal" style="font-weight: bold; display: block; margin-bottom: 5px;">Precio en Bs:</label>
                        <input type="number" id="compraPrecioBolivaresModal" step="0.01" min="0" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraPrecioBolivaresModal">
                    </div>
                    <div>
                        <label for="compraMetodoRedondeoModal" style="font-weight: bold; display: block; margin-bottom: 5px;">Redondeo:</label>
                        <select id="compraMetodoRedondeoModal" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraMetodoRedondeoModal">
                            <option value="none">Sin Redondeo</option>
                            <option value="no_decimals">Sin Decimales</option>
                            <option value="five_cents">Cinco céntimos (0.05)</option>
                            <option value="unit_up">Unidad Superior</option>
                            <option value="five_units">Cinco Unidades (5.00)</option>
                            <option value="ten_up">Decena Superior (10.00)</option>
                            <option value="hundred_up">Centena Superior (100.00)</option>
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 18px;">
                    <div>
                        <label for="compraPorcentajeGanancia1Modal" style="font-weight: bold; display: block; margin-bottom: 5px;">% Ganancia P1:</label>
                        <input type="number" id="compraPorcentajeGanancia1Modal" step="0.0001" min="0" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraPorcentajeGanancia1Modal">
                    </div>
                    <div>
                        <label for="compraPrecioDolares1Modal" style="font-weight: bold; display: block; margin-bottom: 5px;">Precio Venta P1 ($):</label>
                        <input type="number" id="compraPrecioDolares1Modal" step="0.01" min="0" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraPrecioDolares1Modal">
                    </div>
                    <div>
                        <label for="compraPorcentajeGanancia2Modal" style="font-weight: bold; display: block; margin-bottom: 5px;">% Ganancia P2:</label>
                        <input type="number" id="compraPorcentajeGanancia2Modal" step="0.0001" min="0" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraPorcentajeGanancia2Modal">
                    </div>
                    <div>
                        <label for="compraPrecioDolares2Modal" style="font-weight: bold; display: block; margin-bottom: 5px;">Precio Venta P2 ($):</label>
                        <input type="number" id="compraPrecioDolares2Modal" step="0.01" min="0" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraPrecioDolares2Modal">
                    </div>
                    <div>
                        <label for="compraPorcentajeGanancia3Modal" style="font-weight: bold; display: block; margin-bottom: 5px;">% Ganancia P3:</label>
                        <input type="number" id="compraPorcentajeGanancia3Modal" step="0.0001" min="0" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraPorcentajeGanancia3Modal">
                    </div>
                    <div>
                        <label for="compraPrecioDolares3Modal" style="font-weight: bold; display: block; margin-bottom: 5px;">Precio Venta P3 ($):</label>
                        <input type="number" id="compraPrecioDolares3Modal" step="0.01" min="0" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="compraPrecioDolares3Modal">
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button type="button" id="btnCancelarPreciosCompra" class="btn-secondary">Cancelar</button>
                    <button type="button" id="btnGuardarPreciosCompra" class="btn-primary">Aplicar precios</button>
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

    window.PurchasePricesModalComponent = { ensureRendered };
})();
