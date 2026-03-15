(function initChangeManagementModalComponent() {
    const MODAL_ID = 'modalGestionVuelto';
    const TEMPLATE = `
        <div id="modalGestionVuelto" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <h2 style="color: #007bff; margin-top: 0;">💰 Gestion de Vuelto Multimoneda</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; text-align: center;">
                    <div style="background: #e7f3ff; padding: 10px; border-radius: 8px;">
                        <span style="font-size: 0.8em; color: #555;">Excedente:</span><br>
                        <strong id="montoExcedenteVuelto" style="font-size: 1.1em; color: #007bff;">$0.00</strong><br>
                        <span id="montoExcedenteVueltoBs" style="font-size: 0.85em; color: #007bff; font-weight: bold;">Bs 0.00</span>
                    </div>
                    <div style="background: #e6ffed; padding: 10px; border-radius: 8px;">
                        <span style="font-size: 0.8em; color: #555;">Entregado:</span><br>
                        <strong id="montoEntregadoVuelto" style="font-size: 1.1em; color: #28a745;">$0.00</strong><br>
                        <span id="montoEntregadoVueltoBs" style="font-size: 0.85em; color: #28a745; font-weight: bold;">Bs 0.00</span>
                    </div>
                    <div style="background: #fff5f5; padding: 10px; border-radius: 8px;">
                        <span style="font-size: 0.8em; color: #555;">Faltante:</span><br>
                        <strong id="montoFaltanteVuelto" style="font-size: 1.1em; color: #dc3545;">$0.00</strong><br>
                        <span id="montoFaltanteVueltoBs" style="font-size: 0.85em; color: #dc3545; font-weight: bold;">Bs 0.00</span>
                    </div>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; border: 1px solid #eee; margin-bottom: 20px;">
                    <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 0.95em; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Anadir Entrega (F9)</h4>
                    <div style="margin-bottom: 12px;">
                        <label style="font-weight: bold; display: block; margin-bottom: 5px; font-size: 0.85em;">Moneda:</label>
                        <div style="display: flex; gap: 8px;">
                            <label style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 5px; background: white; font-size: 0.85em;">
                                <input type="radio" name="monedaVuelto" value="USD" checked> Dolares
                            </label>
                            <label style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 5px; background: white; font-size: 0.85em;">
                                <input type="radio" name="monedaVuelto" value="BS"> Bolivares
                            </label>
                        </div>
                    </div>
                    <div id="containerTasaVuelto" style="margin-bottom: 12px; display: none;">
                        <label for="tasaVuelto" style="font-weight: bold; display: block; margin-bottom: 3px; font-size: 0.85em;">Tasa USD/Bs:</label>
                        <input type="number" id="tasaVuelto" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 5px;" name="tasaVuelto">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div>
                            <label for="metodoEntregaVuelto" style="font-weight: bold; display: block; margin-bottom: 3px; font-size: 0.85em;">Metodo:</label>
                            <select id="metodoEntregaVuelto" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 5px; font-size: 0.85em;" name="metodoEntregaVuelto">
                                <option value="Efectivo">Efectivo</option>
                            </select>
                        </div>
                        <div>
                            <label for="montoEntregaVuelto" style="font-weight: bold; display: block; margin-bottom: 3px; font-size: 0.85em;">Monto:</label>
                            <input type="number" id="montoEntregaVuelto" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 5px; font-size: 0.85em;" placeholder="0.00" name="montoEntregaVuelto">
                            <div id="previewConversionVuelto" style="font-size: 0.75em; color: #666; margin-top: 3px; display: none;">Equivale a: <span id="valorequivaleUSD">$0.00</span></div>
                        </div>
                    </div>
                    <button id="btnAgregarVueltoLista" class="btn-primary" title="F9 o Enter en campos de vuelto" style="width: 100%; padding: 10px; font-size: 0.9em;">➕ Agregar a la lista</button>
                </div>
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 0.95em;">Vueltos Agregados:</h4>
                    <div id="listaVueltosAgregados" style="max-height: 150px; overflow-y: auto; background: white; border: 1px solid #eee; border-radius: 5px; padding: 5px;"></div>
                </div>
                <div style="text-align: right; border-top: 1px solid #eee; padding-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="btnFinalizarVentaSinVuelto" class="btn-secondary">No entregar vuelto</button>
                    <button id="btnConfirmarVuelto" class="btn-success" title="F10 o Ctrl+Enter">✅ Finalizar Venta (F10)</button>
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

    window.ChangeManagementModalComponent = { ensureRendered };
})();
