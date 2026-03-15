(function initSalesSummaryModalComponent() {
    const MODAL_ID = 'modalResumenVenta';

    const TEMPLATE = `
        <div id="modalResumenVenta" class="modal">
            <div class="modal-content sales-panel-card sales-panel-accent venta-resumen-rapido" style="max-width: 680px; border-radius: 12px; max-height: 85vh; overflow-y: auto;">
                <span id="btnCerrarModalResumenVenta" class="close">&times;</span>
                <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; align-items: start; margin-top: 10px;">
                    <div>
                        <div class="pos-summary-stack">
                            <span class="pos-badge">Caja activa</span>
                            <h3>Cobro</h3>
                            <p>Valida rapidamente el estado de la venta y abre el modal de cobro cuando el carrito este listo.</p>
                        </div>
                        <div class="pos-flow">
                            <div class="pos-flow-step"><strong>1</strong><span>Busca el producto y agregalo al carrito.</span></div>
                            <div class="pos-flow-step"><strong>2</strong><span>Ajusta cantidades o elimina items desde el teclado.</span></div>
                            <div class="pos-flow-step"><strong>3</strong><span>Abre el cobro con F10 o Ctrl + Enter.</span></div>
                        </div>
                    </div>
                    <div class="atajos-panel atajos-panel-compacto" style="margin-top: 0;">
                        <div class="atajos-panel-header">
                            <strong>Atajos del POS</strong>
                            <span>Comandos rapidos de caja</span>
                        </div>
                        <div class="atajos-grid">
                            <div><kbd>F2</kbd><span>Buscar producto</span></div>
                            <div><kbd>F3</kbd><span>Ir a cliente</span></div>
                            <div><kbd>F4</kbd><span>Ir a medio de pago</span></div>
                            <div><kbd>F8</kbd><span>Ir a monto</span></div>
                            <div><kbd>F9</kbd><span>Agregar pago</span></div>
                            <div><kbd>F10</kbd><span>Abrir cobro</span></div>
                            <div><kbd>Ctrl + Enter</kbd><span>Abrir cobro</span></div>
                            <div><kbd>Esc</kbd><span>Cerrar modal</span></div>
                            <div><kbd>↑ / ↓</kbd><span>Moverse en carrito</span></div>
                            <div><kbd>+</kbd><span>Subir cantidad</span></div>
                            <div><kbd>-</kbd><span>Bajar cantidad</span></div>
                            <div><kbd>Supr</kbd><span>Eliminar producto</span></div>
                            <div><kbd>Ctrl + Supr</kbd><span>Limpiar venta</span></div>
                            <div><kbd>Enter</kbd><span>Agregar producto o pago</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    let modalApi = null;

    function ensureRendered() {
        let modal = document.getElementById(MODAL_ID);
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', TEMPLATE);
            modal = document.getElementById(MODAL_ID);
        }

        if (!modalApi && modal && window.SVModal) {
            modalApi = window.SVModal.enhance(modal, {
                closeSelector: '#btnCerrarModalResumenVenta'
            });
        }

        return modalApi;
    }

    window.VentasSummaryModalComponent = {
        ensureRendered,
        open() {
            return ensureRendered()?.open();
        },
        close() {
            return ensureRendered()?.close();
        },
        isOpen() {
            return ensureRendered()?.isOpen?.() || false;
        }
    };
})();
