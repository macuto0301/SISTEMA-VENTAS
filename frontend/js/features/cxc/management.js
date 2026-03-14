const CxcFeature = {
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
        const inputId = document.getElementById('clienteCuentaPorCobrar');
        const inputNombre = document.getElementById('clienteCuentaPorCobrarNombre');
        if (!inputId || !inputNombre) return;

        const clientePreseleccionado = String(options.clienteId || inputId.value || '');
        const cliente = window.clientes.find(item => String(item.id) === clientePreseleccionado);

        if (cliente) {
            inputId.value = String(cliente.id);
            inputNombre.value = `${cliente.nombre}${cliente.documento ? ` - ${cliente.documento}` : ''}`;
            await this.cargarEstadoCuentaClienteSeleccionado(cliente.id);
        } else {
            inputId.value = '';
            inputNombre.value = '';
            window.AppState.cuentasPorCobrar = [];
            window.AppState.estadoCuentaClienteActual = null;
            window.cuentasPorCobrar = window.AppState.cuentasPorCobrar;
            this.renderDetalleCuentaCliente();
        }
    },

    async cargarEstadoCuentaClienteSeleccionado(clienteId = null) {
        const inputId = document.getElementById('clienteCuentaPorCobrar');
        const inputNombre = document.getElementById('clienteCuentaPorCobrarNombre');
        const id = clienteId || inputId?.value;
        if (!id) {
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
            }
            window.AppState.estadoCuentaClienteActual = estado;
            window.AppState.cuentasPorCobrar = estado.cuentas_por_cobrar || [];
            window.cuentasPorCobrar = window.AppState.cuentasPorCobrar;
            this.renderDetalleCuentaCliente();
        } catch (e) {
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
        const modal = document.getElementById('modalBuscarClienteCxc');
        const input = document.getElementById('buscarClienteCxcModal');
        if (input) input.value = '';

        try {
            const response = await window.ApiService.cargarClientes({ page: 1, pageSize: 200, search: '' });
            window.AppState.clientesCxcBusqueda = response.items || [];
        } catch (e) {
            window.AppState.clientesCxcBusqueda = [...window.clientes];
        }

        this.renderListaBusquedaClienteCxc();
        if (modal) modal.style.display = 'block';
        if (input) setTimeout(() => input.focus(), 60);
    },

    cerrarModalBuscarClienteCxc() {
        const modal = document.getElementById('modalBuscarClienteCxc');
        if (modal) modal.style.display = 'none';
    },

    renderListaBusquedaClienteCxc() {
        const contenedor = document.getElementById('listaBusquedaClienteCxc');
        const termino = (document.getElementById('buscarClienteCxcModal')?.value || '').trim().toLowerCase();
        if (!contenedor) return;

        const lista = this.obtenerClientesConCuentaCorriente().filter(cliente => {
            if (!termino) return true;
            return [cliente.nombre, cliente.documento, cliente.telefono, cliente.email]
                .some(valor => String(valor || '').toLowerCase().includes(termino));
        });

        if (!lista.length) {
            contenedor.innerHTML = '<div class="mensaje-vacio">No hay clientes para mostrar.</div>';
            return;
        }

        contenedor.innerHTML = lista.map(cliente => `
            <button type="button" onclick="window.CxcFeature?.seleccionarClienteCxc?.(${cliente.id})" style="width: 100%; text-align: left; border: 1px solid #e6e6e6; background: white; border-radius: 10px; padding: 14px; margin-bottom: 10px; cursor: pointer;">
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
        const inputId = document.getElementById('clienteCuentaPorCobrar');
        const inputNombre = document.getElementById('clienteCuentaPorCobrarNombre');
        if (inputId) inputId.value = '';
        if (inputNombre) inputNombre.value = '';
        window.AppState.clientesCxcBusqueda = [];
        window.AppState.estadoCuentaClienteActual = null;
        window.AppState.cuentasPorCobrar = [];
        window.cuentasPorCobrar = [];
        this.renderDetalleCuentaCliente();
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
        resumen.innerHTML = `
            <div style="background: #eef7ff; border-radius: 12px; padding: 14px;">
                <div style="display:flex; gap:12px; align-items:center;">
                    ${this.renderAvatarCliente(cliente, 'cliente-seleccionado-avatar')}
                    <div>
                        <small style="display:block; color:#5b6470; margin-bottom:4px;">Cliente</small>
                        <strong>${cliente.nombre}</strong><br>
                        <small>${cliente.documento || 'Sin documento'}</small>
                    </div>
                </div>
            </div>
            <div style="background: #fff6e8; border-radius: 12px; padding: 14px;">
                <small style="display:block; color:#5b6470; margin-bottom:4px;">Total por cobrar</small>
                <strong>$${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}</strong>
            </div>
            <div style="background: #eefbf3; border-radius: 12px; padding: 14px;">
                <small style="display:block; color:#5b6470; margin-bottom:4px;">Saldo a favor</small>
                <strong>$${(cliente.saldo_a_favor_usd || 0).toFixed(2)}</strong>
            </div>
        `;

        if (!transacciones.length && !cuentas.length) {
            detalle.innerHTML = '<div class="mensaje-vacio">Este cliente no tiene transacciones en cuentas por cobrar.</div>';
            return;
        }

        const cuentasHtml = cuentas.map(cuenta => `
            <div style="background:white; border:1px solid #e6e6e6; border-left:4px solid ${cuenta.estado === 'pagada' ? '#198754' : '#dc3545'}; border-radius:10px; padding:14px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:8px;">
                    <strong>Factura / Venta #${cuenta.numero_venta || cuenta.venta_id}</strong>
                    <span style="text-transform:capitalize; color:#5b6470;">${cuenta.estado}</span>
                </div>
                <div style="font-size:0.92em; color:#5b6470; margin-bottom:10px;">Emitida: ${cuenta.fecha_emision || 'Sin fecha'}</div>
                <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:10px; margin-bottom:12px;">
                    <div><small>Original</small><br><strong>$${(cuenta.monto_original_usd || 0).toFixed(2)}</strong></div>
                    <div><small>Abonado</small><br><strong>$${(cuenta.monto_abonado_usd || 0).toFixed(2)}</strong></div>
                    <div><small>Pendiente</small><br><strong>$${(cuenta.saldo_pendiente_usd || 0).toFixed(2)}</strong></div>
                </div>
                <div class="producto-acciones">
                    <button class="btn-success" onclick="window.CxcFeature?.registrarAbonoCuentaPrompt?.(${cuenta.id})">💵 Abonar</button>
                </div>
            </div>
        `).join('');

        const transaccionesHtml = transacciones.map(transaccion => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${transaccion.fecha || ''}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${transaccion.tipo || ''}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${transaccion.descripcion || ''}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(transaccion.cargo_usd || 0).toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(transaccion.abono_usd || 0).toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${transaccion.saldo_documento_usd === null || transaccion.saldo_documento_usd === undefined ? '-' : `$${Number(transaccion.saldo_documento_usd).toFixed(2)}`}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${transaccion.estado || ''}</td>
            </tr>
        `).join('');

        detalle.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h3 style="margin-bottom: 10px;">Documentos pendientes</h3>
                ${cuentasHtml || '<div class="mensaje-vacio">No hay cuentas registradas.</div>'}
            </div>
            <div>
                <h3 style="margin-bottom: 10px;">Transacciones del cliente</h3>
                <div style="overflow-x:auto; background:white; border:1px solid #e6e6e6; border-radius:12px;">
                    <table style="width:100%; border-collapse:collapse; min-width: 820px;">
                        <thead>
                            <tr style="background:#f8fafc; text-align:left;">
                                <th style="padding: 10px; border-bottom: 1px solid #eee;">Fecha</th>
                                <th style="padding: 10px; border-bottom: 1px solid #eee;">Tipo</th>
                                <th style="padding: 10px; border-bottom: 1px solid #eee;">Descripción</th>
                                <th style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Debe</th>
                                <th style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Abono</th>
                                <th style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Saldo Doc.</th>
                                <th style="padding: 10px; border-bottom: 1px solid #eee;">Estado</th>
                            </tr>
                        </thead>
                        <tbody>${transaccionesHtml}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    registrarAbonoCuentaPrompt(cuentaId) {
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
        document.getElementById('modalAbonoCuenta').style.display = 'block';
    },

    cerrarModalAbonoCuenta() {
        document.getElementById('modalAbonoCuenta').style.display = 'none';
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
