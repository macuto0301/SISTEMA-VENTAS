(function initSaleSuccessModalComponent() {
    const MODAL_ID = 'modalVuelto';
    const TEMPLATE = `
        <div id="modalVuelto" class="modal">
            <div class="modal-content modal-small">
                <span id="btnCerrarModalVuelto" class="close">&times;</span>
                <h2>✅ Venta Procesada</h2>
                <div id="vueltoInfo" class="vuelto-info"></div>
                <button id="btnAceptarModalVuelto" class="btn-primary" title="F10 o Enter" style="width: 100%; padding: 12px; font-size: 1.1em;">Aceptar (F10)</button>
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

    window.SaleSuccessModalComponent = { ensureRendered };
})();
