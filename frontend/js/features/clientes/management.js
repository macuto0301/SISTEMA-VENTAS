const ClientesFeature = {
    resetearFotosCliente(cliente = null) {
        if (typeof window.resetearFotosCliente === 'function') {
            return window.resetearFotosCliente(cliente);
        }
        return window.ClientesMediaFeature?.resetearFotosCliente?.(cliente);
    },

    construirUrlFotoCliente(path) {
        if (typeof window.construirUrlFotoCliente === 'function') {
            return window.construirUrlFotoCliente(path);
        }
        return window.ClientesMediaFeature?.construirUrlFotoCliente?.(path) || '';
    },

    renderAvatarCliente(cliente, className = 'cliente-card-avatar') {
        if (typeof window.renderAvatarCliente === 'function') {
            return window.renderAvatarCliente(cliente, className);
        }
        return window.ClientesMediaFeature?.renderAvatarCliente?.(cliente, className) || `<div class="${className}">CL</div>`;
    },

    async cargarCuentasPorCobrarSeguras(options = {}) {
        if (typeof window.cargarCuentasPorCobrar === 'function') {
            return window.cargarCuentasPorCobrar(options);
        }
        return window.CxcFeature?.cargarCuentasPorCobrar?.(options);
    },

    obtenerPaginacion(nombre) {
        if (typeof window.obtenerPaginacion === 'function') {
            return window.obtenerPaginacion(nombre);
        }
        if (window.StateCacheCore?.obtenerPaginacion) {
            return window.StateCacheCore.obtenerPaginacion(nombre);
        }
        return { page: 1, page_size: 10, total: 0, total_pages: 0, has_next: false, has_prev: false };
    },

    actualizarPaginacion(nombre, pagination) {
        if (typeof window.actualizarPaginacion === 'function') {
            window.actualizarPaginacion(nombre, pagination);
            return;
        }
        window.StateCacheCore?.actualizarPaginacion?.(nombre, pagination);
    },

    escaparHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    sincronizarBusquedaClientes(valor) {
        const input = document.getElementById('buscarCliente');
        if (input && input.value !== valor) {
            input.value = valor;
        }
    },

    construirFilasTablaClientes() {
        return (window.clientes || []).map((cliente, index) => ({
            ...cliente,
            __rowId: cliente.id || `cliente-${index}`,
            __contacto: [cliente.telefono, cliente.email].filter(Boolean).join(' | ')
        }));
    },

    async cargarClientes(options = {}) {
        const paginacionActual = this.obtenerPaginacion('clientes');
        const page = options.page || paginacionActual.page || 1;
        const pageSize = options.pageSize || paginacionActual.page_size || 10;
        const search = options.search !== undefined ? options.search : (document.getElementById('buscarCliente')?.value || '');
        const clienteCuentaSeleccionado = document.getElementById('clienteCuentaPorCobrar')?.value || '';
        const response = await window.ApiService.cargarClientes({ page, pageSize, search });
        window.AppState.clientes = response.items;
        this.actualizarPaginacion('clientes', response.pagination);
        window.clientes = window.AppState.clientes;
        this.renderSelectClientesVenta();
        this.renderClientes();
        if (document.getElementById('clienteCuentaPorCobrar')) {
            await this.cargarCuentasPorCobrarSeguras({ clienteId: clienteCuentaSeleccionado });
        }
    },

    renderSelectClientesVenta() {
        const valorActual = document.getElementById('clienteId')?.value || '';
        const input = document.getElementById('cliente');
        if (input) {
            if (valorActual) {
                const cliente = window.clientes.find(item => String(item.id) === String(valorActual));
                input.value = cliente
                    ? `${cliente.nombre}${cliente.documento ? ` - ${cliente.documento}` : ''}`
                    : 'Cliente General / Contado';
            } else {
                input.value = 'Cliente General / Contado';
            }
        }

        this.actualizarInfoClienteSeleccionado();
    },

    obtenerClienteSeleccionado() {
        const clienteId = parseInt(document.getElementById('clienteId')?.value || document.getElementById('cliente')?.value || '0', 10);
        if (!clienteId) return null;
        return window.clientes.find(cliente => cliente.id === clienteId) || null;
    },

    manejarCambioClienteVenta() {
        const hidden = document.getElementById('clienteId');
        if (!hidden) return;
        this.actualizarInfoClienteSeleccionado();
        window.actualizarListaPagos();
    },

    async abrirModalBuscarClienteVenta() {
        const modal = document.getElementById('modalBuscarClienteVenta');
        const input = document.getElementById('buscarClienteVentaModal');
        if (input) input.value = '';

        try {
            const response = await window.ApiService.cargarClientes({ page: 1, pageSize: 200, search: '' });
            window.AppState.clientesVentaBusqueda = response.items || [];
        } catch (e) {
            window.AppState.clientesVentaBusqueda = [...window.clientes];
        }

        this.renderListaBusquedaClienteVenta();
        if (modal) modal.style.display = 'block';
        if (input) setTimeout(() => input.focus(), 60);
    },

    cerrarModalBuscarClienteVenta() {
        const modal = document.getElementById('modalBuscarClienteVenta');
        if (modal) modal.style.display = 'none';
    },

    renderListaBusquedaClienteVenta() {
        const contenedor = document.getElementById('listaBusquedaClienteVenta');
        const termino = (document.getElementById('buscarClienteVentaModal')?.value || '').trim().toLowerCase();
        if (!contenedor) return;

        const listaBase = (window.AppState.clientesVentaBusqueda && window.AppState.clientesVentaBusqueda.length)
            ? window.AppState.clientesVentaBusqueda
            : window.clientes;

        const lista = listaBase.filter(cliente => {
            if (!termino) return true;
            return [cliente.nombre, cliente.documento, cliente.telefono, cliente.email]
                .some(valor => String(valor || '').toLowerCase().includes(termino));
        });

        if (!lista.length) {
            contenedor.innerHTML = '<div class="mensaje-vacio">No hay clientes para mostrar.</div>';
            return;
        }

        contenedor.innerHTML = lista.map(cliente => `
            <button type="button" onclick="window.ClientesFeature?.seleccionarClienteVenta?.(${cliente.id})" style="width: 100%; text-align: left; border: 1px solid #e6e6e6; background: white; border-radius: 10px; padding: 14px; margin-bottom: 10px; cursor: pointer;">
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

    seleccionarClienteVenta(clienteId) {
        const cliente = window.clientes.find(item => Number(item.id) === Number(clienteId))
            || window.AppState.clientesVentaBusqueda?.find(item => Number(item.id) === Number(clienteId))
            || null;
        const hidden = document.getElementById('clienteId');
        const input = document.getElementById('cliente');

        if (hidden) hidden.value = cliente ? String(cliente.id) : '';
        if (input) {
            input.value = cliente
                ? `${cliente.nombre}${cliente.documento ? ` - ${cliente.documento}` : ''}`
                : 'Cliente General / Contado';
        }

        this.cerrarModalBuscarClienteVenta();
        this.actualizarInfoClienteSeleccionado();
        window.actualizarListaPagos?.();
    },

    limpiarClienteVenta() {
        const hidden = document.getElementById('clienteId');
        const input = document.getElementById('cliente');
        if (hidden) hidden.value = '';
        if (input) input.value = 'Cliente General / Contado';
        this.actualizarInfoClienteSeleccionado();
        window.actualizarListaPagos?.();
    },

    actualizarInfoClienteSeleccionado() {
        const cliente = this.obtenerClienteSeleccionado();
        const info = document.getElementById('clienteSaldoInfo');
        const saldoDisponible = document.getElementById('saldoFavorDisponibleVenta');
        const inputSaldo = document.getElementById('montoSaldoFavorVenta');
        const panelSaldoFavor = document.getElementById('panelSaldoFavorCliente');
        const panelCredito = document.getElementById('panelCreditoCliente');
        const tarjetaCliente = document.getElementById('clienteSeleccionadoCard');

        if (saldoDisponible) {
            saldoDisponible.textContent = `$${((cliente && cliente.saldo_a_favor_usd) || 0).toFixed(2)}`;
        }

        if (!cliente) {
            if (info) info.textContent = 'Sin saldo a favor disponible.';
            if (tarjetaCliente) tarjetaCliente.innerHTML = '';
            if (panelSaldoFavor) panelSaldoFavor.style.display = 'none';
            if (panelCredito) panelCredito.style.display = 'none';
            if (inputSaldo) inputSaldo.value = '0';
            const usarSaldo = document.getElementById('usarSaldoFavorVenta');
            if (usarSaldo) usarSaldo.checked = false;
            return;
        }

        if (panelSaldoFavor) panelSaldoFavor.style.display = 'block';
        if (panelCredito) panelCredito.style.display = 'block';

        if (inputSaldo) {
            const montoActual = parseFloat(inputSaldo.value || '0') || 0;
            const saldoCliente = parseFloat(cliente.saldo_a_favor_usd || 0) || 0;
            if (montoActual > saldoCliente) {
                inputSaldo.value = saldoCliente.toFixed(2);
            }
        }

        if (info) {
            info.textContent = `Saldo a favor: $${(cliente.saldo_a_favor_usd || 0).toFixed(2)} | Por cobrar: $${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}`;
        }

        if (tarjetaCliente) {
            tarjetaCliente.innerHTML = `
                ${this.renderAvatarCliente(cliente, 'cliente-seleccionado-avatar')}
                <div class="cliente-seleccionado-info">
                    <strong>${cliente.nombre}</strong>
                    <small>${cliente.documento || 'Sin documento'}</small>
                </div>
            `;
        }
    },

    renderClientes() {
        const contenedor = document.getElementById('listaClientes');
        if (!contenedor) return;

        if (!window.SVTable) {
            contenedor.innerHTML = '<div class="mensaje-vacio">El componente de tabla no esta disponible</div>';
            return;
        }

        const paginacion = this.obtenerPaginacion('clientes');
        const busquedaActual = String(document.getElementById('buscarCliente')?.value || '').trim();
        const filas = this.construirFilasTablaClientes();

        contenedor.innerHTML = '<div id="tablaClientesGestion"></div>';

        const instanciaExistente = window.SVTable.getInstance?.('tabla-clientes-gestion');
        if (instanciaExistente) {
            instanciaExistente.state.search = busquedaActual;
            instanciaExistente.state.draftSearch = busquedaActual;
            instanciaExistente.state.page = Number(paginacion.page || 1);
        }

        window.SVTable.mount({
            id: 'tabla-clientes-gestion',
            container: 'tablaClientesGestion',
            title: 'Clientes',
            ariaLabel: 'Tabla de clientes',
            rows: filas,
            rowId: row => row.__rowId,
            exportFileName: 'clientes',
            searchPlaceholder: 'Buscar clientes por nombre, documento, telefono o correo',
            emptyState: 'No hay clientes registrados',
            pageSize: paginacion.page_size || 10,
            remotePagination: {
                enabled: true,
                page: paginacion.page || 1,
                pageSize: paginacion.page_size || 10,
                total: paginacion.total || filas.length,
                totalPages: paginacion.total_pages || 1,
                onPageChange: ({ page, pageSize, search }) => this.cargarClientes({ page, pageSize, search }),
                onPageSizeChange: ({ page, pageSize, search }) => this.cargarClientes({ page, pageSize, search }),
                onQueryChange: ({ page, pageSize, search }) => {
                    this.sincronizarBusquedaClientes(search || '');
                    this.cargarClientes({ page, pageSize, search });
                }
            },
            columns: [
                {
                    id: 'cliente',
                    label: 'Cliente',
                    key: 'nombre',
                    filterable: true,
                    render: row => `
                        <div style="display:flex; align-items:center; gap:8px; min-width:220px;">
                            ${this.renderAvatarCliente(row, 'cliente-card-avatar')}
                            <div class="sv-table-stack sv-table-stack--dense" style="min-width:0;">
                                <strong style="line-height:1.2;">${this.escaparHtml(row.nombre || 'Sin nombre')}</strong>
                                <small style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.escaparHtml(row.documento || 'Sin documento')}</small>
                            </div>
                        </div>
                    `,
                    allowHtml: true,
                    searchValue: row => `${row.nombre || ''} ${row.documento || ''}`
                },
                {
                    id: 'contacto',
                    label: 'Contacto',
                    key: '__contacto',
                    filterable: true,
                    render: row => row.__contacto || 'Sin contacto',
                    searchValue: row => `${row.telefono || ''} ${row.email || ''}`
                },
                {
                    id: 'direccion',
                    label: 'Direccion',
                    key: 'direccion',
                    filterable: true,
                    render: row => row.direccion || 'Sin direccion'
                },
                {
                    id: 'favor',
                    label: 'Saldo a favor',
                    key: 'saldo_a_favor_usd',
                    type: 'money',
                    currency: '$',
                    align: 'right',
                    filterable: true
                },
                {
                    id: 'cobrar',
                    label: 'Por cobrar',
                    key: 'saldo_por_cobrar_usd',
                    type: 'money',
                    currency: '$',
                    align: 'right',
                    filterable: true
                },
                {
                    id: 'acciones',
                    label: 'Acciones',
                    type: 'actions',
                    sortable: false,
                    searchable: false,
                    hideable: false,
                    align: 'center',
                    render: row => `
                        <div style="display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:nowrap;">
                            <button onclick="window.ClientesFeature?.editarCliente?.(${row.id})" class="btn-small" style="background:#f59e0b; color:white; min-height:30px; padding:4px 8px; font-size:12px; border-radius:10px;" title="Editar cliente">✏️</button>
                            <button onclick="window.ClientesFeature?.verEstadoCuentaCliente?.(${row.id})" class="btn-small" style="background:#2563eb; color:white; min-height:30px; padding:4px 8px; font-size:12px; border-radius:10px;" title="Estado de cuenta">📄</button>
                        </div>
                    `,
                    allowHtml: true,
                    exportable: false
                }
            ],
            bulkActions: [
                {
                    id: 'export-selected-csv',
                    label: 'Exportar seleccion CSV',
                    handler: () => window.SVTable.exportSelected('tabla-clientes-gestion', 'csv')
                },
                {
                    id: 'clear-selection',
                    label: 'Limpiar seleccion',
                    handler: () => window.SVTable.clearSelection('tabla-clientes-gestion')
                }
            ]
        });
    },

    abrirModalCliente(clienteId = null, seleccionarDespues = false) {
        const cliente = clienteId ? window.clientes.find(item => item.id === clienteId) : null;
        document.getElementById('modalClienteId').value = cliente ? cliente.id : -1;
        document.getElementById('modalClienteSeleccionarDespues').value = seleccionarDespues ? 'true' : 'false';
        document.getElementById('modalTituloCliente').textContent = cliente ? '✏️ Editar Cliente' : '👥 Nuevo Cliente';
        document.getElementById('clienteNombreModal').value = cliente ? cliente.nombre || '' : '';
        document.getElementById('clienteDocumentoModal').value = cliente ? cliente.documento || '' : '';
        document.getElementById('clienteTelefonoModal').value = cliente ? cliente.telefono || '' : '';
        document.getElementById('clienteEmailModal').value = cliente ? cliente.email || '' : '';
        document.getElementById('clienteDireccionModal').value = cliente ? cliente.direccion || '' : '';
        this.resetearFotosCliente(cliente);
        document.getElementById('modalCliente').style.display = 'block';
    },

    cerrarModalCliente() {
        this.resetearFotosCliente(null);
        document.getElementById('modalCliente').style.display = 'none';
    },

    crearClienteRapidoDesdeVenta(seleccionarDespues = true) {
        this.abrirModalCliente(null, seleccionarDespues);
    },

    async guardarClienteDesdeModal() {
        const id = parseInt(document.getElementById('modalClienteId').value || '-1', 10);
        const seleccionarDespues = document.getElementById('modalClienteSeleccionarDespues').value === 'true';
        const payload = new FormData();
        payload.append('nombre', document.getElementById('clienteNombreModal').value.trim());
        payload.append('documento', document.getElementById('clienteDocumentoModal').value.trim());
        payload.append('telefono', document.getElementById('clienteTelefonoModal').value.trim());
        payload.append('email', document.getElementById('clienteEmailModal').value.trim());
        payload.append('direccion', document.getElementById('clienteDireccionModal').value.trim());
        payload.append('remove_foto_perfil', document.getElementById('clienteFotoPerfilEliminar').value);
        payload.append('remove_foto_cedula', document.getElementById('clienteFotoCedulaEliminar').value);

        const fotoPerfil = document.getElementById('clienteFotoPerfilModal').files?.[0];
        const fotoCedula = document.getElementById('clienteFotoCedulaModal').files?.[0];
        if (fotoPerfil) payload.append('foto_perfil', fotoPerfil);
        if (fotoCedula) payload.append('foto_cedula', fotoCedula);

        if (!String(payload.get('nombre') || '').trim()) {
            window.mostrarNotificacion('❌ El nombre del cliente es obligatorio');
            return;
        }

        try {
            let respuesta = null;
            if (id === -1) {
                respuesta = await window.ApiService.crearCliente(payload);
                window.mostrarNotificacion('✅ Cliente creado');
            } else {
                respuesta = await window.ApiService.actualizarCliente(id, payload);
                window.mostrarNotificacion('✅ Cliente actualizado');
            }

            await this.cargarClientes();
            await this.cargarCuentasPorCobrarSeguras();

            const clienteGuardadoId = respuesta?.cliente?.id || id;
            if (seleccionarDespues && clienteGuardadoId) {
                this.seleccionarClienteVenta(clienteGuardadoId);
            }

            this.cerrarModalCliente();
        } catch (e) {
            window.mostrarNotificacion(`❌ ${e.message || 'No se pudo guardar el cliente'}`);
        }
    },

    editarCliente(clienteId) {
        const cliente = window.clientes.find(item => item.id === clienteId);
        if (!cliente) return;
        this.abrirModalCliente(clienteId, false);
    },

    construirBloqueFotosCliente(cliente) {
        const fotoPerfil = this.construirUrlFotoCliente(cliente?.foto_perfil_url || cliente?.foto_perfil_path || '');
        const fotoCedula = this.construirUrlFotoCliente(cliente?.foto_cedula_url || cliente?.foto_cedula_path || '');

        return `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom: 14px;">
                <div style="background:#fff; border:1px solid #e6e6e6; border-radius:14px; padding:12px;">
                    <small style="display:block; color:#5b6470; margin-bottom:8px;">Foto de perfil</small>
                    <div class="cliente-foto-preview${fotoPerfil ? '' : ' cliente-foto-preview-empty'}" style="margin-top:0; aspect-ratio: 1;">
                        ${fotoPerfil ? `<img src="${fotoPerfil}" alt="Foto de perfil de ${cliente.nombre}">` : 'Sin foto de perfil'}
                    </div>
                </div>
                <div style="background:#fff; border:1px solid #e6e6e6; border-radius:14px; padding:12px;">
                    <small style="display:block; color:#5b6470; margin-bottom:8px;">Foto de cedula</small>
                    <div class="cliente-foto-preview${fotoCedula ? '' : ' cliente-foto-preview-empty'}" style="margin-top:0; aspect-ratio: 1;">
                        ${fotoCedula ? `<img src="${fotoCedula}" alt="Foto de cedula de ${cliente.nombre}">` : 'Sin foto de cedula'}
                    </div>
                </div>
            </div>
        `;
    },

    async verEstadoCuentaCliente(clienteId) {
        try {
            const data = await window.ApiService.obtenerEstadoCuentaCliente(clienteId);
            const cliente = data.cliente || {};
            const cuentas = data.cuentas_por_cobrar || [];

            document.getElementById('tituloEstadoCuentaCliente').textContent = `Estado de Cuenta - ${cliente.nombre || 'Cliente'}`;
            document.getElementById('estadoCuentaClienteDocumento').textContent = cliente.documento || 'Sin documento';
            document.getElementById('estadoCuentaClienteFavor').textContent = `$${(cliente.saldo_a_favor_usd || 0).toFixed(2)}`;
            document.getElementById('estadoCuentaClienteCobrar').textContent = `$${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}`;

            const lista = document.getElementById('estadoCuentaClienteLista');
            if (!cuentas.length) {
                lista.innerHTML = `${this.construirBloqueFotosCliente(cliente)}<div class="mensaje-vacio">Este cliente no tiene cuentas por cobrar.</div>`;
            } else {
                lista.innerHTML = this.construirBloqueFotosCliente(cliente) + cuentas.map(cuenta => `
                    <div style="background: white; border: 1px solid #e8e8e8; border-left: 4px solid ${cuenta.estado === 'pagada' ? '#198754' : '#dc3545'}; border-radius: 10px; padding: 14px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px;">
                            <strong>Venta #${cuenta.numero_venta || cuenta.venta_id}</strong>
                            <span style="text-transform: capitalize; color: #5b6470;">${cuenta.estado}</span>
                        </div>
                        <div style="font-size: 0.92em; color: #5b6470; margin-bottom: 10px;">Emitida: ${cuenta.fecha_emision || 'Sin fecha'}</div>
                        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; font-size: 0.95em;">
                            <div><small>Original</small><br><strong>$${(cuenta.monto_original_usd || 0).toFixed(2)}</strong></div>
                            <div><small>Abonado</small><br><strong>$${(cuenta.monto_abonado_usd || 0).toFixed(2)}</strong></div>
                            <div><small>Pendiente</small><br><strong>$${(cuenta.saldo_pendiente_usd || 0).toFixed(2)}</strong></div>
                        </div>
                    </div>
                `).join('');
            }

            document.getElementById('modalEstadoCuentaCliente').style.display = 'block';
        } catch (e) {
            window.mostrarNotificacion('❌ No se pudo cargar el estado de cuenta');
        }
    },

    cerrarModalEstadoCuentaCliente() {
        document.getElementById('modalEstadoCuentaCliente').style.display = 'none';
    }
};

window.ClientesFeature = ClientesFeature;
