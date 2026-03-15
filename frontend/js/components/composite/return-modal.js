(function initReturnModalComponent() {
    const MODAL_ID = 'modalDevolucion';
    const TEMPLATE = `
        <div id="modalDevolucion" class="modal">
            <div class="modal-content" style="max-width: 760px;">
                <span id="btnCerrarModalDevolucion" class="close">&times;</span>
                <h2 style="margin-bottom: 16px;">↩️ Registrar devolucion</h2>
                <div id="devolucionVentaInfo" style="margin-bottom: 15px; padding: 15px; background: #f5f7fb; border-radius: 8px;"></div>
                <div style="margin-bottom: 15px;">
                    <h4 style="margin-bottom: 10px;">Productos a devolver</h4>
                    <div id="devolucionProductosLista" style="max-height: 280px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #fff;"></div>
                </div>
                <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <h4 style="margin-bottom: 10px;">Entregas de reintegro</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 12px;">
                        <div>
                            <label for="devolucionMetodoReintegro" style="display: block; font-weight: bold; margin-bottom: 5px;">Metodo</label>
                            <select id="devolucionMetodoReintegro" class="form-control" name="devolucionMetodoReintegro">
                                <option value="Efectivo">Efectivo</option>
                                <option value="Pago movil">Pago movil</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Zelle">Zelle</option>
                            </select>
                        </div>
                        <div>
                            <label for="devolucionMonedaReintegro" style="display: block; font-weight: bold; margin-bottom: 5px;">Moneda</label>
                            <select id="devolucionMonedaReintegro" class="form-control" name="devolucionMonedaReintegro">
                                <option value="USD">USD</option>
                                <option value="BS">Bs</option>
                            </select>
                        </div>
                        <div>
                            <label for="devolucionTasaReintegro" style="display: block; font-weight: bold; margin-bottom: 5px;">Tasa</label>
                            <input type="number" id="devolucionTasaReintegro" class="form-control" min="0" step="0.01" name="devolucionTasaReintegro">
                        </div>
                        <div>
                            <label for="devolucionMontoReintegro" style="display: block; font-weight: bold; margin-bottom: 5px;">Monto</label>
                            <input type="number" id="devolucionMontoReintegro" class="form-control" min="0" step="0.01" name="devolucionMontoReintegro">
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <small id="devolucionVistaFormulario" style="color: #475569;">USD 0.00 equivalen a $0.00</small>
                        <button type="button" id="btnAgregarReintegroDevolucion" class="btn-secondary">➕ Agregar entrega</button>
                    </div>
                    <div id="devolucionListaReintegros" style="margin-top: 12px;"></div>
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="devolucionMotivo" style="display: block; font-weight: bold; margin-bottom: 5px;">Motivo</label>
                    <textarea id="devolucionMotivo" rows="2" class="form-control" placeholder="Motivo de la devolucion" name="devolucionMotivo"></textarea>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 15px;">
                    <div>
                        <small>Total devolucion</small><br>
                        <strong id="devolucionTotalUSD">$0.00</strong>
                    </div>
                    <div style="padding: 12px; border-radius: 8px; background: #eef6ff;">
                        <small>Reintegrado</small><br>
                        <strong id="devolucionEntregadoUSD">$0.00</strong>
                    </div>
                    <div style="padding: 12px; border-radius: 8px; background: #f4fdf6;">
                        <small>Reintegrado Bs</small><br>
                        <strong id="devolucionEntregadoBS">Bs 0.00</strong>
                    </div>
                    <div style="padding: 12px; border-radius: 8px; background: #fff7ed;">
                        <small>Diferencia</small><br>
                        <strong id="devolucionFaltanteUSD">$0.00</strong>
                    </div>
                </div>
                <div style="text-align: right; border-top: 1px solid #eee; padding-top: 15px;">
                    <button id="btnCancelarDevolucion" class="btn-secondary">Cancelar</button>
                    <button class="btn-primary" id="btnGuardarDevolucion">💾 Confirmar devolucion</button>
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

    window.ReturnModalComponent = { ensureRendered };
})();
