(function initProviderModalComponent() {
    const MODAL_ID = 'modalProveedor';
    const TEMPLATE = `
        <div id="modalProveedor" class="modal">
            <div class="modal-content" style="max-width: 450px;">
                <span id="btnCerrarModalProveedor" class="close">&times;</span>
                <h2 id="modalTituloProveedor" style="text-align: center; margin-bottom: 20px;">➕ Nuevo Proveedor</h2>
                <input type="hidden" id="proveedorId" value="-1" name="proveedorId">
                <div style="margin-bottom: 12px;">
                    <label for="proveedorNombre" style="font-weight: bold; display: block; margin-bottom: 5px;">Nombre:</label>
                    <input type="text" id="proveedorNombre" placeholder="Nombre del proveedor" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="proveedorNombre">
                </div>
                <div style="margin-bottom: 12px;">
                    <label for="proveedorRif" style="font-weight: bold; display: block; margin-bottom: 5px;">RIF:</label>
                    <input type="text" id="proveedorRif" placeholder="J-12345678-9" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="proveedorRif">
                </div>
                <div style="margin-bottom: 12px;">
                    <label for="proveedorTelefono" style="font-weight: bold; display: block; margin-bottom: 5px;">Telefono:</label>
                    <input type="text" id="proveedorTelefono" placeholder="0412-1234567" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="proveedorTelefono">
                </div>
                <div style="margin-bottom: 12px;">
                    <label for="proveedorEmail" style="font-weight: bold; display: block; margin-bottom: 5px;">Email:</label>
                    <input type="email" id="proveedorEmail" placeholder="correo@ejemplo.com" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px;" name="proveedorEmail">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="proveedorDireccion" style="font-weight: bold; display: block; margin-bottom: 5px;">Direccion:</label>
                    <textarea id="proveedorDireccion" rows="2" placeholder="Direccion del proveedor" style="width: 100%; padding: 10px; font-size: 1em; border: 1px solid #ccc; border-radius: 5px; resize: vertical;" name="proveedorDireccion"></textarea>
                </div>
                <div style="text-align: right; border-top: 1px solid #eee; padding-top: 15px;">
                    <button id="btnCancelarProveedor" class="btn-secondary">Cancelar</button>
                    <button id="btnGuardarProveedor" class="btn-primary">💾 Guardar</button>
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

    window.ProviderModalComponent = { ensureRendered };
})();
