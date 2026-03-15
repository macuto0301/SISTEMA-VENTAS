const CxcFeature = {
    _clientPicker: null,
    _searchModal: null,
    _abonoModal: null,
    _searchEventsBound: false,
    _detailEventsBound: false,

    inicializarComponentesCxc() {
        if (!this._clientPicker && window.SVEntityPicker && document.getElementById('clienteCxcPicker')) {
            this._clientPicker = window.SVEntityPicker.enhance('clienteCxcPicker', {
                inputSelector: '#clienteCuentaPorCobrarNombre',
                clearSelector: '#btnLimpiarClienteCxc',
                detailSelector: '#clienteCxcSeleccionadoCard',
                statusSelector: '[data-role="status"]',
                defaultLabel: 'Seleccione un cliente...',
                emptyStatus: 'Sin cliente seleccionado',
                emptyActionLabel: 'Limpiar',
                clearLabel: 'Limpiar',
                getLabel: cliente => `${cliente.nombre}${cliente.documento ? ` - ${cliente.documento}` : ''}`,
                getStatus: cliente => cliente.documento || 'Cliente con cuenta corriente',
                renderDetail: cliente => `
                    ${this.renderAvatarCliente(cliente, 'cliente-seleccionado-avatar')}
                    <div class="cliente-seleccionado-info">
                        <strong>${this.escaparHtml(cliente.nombre || 'Cliente')}</strong>
                        <small>Favor $${(cliente.saldo_a_favor_usd || 0).toFixed(2)} · CxC $${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}</small>
                    </div>
                `
            });
        }

        if (!this._searchModal && window.SVModal) {
            this._searchModal = window.SVModal.enhance('modalBuscarClienteCxc', {
                closeSelector: '#btnCerrarModalBuscarClienteCxc'
            });
        }

        if (!this._abonoModal && window.SVModal) {
            this._abonoModal = window.SVModal.enhance('modalAbonoCuenta', {
                closeSelector: '#btnCerrarModalAbonoCuenta'
            });
        }

        this.registrarEventosBusquedaCxc();
        this.registrarEventosDetalleCxc();
    },

    registrarEventosBusquedaCxc() {
        if (this._searchEventsBound) return;

        const list = document.getElementById('listaBusquedaClienteCxc');
        const closeButton = document.getElementById('btnCerrarBuscarClienteCxc');

        list?.addEventListener('click', event => {
            const button = event.target.closest('[data-cxc-client-id]');
            if (!button) return;
            const clientId = Number(button.dataset.cxcClientId);
            if (Number.isInteger(clientId) && clientId > 0) {
                this.seleccionarClienteCxc(clientId);
            }
        });

        closeButton?.addEventListener('click', () => this.cerrarModalBuscarClienteCxc());

        this._searchEventsBound = true;
    },

    registrarEventosDetalleCxc() {
        if (this._detailEventsBound) return;

        const detalle = document.getElementById('detalleCuentaClienteSeleccionado');
        const usarSaldo = document.getElementById('abonoUsarSaldoFavor');
        const montoSaldo = document.getElementById('abonoMontoSaldoFavor');
        const moneda = document.getElementById('abonoMoneda');
        const monto = document.getElementById('abonoMonto');
        const usarTasaSistema = document.getElementById('abonoUsarTasaSistema');
        const tasaUsada = document.getElementById('abonoTasaUsada');

        detalle?.addEventListener('click', event => {
            const button = event.target.closest('[data-cxc-action="abono"]');
            if (!button) return;
            const cuentaId = Number(button.dataset.cuentaId);
            if (Number.isInteger(cuentaId) && cuentaId > 0) {
                this.registrarAbonoCuentaPrompt(cuentaId);
            }
        });

        usarSaldo?.addEventListener('change', () => this.toggleModoAbonoCuenta());
        montoSaldo?.addEventListener('input', () => this.actualizarResumenAbonoCuenta());
        moneda?.addEventListener('change', () => {
            this.toggleMonedaAbonoCuenta();
            this.actualizarResumenAbonoCuenta();
        });
        monto?.addEventListener('input', () => this.actualizarResumenAbonoCuenta());
        usarTasaSistema?.addEventListener('change', () => this.toggleTasaAbonoCuenta());
        tasaUsada?.addEventListener('input', () => this.actualizarResumenAbonoCuenta());

        this._detailEventsBound = true;
    },

    escaparHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    renderAvatarCliente(cliente, className = 'cliente-card-avatar') {
        if (typeof window.renderAvatarCliente === 'function') {
            return window.renderAvatarCliente(cliente, className);
        }
        return window.ClientesMediaFeature?.renderAvatarCliente?.(cliente, className) || `<div class="${className}">CL</div>`;
    },

    async cargarClientesSeguras() {
        if (typeof window.cargarClientes === 'function') {
            return window.cargarClientes();
        }
        return window.ClientesFeature?.cargarClientes?.();
    },

    async cargarDatosVentasSeguras() {
        if (typeof window.cargarDatosVentas === 'function') {
            return window.cargarDatosVentas();
        }
        return window.VentasDataFeature?.cargarDatosVentas?.();
    },

    async cargarCuentasPorCobrar(options = {}) {
        this.inicializarComponentesCxc();
        const inputId = document.getElementById('clienteCuentaPorCobrar');
        const inputNombre = document.getElementById('clienteCuentaPorCobrarNombre');
        if (!inputId || !inputNombre) return;

        const clientePreseleccionado = String(options.clienteId || inputId.value || '');
        const cliente = window.clientes.find(item => String(item.id) === clientePreseleccionado);

        if (cliente) {
            inputId.value = String(cliente.id);
            inputNombre.value = `${cliente.nombre}${cliente.documento ? ` - ${cliente.documento}` : ''}`;
            this._clientPicker?.setEntity(cliente);
            await this.cargarEstadoCuentaClienteSeleccionado(cliente.id);
        } else {
            inputId.value = '';
            inputNombre.value = '';
            this._clientPicker?.setEntity(null);
            window.AppState.cuentasPorCobrar = [];
            window.AppState.estadoCuentaClienteActual = null;
            window.cuentasPorCobrar = window.AppState.cuentasPorCobrar;
            this.renderDetalleCuentaCliente();
        }
    },

    async cargarEstadoCuentaClienteSeleccionado(clienteId = null) {
        this.inicializarComponentesCxc();
        const inputId = document.getElementById('clienteCuentaPorCobrar');
        const inputNombre = document.getElementById('clienteCuentaPorCobrarNombre');
        const id = clienteId || inputId?.value;
        if (!id) {
            this._clientPicker?.setEntity(null);
            window.AppState.cuentasPorCobrar = [];
            window.AppState.estadoCuentaClienteActual = null;
            window.cuentasPorCobrar = [];
            this.renderDetalleCuentaCliente();
            return;
        }

        try {
            const estado = await window.ApiService.obtenerEstadoCuentaCliente(id);
            if (inputId) inputId.value = String(id);
            if (inputNombre) {
                const cliente = estado?.cliente;
                inputNombre.value = cliente ? `${cliente.nombre}${cliente.documento ? ` - ${cliente.documento}` : ''}` : '';
                this._clientPicker?.setEntity(cliente || null);
            }
            window.AppState.estadoCuentaClienteActual = estado;
            window.AppState.cuentasPorCobrar = estado.cuentas_por_cobrar || [];
            window.cuentasPorCobrar = window.AppState.cuentasPorCobrar;
            this.renderDetalleCuentaCliente();
        } catch (e) {
            this._clientPicker?.setEntity(null);
            window.AppState.estadoCuentaClienteActual = null;
            window.AppState.cuentasPorCobrar = [];
            window.cuentasPorCobrar = [];
            this.renderDetalleCuentaCliente('❌ No se pudo cargar el estado de cuenta del cliente.');
        }
    },

    obtenerClientesConCuentaCorriente() {
        const listaBase = (window.AppState.clientesCxcBusqueda && window.AppState.clientesCxcBusqueda.length)
            ? window.AppState.clientesCxcBusqueda
            : window.clientes;
        return [...listaBase].sort((a, b) => {
            const totalA = (a.saldo_por_cobrar_usd || 0) + (a.saldo_a_favor_usd || 0);
            const totalB = (b.saldo_por_cobrar_usd || 0) + (b.saldo_a_favor_usd || 0);
            if (totalB !== totalA) return totalB - totalA;
            return String(a.nombre || '').localeCompare(String(b.nombre || ''));
        });
    },

    async abrirModalBuscarClienteCxc() {
        this.inicializarComponentesCxc();
        const input = document.getElementById('buscarClienteCxcModal');
        if (input) input.value = '';

        try {
            const response = await window.ApiService.cargarClientes({ page: 1, pageSize: 200, search: '' });
            window.AppState.clientesCxcBusqueda = response.items || [];
        } catch (e) {
            window.AppState.clientesCxcBusqueda = [...window.clientes];
        }

        this.renderListaBusquedaClienteCxc();
        this._searchModal?.open();
        if (input) setTimeout(() => input.focus(), 60);
    },

    cerrarModalBuscarClienteCxc() {
        this.inicializarComponentesCxc();
        this._searchModal?.close();
    },

    renderListaBusquedaClienteCxc() {
        this.inicializarComponentesCxc();
        const contenedor = document.getElementById('listaBusquedaClienteCxc');
        const termino = (document.getElementById('buscarClienteCxcModal')?.value || '').trim().toLowerCase();
        if (!contenedor) return;

        const lista = this.obtenerClientesConCuentaCorriente().filter(cliente => {
            if (!termino) return true;
            return [cliente.nombre, cliente.documento, cliente.telefono, cliente.email]
                .some(valor => String(valor || '').toLowerCase().includes(termino));
        });

        if (!lista.length) {
            contenedor.innerHTML = window.SVEmptyState?.createHtml({
                icon: '::',
                title: 'No hay clientes para mostrar',
                description: 'Prueba con otro nombre, documento o telefono.'
            }) || '<div class="mensaje-vacio">No hay clientes para mostrar.</div>';
            return;
        }

        contenedor.innerHTML = lista.map(cliente => `
            <button type="button" data-cxc-client-id="${cliente.id}" style="width: 100%; text-align: left; border: 1px solid #e6e6e6; background: white; border-radius: 10px; padding: 14px; margin-bottom: 10px; cursor: pointer;">
                <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:6px;">
                    <strong>${cliente.nombre}</strong>
                    <span style="color:#5b6470;">${cliente.documento || 'Sin documento'}</span>
                </div>
                <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; font-size:0.92em; color:#334155;">
                    <div>Por cobrar: <strong>$${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}</strong></div>
                    <div>Saldo a favor: <strong>$${(cliente.saldo_a_favor_usd || 0).toFixed(2)}</strong></div>
                </div>
            </button>
        `).join('');
    },

    async seleccionarClienteCxc(clienteId) {
        this.cerrarModalBuscarClienteCxc();
        await this.cargarCuentasPorCobrar({ clienteId });
    },

    limpiarClienteCxc() {
        this.inicializarComponentesCxc();
        const inputId = document.getElementById('clienteCuentaPorCobrar');
        const inputNombre = document.getElementById('clienteCuentaPorCobrarNombre');
        if (inputId) inputId.value = '';
        if (inputNombre) inputNombre.value = '';
        this._clientPicker?.setEntity(null);
        window.AppState.clientesCxcBusqueda = [];
        window.AppState.estadoCuentaClienteActual = null;
        window.AppState.cuentasPorCobrar = [];
        window.cuentasPorCobrar = [];
        this.renderDetalleCuentaCliente();
    },

    renderResumenClienteCxc(cliente) {
        const clienteHtml = window.SVSummaryCard?.createHtml({
            variant: 'info',
            content: `
                <div class="cxc-summary-client">
                    ${this.renderAvatarCliente(cliente, 'cliente-seleccionado-avatar')}
                    <div>
                        <small class="cxc-summary-overline">Cliente</small>
                        <strong>${this.escaparHtml(cliente.nombre || 'Cliente')}</strong>
                        <small>${this.escaparHtml(cliente.documento || 'Sin documento')}</small>
                    </div>
                </div>
            `
        });

        const cobrarHtml = window.SVSummaryCard?.createHtml({
            title: 'Total por cobrar',
            value: `$${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}`,
            variant: 'warning'
        });

        const favorHtml = window.SVSummaryCard?.createHtml({
            title: 'Saldo a favor',
            value: `$${(cliente.saldo_a_favor_usd || 0).toFixed(2)}`,
            variant: 'success'
        });

        return [clienteHtml, cobrarHtml, favorHtml].join('');
    },

    renderCuentaCxc(cuenta) {
        return `
            <div class="cxc-document-card" data-status="${this.escaparHtml(cuenta.estado || 'pendiente')}">
                <div class="cxc-document-card-header">
                    <strong>Factura / Venta #${cuenta.numero_venta || cuenta.venta_id}</strong>
                    <span class="cxc-document-status">${this.escaparHtml(cuenta.estado || 'pendiente')}</span>
                </div>
                <div class="cxc-document-date">Emitida: ${this.escaparHtml(cuenta.fecha_emision || 'Sin fecha')}</div>
                <div class="cxc-document-totals">
                    <div><small>Original</small><strong>$${(cuenta.monto_original_usd || 0).toFixed(2)}</strong></div>
                    <div><small>Abonado</small><strong>$${(cuenta.monto_abonado_usd || 0).toFixed(2)}</strong></div>
                    <div><small>Pendiente</small><strong>$${(cuenta.saldo_pendiente_usd || 0).toFixed(2)}</strong></div>
                </div>
                <div class="producto-acciones">
                    <button type="button" class="btn-success" data-cxc-action="abono" data-cuenta-id="${cuenta.id}">💵 Abonar</button>
                </div>
            </div>
        `;
    },

    renderFilaTransaccionCxc(transaccion) {
        return `
            <tr>
                <td class="cxc-table-cell">${this.escaparHtml(transaccion.fecha || '')}</td>
                <td class="cxc-table-cell cxc-table-cell-strong">${this.escaparHtml(transaccion.tipo || '')}</td>
                <td class="cxc-table-cell">${this.escaparHtml(transaccion.descripcion || '')}</td>
                <td class="cxc-table-cell cxc-table-cell-right">$${(transaccion.cargo_usd || 0).toFixed(2)}</td>
                <td class="cxc-table-cell cxc-table-cell-right">$${(transaccion.abono_usd || 0).toFixed(2)}</td>
                <td class="cxc-table-cell cxc-table-cell-right">${transaccion.saldo_documento_usd === null || transaccion.saldo_documento_usd === undefined ? '-' : `$${Number(transaccion.saldo_documento_usd).toFixed(2)}`}</td>
                <td class="cxc-table-cell">${this.escaparHtml(transaccion.estado || '')}</td>
            </tr>
        `;
    },

    renderDetalleCuentaCliente(mensaje = '') {
        const resumen = document.getElementById('resumenCuentaClienteSeleccionado');
        const detalle = document.getElementById('detalleCuentaClienteSeleccionado');
        const estado = window.AppState.estadoCuentaClienteActual;

        if (!resumen || !detalle) return;

        if (!estado || !estado.cliente) {
            resumen.style.display = 'none';
            detalle.innerHTML = `<div class="mensaje-vacio">${mensaje || 'Seleccione un cliente para ver sus cuentas por cobrar y abonos.'}</div>`;
            return;
        }

        const cliente = estado.cliente;
        const transacciones = Array.isArray(estado.transacciones) ? estado.transacciones : [];
        const cuentas = Array.isArray(estado.cuentas_por_cobrar) ? estado.cuentas_por_cobrar : [];

        resumen.style.display = 'grid';
        resumen.innerHTML = this.renderResumenClienteCxc(cliente);

        if (!transacciones.length && !cuentas.length) {
            detalle.innerHTML = '<div class="mensaje-vacio">Este cliente no tiene transacciones en cuentas por cobrar.</div>';
            return;
        }

        const cuentasHtml = cuentas.map(cuenta => this.renderCuentaCxc(cuenta)).join('');

        const transaccionesHtml = transacciones.map(transaccion => this.renderFilaTransaccionCxc(transaccion)).join('');

        detalle.innerHTML = `
            <div class="cxc-detail-section">
                <h3 class="cxc-section-title">Documentos pendientes</h3>
                ${cuentasHtml || '<div class="mensaje-vacio">No hay cuentas registradas.</div>'}
            </div>
            <div class="cxc-detail-section">
                <h3 class="cxc-section-title">Transacciones del cliente</h3>
                <div class="cxc-table-shell">
                    <table class="cxc-table">
                        <thead>
                            <tr class="cxc-table-head-row">
                                <th class="cxc-table-head">Fecha</th>
                                <th class="cxc-table-head">Tipo</th>
                                <th class="cxc-table-head">Descripción</th>
                                <th class="cxc-table-head cxc-table-head-right">Debe</th>
                                <th class="cxc-table-head cxc-table-head-right">Abono</th>
                                <th class="cxc-table-head cxc-table-head-right">Saldo Doc.</th>
                                <th class="cxc-table-head">Estado</th>
                            </tr>
                        </thead>
                        <tbody>${transaccionesHtml}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    registrarAbonoCuentaPrompt(cuentaId) {
        this.inicializarComponentesCxc();
        const cuenta = window.cuentasPorCobrar.find(item => item.id === cuentaId);
        if (!cuenta) return;

        const clienteEstado = window.AppState.estadoCuentaClienteActual?.cliente || null;
        const cliente = clienteEstado && Number(clienteEstado.id) === Number(cuenta.cliente_id)
            ? clienteEstado
            : (window.clientes.find(item => Number(item.id) === Number(cuenta.cliente_id)) || clienteEstado);
        document.getElementById('abonoCuentaId').value = String(cuenta.id);
        document.getElementById('tituloModalAbonoCuenta').textContent = `Registrar Abono - Cuenta #${cuenta.id}`;
        document.getElementById('abonoCuentaResumenCliente').textContent = cuenta.cliente_nombre || cliente?.nombre || 'Cliente';
        document.getElementById('abonoCuentaResumenVenta').textContent = `Venta #${cuenta.numero_venta || cuenta.venta_id} | Estado: ${cuenta.estado}`;
        document.getElementById('abonoCuentaResumenPendiente').textContent = `$${(cuenta.saldo_pendiente_usd || 0).toFixed(2)}`;
        document.getElementById('abonoCuentaResumenFavor').textContent = `$${((cliente?.saldo_a_favor_usd) || 0).toFixed(2)}`;
        document.getElementById('abonoCuentaResumenOriginal').textContent = `$${(cuenta.monto_original_usd || 0).toFixed(2)}`;
        document.getElementById('abonoUsarSaldoFavor').checked = false;
        document.getElementById('abonoMontoSaldoFavor').value = Math.max(0, Math.min(cuenta.saldo_pendiente_usd || 0, cliente?.saldo_a_favor_usd || 0)).toFixed(2);
        document.getElementById('abonoMedioPago').value = 'Efectivo en Dólares';
        document.getElementById('abonoMoneda').value = 'USD';
        document.getElementById('abonoMonto').value = '0';
        document.getElementById('abonoUsarTasaSistema').checked = true;
        document.getElementById('abonoTasaUsada').value = window.tasaDolar.toFixed(4);
        document.getElementById('abonoObservacion').value = '';

        this.toggleModoAbonoCuenta();
        this.toggleMonedaAbonoCuenta();
        this.toggleTasaAbonoCuenta();
        this.actualizarResumenAbonoCuenta();
        this._abonoModal?.open();
    },

    cerrarModalAbonoCuenta() {
        this.inicializarComponentesCxc();
        this._abonoModal?.close();
    },

    obtenerCuentaAbonoActual() {
        const cuentaId = parseInt(document.getElementById('abonoCuentaId').value || '0', 10);
        return window.cuentasPorCobrar.find(item => item.id === cuentaId) || null;
    },

    toggleModoAbonoCuenta() {
        const usarSaldoFavor = document.getElementById('abonoUsarSaldoFavor')?.checked;
        const panelSaldo = document.getElementById('panelAbonoSaldoFavor');
        const panelNormal = document.getElementById('panelAbonoNormal');
        if (panelSaldo) panelSaldo.style.display = usarSaldoFavor ? 'block' : 'none';
        if (panelNormal) panelNormal.style.display = usarSaldoFavor ? 'none' : 'block';
        this.actualizarResumenAbonoCuenta();
    },

    toggleMonedaAbonoCuenta() {
        const moneda = document.getElementById('abonoMoneda')?.value || 'USD';
        const panelTasa = document.getElementById('panelTasaAbonoCuenta');
        if (panelTasa) panelTasa.style.display = moneda === 'BS' ? 'block' : 'none';
    },

    toggleTasaAbonoCuenta() {
        const usarSistema = document.getElementById('abonoUsarTasaSistema')?.checked;
        const inputTasa = document.getElementById('abonoTasaUsada');
        if (!inputTasa) return;
        if (usarSistema) {
            inputTasa.value = window.tasaDolar.toFixed(4);
            inputTasa.setAttribute('disabled', 'disabled');
        } else {
            inputTasa.removeAttribute('disabled');
        }
        this.actualizarResumenAbonoCuenta();
    },

    actualizarResumenAbonoCuenta() {
        const cuenta = this.obtenerCuentaAbonoActual();
        if (!cuenta) return;

        const clienteEstado = window.AppState.estadoCuentaClienteActual?.cliente || null;
        const cliente = clienteEstado && Number(clienteEstado.id) === Number(cuenta.cliente_id)
            ? clienteEstado
            : (window.clientes.find(item => Number(item.id) === Number(cuenta.cliente_id)) || clienteEstado);
        const usarSaldoFavor = document.getElementById('abonoUsarSaldoFavor')?.checked;
        let equivalenteUsd = 0;

        if (usarSaldoFavor) {
            const disponible = parseFloat(cliente?.saldo_a_favor_usd || 0) || 0;
            const pendiente = parseFloat(cuenta.saldo_pendiente_usd || 0) || 0;
            const inputSaldo = document.getElementById('abonoMontoSaldoFavor');
            const montoSolicitado = parseFloat(inputSaldo?.value || '0') || 0;
            const montoAplicable = Math.max(0, Math.min(montoSolicitado, disponible, pendiente));
            if (inputSaldo && Math.abs(montoAplicable - montoSolicitado) > 0.001) {
                inputSaldo.value = montoAplicable.toFixed(2);
            }
            equivalenteUsd = montoAplicable;
        } else {
            const moneda = document.getElementById('abonoMoneda')?.value || 'USD';
            const monto = parseFloat(document.getElementById('abonoMonto')?.value || '0') || 0;
            if (moneda === 'USD') {
                equivalenteUsd = monto;
            } else {
                const tasaUsada = parseFloat(document.getElementById('abonoTasaUsada')?.value || '0') || 0;
                equivalenteUsd = tasaUsada > 0 ? (monto / tasaUsada) : 0;
            }
        }

        const excedente = Math.max(0, equivalenteUsd - (parseFloat(cuenta.saldo_pendiente_usd || 0) || 0));
        const elEquivalente = document.getElementById('abonoEquivalenteUsd');
        const elExcedente = document.getElementById('abonoExcedenteFavor');
        if (elEquivalente) elEquivalente.textContent = `$${equivalenteUsd.toFixed(2)}`;
        if (elExcedente) elExcedente.textContent = `$${excedente.toFixed(2)}`;
    },

    async guardarAbonoCuentaDesdeModal() {
        const cuenta = this.obtenerCuentaAbonoActual();
        if (!cuenta) return;

        const usarSaldoFavor = document.getElementById('abonoUsarSaldoFavor')?.checked;

        try {
            if (usarSaldoFavor) {
                const montoSaldo = parseFloat(document.getElementById('abonoMontoSaldoFavor')?.value || '0') || 0;
                if (montoSaldo <= 0) {
                    window.mostrarNotificacion('❌ Debe indicar un monto valido de saldo a favor');
                    return;
                }

                await window.ApiService.registrarAbonoCuenta(cuenta.id, {
                    usar_saldo_a_favor: true,
                    monto_saldo_a_favor_usd: montoSaldo,
                    observacion: document.getElementById('abonoObservacion')?.value?.trim() || 'Aplicacion manual de saldo a favor'
                });
            } else {
                const medio = document.getElementById('abonoMedioPago')?.value || '';
                const moneda = document.getElementById('abonoMoneda')?.value || 'USD';
                const monto = parseFloat(document.getElementById('abonoMonto')?.value || '0') || 0;
                const usarSistema = document.getElementById('abonoUsarTasaSistema')?.checked;
                const tasaUsada = moneda === 'USD' ? 1 : (parseFloat(document.getElementById('abonoTasaUsada')?.value || '0') || 0);
                const equivalenteUsd = parseFloat((document.getElementById('abonoEquivalenteUsd')?.textContent || '$0').replace('$', '')) || 0;

                if (!medio.trim()) {
                    window.mostrarNotificacion('❌ Debe seleccionar un medio de pago');
                    return;
                }
                if (monto <= 0) {
                    window.mostrarNotificacion('❌ Debe indicar un monto valido');
                    return;
                }
                if (moneda === 'BS' && tasaUsada <= 0) {
                    window.mostrarNotificacion('❌ Debe indicar una tasa valida');
                    return;
                }

                await window.ApiService.registrarAbonoCuenta(cuenta.id, {
                    medio,
                    moneda,
                    monto,
                    tasa_usada: tasaUsada,
                    origen_tasa: moneda === 'USD' ? 'sistema' : (usarSistema ? 'sistema' : 'manual'),
                    equivalente_usd: equivalenteUsd,
                    observacion: document.getElementById('abonoObservacion')?.value?.trim() || ''
                });
            }

            window.mostrarNotificacion('✅ Abono registrado');
            this.cerrarModalAbonoCuenta();
            await this.cargarClientesSeguras();
            await this.cargarCuentasPorCobrar({ clienteId: cuenta.cliente_id });
            await this.cargarDatosVentasSeguras();
        } catch (e) {
            window.mostrarNotificacion(`❌ ${e.message || 'No se pudo registrar el abono'}`);
        }
    }
};

window.CxcFeature = CxcFeature;
