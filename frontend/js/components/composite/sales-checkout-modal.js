(function initSalesCheckoutModalComponent() {
    const TOTALIZACION_ID = 'modalTotalizacionVenta';
    const EXCEDENTE_ID = 'modalExcedenteTotalizacion';
    const TEMPLATE = `
        <div id="modalTotalizacionVenta" class="modal">
            <div class="modal-content modal-totalizacion-venta">
                <span id="btnCerrarModalTotalizacion" class="close">&times;</span>
                <h2 style="margin-bottom: 18px;">Totalizar Venta</h2>
                <div class="datos-venta sales-panel-card sales-panel-accent modal-datos-venta">
                    <h3>Datos de la Venta</h3>
                    <div class="resumen-total sales-subcard" style="background: #e9ecef; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; font-size: 1.2em;">
                            <span><strong>Total Venta:</strong></span>
                            <span><span id="totalVentaDolares">$0.00</span> / <span id="totalVentaBs">Bs 0.00</span></span>
                        </div>
                        <div id="containerAhorroRealTime" style="display: none; justify-content: space-between; color: #28a745; margin-top: 5px; font-size: 0.95em; border-top: 1px dashed #ccc; padding-top: 5px;">
                            <span>Ahorro aplicado:</span>
                            <span id="ahorroVentaRealTime">-$0.00</span>
                        </div>
                        <div id="containerTotalAPagarRealTime" style="display: none; justify-content: space-between; font-weight: bold; font-size: 1.3em; margin-top: 5px; color: #007bff; border-top: 1px solid #ccc; padding-top: 5px;">
                            <span>TOTAL A PAGAR:</span>
                            <span id="totalAPagarRealTime">$0.00</span>
                        </div>
                    </div>
                    <div class="agregar-pago sales-subcard" style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <div class="carrito-header-inline"><h4>Agregar Pago (F4)</h4></div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px;">
                            <label for="medioPago" class="sr-only">Medio de pago</label>
                            <select id="medioPago" name="medioPago" required>
                                <option value="">Medio de pago...</option>
                                <option value="Efectivo en Dólares">💵 Efectivo en Dólares</option>
                                <option value="Efectivo en Bolívares">💶 Efectivo en Bolívares</option>
                                <option value="Tarjeta de Débito">💳 Tarjeta de Débito</option>
                                <option value="Pago Móvil">📱 Pago Móvil</option>
                                <option value="Tarjeta de Crédito">💳 Tarjeta de Crédito</option>
                                <option value="Transferencia en Bs">🏦 Transferencia en Bs</option>
                                <option value="Transferencia en Dólares">🏦 Transferencia en Dólares</option>
                            </select>
                            <label for="montoPago" class="sr-only">Monto del pago</label>
                            <input type="number" id="montoPago" name="montoPago" step="0.01" min="0" placeholder="Monto">
                            <button type="button" id="btnAgregarPago" class="btn-success" title="F9 o Enter en pago">➕ Agregar (F9)</button>
                        </div>
                    </div>
                    <div class="lista-pagos sales-subcard" style="margin-bottom: 20px;">
                        <h4>Pagos Realizados</h4>
                        <div id="listaPagos" style="max-height: 200px; overflow-y: auto;"></div>
                    </div>
                    <div class="resumen-pagos sales-subcard" style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div><small>Pagado en $:</small><strong id="totalPagadoDolares">$0.00</strong></div>
                            <div><small>Pagado en Bs:</small><strong id="totalPagadoBs">Bs 0.00</strong></div>
                            <div><small>Pendiente $:</small><strong id="pendienteDolares" style="color: #dc3545;">$0.00</strong></div>
                            <div><small>Pendiente Bs:</small><strong id="pendienteBs" style="color: #dc3545;">Bs 0.00</strong></div>
                        </div>
                    </div>
                    <div id="panelSaldoFavorCliente" class="sales-subcard" style="background: #fff8e1; padding: 12px; border-radius: 10px; margin-bottom: 20px; display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <strong>Saldo a favor del cliente</strong>
                            <label style="display: inline-flex; align-items: center; gap: 6px;"><input type="checkbox" id="usarSaldoFavorVenta" name="usarSaldoFavorVenta">Aplicar manualmente</label>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                            <div><small>Disponible:</small><strong id="saldoFavorDisponibleVenta">$0.00</strong></div>
                            <div><small>A aplicar:</small><label for="montoSaldoFavorVenta" class="sr-only">Monto a aplicar del saldo a favor</label><input type="number" id="montoSaldoFavorVenta" name="montoSaldoFavorVenta" step="0.01" min="0" value="0"></div>
                        </div>
                    </div>
                    <div id="panelCreditoCliente" class="sales-subcard" style="background: #eef7ff; padding: 12px; border-radius: 10px; margin-bottom: 20px; display: none;">
                        <div style="display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: center;">
                            <strong>Credito y excedente</strong>
                            <span id="tipoVentaPreview" style="font-weight: bold; color: #0d6efd;">Contado</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                            <div><small>Saldo pendiente:</small><strong id="saldoPendienteCreditoPreview">$0.00</strong></div>
                            <div><small>Excedente a favor:</small><strong id="saldoFavorGeneradoPreview">$0.00</strong></div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" id="btnProcesarVenta" class="btn-success" title="F10 o Ctrl+Enter" disabled>✅ Procesar Venta (F10)</button>
                        <button type="button" id="btnLimpiarVenta" class="btn-secondary" title="Ctrl+Supr">🗑️ Limpiar Todo (Ctrl+Supr)</button>
                    </div>
                </div>
            </div>
        </div>
        <div id="modalExcedenteTotalizacion" class="modal">
            <div class="modal-content modal-small modal-excedente-totalizacion">
                <span id="btnCerrarModalExcedenteTotalizacion" class="close">&times;</span>
                <div class="modal-excedente-badge">Excedente detectado</div>
                <h2>Saldo a favor o vuelto</h2>
                <p class="modal-excedente-texto">El cliente tiene un excedente de <strong id="modalExcedenteTotalizacionMonto">$0.00</strong>.</p>
                <p class="modal-excedente-ayuda">Puede guardarlo como saldo a favor o gestionar el vuelto ahora mismo.</p>
                <div class="modal-excedente-acciones">
                    <button id="btnAceptarExcedenteSaldoFavor" class="btn-primary">Guardar saldo a favor</button>
                    <button id="btnGestionarExcedenteVuelto" class="btn-secondary">Gestionar vuelto</button>
                </div>
            </div>
        </div>
    `;

    function ensureRendered() {
        let modal = document.getElementById(TOTALIZACION_ID);
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', TEMPLATE);
            modal = document.getElementById(TOTALIZACION_ID);
        }
        return {
            totalizacion: document.getElementById(TOTALIZACION_ID),
            excedente: document.getElementById(EXCEDENTE_ID)
        };
    }

    window.SalesCheckoutModalComponent = { ensureRendered };
})();
