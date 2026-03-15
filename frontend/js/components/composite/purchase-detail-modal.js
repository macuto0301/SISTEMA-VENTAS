(function initPurchaseDetailModalComponent() {
    const MODAL_ID = 'modalDetalleCompra';
    const TEMPLATE = `
        <div id="modalDetalleCompra" class="modal">
            <div class="modal-content" style="max-width: 600px;">
                <span id="btnCerrarModalDetalleCompra" class="close">&times;</span>
                <h2 style="text-align: center; margin-bottom: 20px;">📋 Detalle de Compra</h2>
                <div id="detalleCompraInfo" style="margin-bottom: 15px; padding: 15px; background: #f5f5f5; border-radius: 8px;"></div>
                <div id="detalleCompraTabla" style="max-height: 300px; overflow-y: auto;"></div>
                <div style="text-align: right; margin-top: 15px;">
                    <button id="btnCerrarDetalleCompra" class="btn-secondary">Cerrar</button>
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

    window.PurchaseDetailModalComponent = { ensureRendered };
})();
