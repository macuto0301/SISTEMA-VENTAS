// ============================================
// FUNCIONES DE INFORMES Y FILTROS
// ============================================

const InformesService = {
    obtenerCalendario(id) {
        return window.SVDatePicker?.get?.(id);
    },

    obtenerAppState() {
        return window.AppState || { ventas: [], paginacion: { ventas: { page: 1, page_size: 10, total: 0, total_pages: 1 } } };
    },

    async cargarDatosVentasSeguras(params) {
        if (typeof window.cargarDatosVentas === 'function') {
            return window.cargarDatosVentas(params);
        }
        return window.VentasDataFeature?.cargarDatosVentas?.(params);
    },

    construirParametrosBackend({ soloHoy = false, aplicarFecha = false, page = 1, pageSize = null, search = '', filters = {} } = {}) {
        const rolFiltro = this.obtenerValorFiltro('filtroRolInforme');
        const usuarioFiltro = this.obtenerValorFiltro('filtroUsuarioInforme');
        const inicioInput = this.obtenerValorFiltro('fechaInicioInforme');
        const finInput = this.obtenerValorFiltro('fechaFinInforme');

        let fechaInicio = '';
        let fechaFin = '';

        if (soloHoy) {
            const hoy = new Date();
            const yyyy = hoy.getFullYear();
            const mm = String(hoy.getMonth() + 1).padStart(2, '0');
            const dd = String(hoy.getDate()).padStart(2, '0');
            fechaInicio = `${yyyy}-${mm}-${dd}`;
            fechaFin = `${yyyy}-${mm}-${dd}`;
        } else if (aplicarFecha || (inicioInput && finInput)) {
            fechaInicio = inicioInput;
            fechaFin = finInput;
        }

        return {
            page,
            pageSize,
            search,
            filters: {
                fecha: filters.fecha || '',
                usuario: filters.usuario || usuarioFiltro || '',
                rol: rolFiltro || '',
                cliente: filters.cliente || '',
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin
            }
        };
    },

    obtenerValorFiltro(id) {
        const calendario = this.obtenerCalendario(id);
        if (calendario) {
            return calendario.getValue();
        }
        const elemento = document.getElementById(id);
        return elemento ? elemento.value : '';
    },

    parsearFechaVenta(fechaTexto) {
        if (!fechaTexto) return null;

        const partes = fechaTexto.split(/[\/\s:]/);
        if (partes.length < 3) return null;

        let dia = parseInt(partes[0], 10);
        let mes = parseInt(partes[1], 10) - 1;
        let anio = parseInt(partes[2], 10);
        if (anio < 100) anio += 2000;

        const hora = partes.length > 3 ? parseInt(partes[3], 10) : 0;
        const min = partes.length > 4 ? parseInt(partes[4], 10) : 0;

        return new Date(anio, mes, dia, hora, min);
    },

    obtenerVentasFiltradas() {
        return this.obtenerAppState().ventas || [];
    },

    actualizarOpcionesUsuarios() {
        const selectUsuario = document.getElementById('filtroUsuarioInforme');
        if (!selectUsuario) return;

        const valorActual = selectUsuario.value;
        const usuarios = [...new Set(
            (this.obtenerAppState().ventas || [])
                .map(venta => (venta.usuario_username || '').trim())
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b, 'es'));

        selectUsuario.innerHTML = `
            <option value="">Todos</option>
            ${usuarios.map(usuario => `<option value="${usuario}">${usuario}</option>`).join('')}
        `;

        if (usuarios.includes(valorActual)) {
            selectUsuario.value = valorActual;
        }
    },

    construirTitulo(baseTitulo) {
        const etiquetas = [];
        const rolFiltro = this.obtenerValorFiltro('filtroRolInforme');
        const usuarioFiltro = this.obtenerValorFiltro('filtroUsuarioInforme');

        if (rolFiltro) etiquetas.push(`Rol: ${rolFiltro}`);
        if (usuarioFiltro) etiquetas.push(`Usuario: ${usuarioFiltro}`);

        return etiquetas.length > 0 ? `${baseTitulo} - ${etiquetas.join(' | ')}` : baseTitulo;
    },

    async cargarVentasDelDia() {
        this.actualizarOpcionesUsuarios();
        const appState = this.obtenerAppState();
        await this.cargarDatosVentasSeguras(this.construirParametrosBackend({
            soloHoy: true,
            page: 1,
            pageSize: appState.paginacion.ventas?.page_size || 10
        }));
        this.mostrar(this.obtenerVentasFiltradas(), this.construirTitulo('Ventas de Hoy'));
    },

    async cargarTodasLasVentas() {
        const appState = this.obtenerAppState();
        this.actualizarOpcionesUsuarios();
        await this.cargarDatosVentasSeguras(this.construirParametrosBackend({
            page: appState.paginacion.ventas?.page || 1,
            pageSize: appState.paginacion.ventas?.page_size || 10
        }));
        this.mostrar(this.obtenerVentasFiltradas(), this.construirTitulo('Todas las Ventas'));
    },

    async filtrarPorFecha() {
        const inicioInput = this.obtenerValorFiltro('fechaInicioInforme');
        const finInput = this.obtenerValorFiltro('fechaFinInforme');
        if (!inicioInput || !finInput) {
            window.mostrarNotificacion?.('⚠️ Seleccione fechas de Inicio y Fin');
            return;
        }

        const fechaInicio = new Date(inicioInput + 'T00:00:00');
        const fechaFin = new Date(finInput + 'T23:59:59');
        if (fechaInicio > fechaFin) {
            window.mostrarNotificacion?.('⚠️ La fecha final no puede ser menor a la inicial');
            return;
        }

        const appState = this.obtenerAppState();
        await this.cargarDatosVentasSeguras(this.construirParametrosBackend({
            aplicarFecha: true,
            page: 1,
            pageSize: appState.paginacion.ventas?.page_size || 10
        }));

        const label = `Del ${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}`;
        this.mostrar(this.obtenerVentasFiltradas(), this.construirTitulo(label));
    },

    async limpiarFiltros() {
        this.obtenerCalendario('fechaInicioInforme')?.clear();
        this.obtenerCalendario('fechaFinInforme')?.clear();

        const selectRol = document.getElementById('filtroRolInforme');
        const selectUsuario = document.getElementById('filtroUsuarioInforme');

        if (selectRol) selectRol.value = '';
        if (selectUsuario) selectUsuario.value = '';

        await this.cargarTodasLasVentas();
    },

    mostrar(ventasFiltradas, titulo) {
        const resumenDiv = document.getElementById('resumenVentas');

        const ventasLista = Array.isArray(ventasFiltradas) ? ventasFiltradas : [];

        const totalDolares = ventasLista.reduce((sum, v) => sum + (v.total_dolares || 0), 0);
        const totalBs = ventasLista.reduce((sum, v) => sum + (v.total_bolivares || 0), 0);
        const totalVentas = ventasLista.length;
        const promedioDolares = totalVentas > 0 ? totalDolares / totalVentas : 0;
        const promedioBs = totalVentas > 0 ? totalBs / totalVentas : 0;

        if (resumenDiv) {
            resumenDiv.innerHTML = `
                <h3>${titulo}</h3>
                <div class="resumen-ventas-grid">
                    <div class="tarjeta-resumen tarjeta-resumen--ventas">
                        <h3>Total Ventas</h3>
                        <div class="valor">${totalVentas}</div>
                    </div>
                    <div class="tarjeta-resumen tarjeta-resumen--dolares">
                        <h3>Total en Dolares</h3>
                        <div class="valor">$${totalDolares.toFixed(2)}</div>
                    </div>
                    <div class="tarjeta-resumen tarjeta-resumen--bolivares">
                        <h3>Total en Bolivares</h3>
                        <div class="valor">Bs ${totalBs.toFixed(2)}</div>
                    </div>
                    <div class="tarjeta-resumen tarjeta-resumen--promedio">
                        <h3>Promedio por Venta</h3>
                        <div class="valor">$${promedioDolares.toFixed(2)}</div>
                        <small>Bs ${promedioBs.toFixed(2)}</small>
                    </div>
                </div>
            `;
        }

        const ventasInvertidas = [...ventasLista].reverse().map((venta, idx) => ({
            ...venta,
            __rowId: venta.id || `${venta.fecha || 'sin-fecha'}-${idx}`,
            __numeroVenta: venta.numero_venta || venta.id || (ventasLista.length - idx)
        }));

        if (window.SVTable) {
            window.SVTable.mount({
                id: 'tabla-informes-principal',
                container: 'tablaInformes',
                title: titulo,
                ariaLabel: 'Tabla de informes de ventas',
                rows: ventasInvertidas,
                rowId: row => row.__rowId,
                exportFileName: 'informe-ventas',
                searchPlaceholder: 'Buscar ventas, clientes, usuarios o productos',
                emptyState: 'No hay ventas registradas para los filtros actuales',
                pageSize: 10,
                remotePagination: {
                    enabled: true,
                    page: this.obtenerAppState().paginacion.ventas?.page || 1,
                    pageSize: this.obtenerAppState().paginacion.ventas?.page_size || 10,
                    total: this.obtenerAppState().paginacion.ventas?.total || ventasLista.length,
                    totalPages: this.obtenerAppState().paginacion.ventas?.total_pages || 1,
                    onPageChange: async ({ page, pageSize }) => {
                        await this.cargarDatosVentasSeguras(this.construirParametrosBackend({ page, pageSize }));
                        this.mostrar(this.obtenerAppState().ventas, titulo);
                    },
                    onPageSizeChange: async ({ page, pageSize }) => {
                        await this.cargarDatosVentasSeguras(this.construirParametrosBackend({ page, pageSize }));
                        this.mostrar(this.obtenerAppState().ventas, titulo);
                    },
                    onQueryChange: async ({ page, pageSize, search, filters }) => {
                        await this.cargarDatosVentasSeguras(this.construirParametrosBackend({ page, pageSize, search, filters }));
                        this.mostrar(this.obtenerAppState().ventas, titulo);
                    }
                },
                columns: [
                    {
                        id: 'numero',
                        label: '#',
                        key: '__numeroVenta',
                        align: 'center',
                        searchValue: row => row.__numeroVenta,
                        filterable: true
                    },
                    {
                        id: 'fecha',
                        label: 'Fecha',
                        key: 'fecha',
                        filterable: true,
                        sortValue: row => InformesService.parsearFechaVenta(row.fecha)?.getTime() || 0
                    },
                    {
                        id: 'usuario',
                        label: 'Usuario',
                        key: 'usuario_username',
                        filterable: true,
                        render: row => `
                            <div class="sv-table-stack">
                                <strong>${row.usuario_username || 'Sin usuario'}</strong>
                                <small>${row.usuario_rol || 'Sin rol'}</small>
                            </div>
                        `,
                        allowHtml: true,
                        searchValue: row => `${row.usuario_username || ''} ${row.usuario_rol || ''}`
                    },
                    {
                        id: 'cliente',
                        label: 'Cliente',
                        key: 'cliente',
                        filterable: true,
                        render: row => row.cliente || 'Consumidor Final'
                    },
                    {
                        id: 'productos',
                        label: 'Productos',
                        key: 'productos',
                        sortable: false,
                        filterable: false,
                        render: row => `
                            <div class="sv-table-stack sv-table-stack--dense">
                                ${typeof renderProductosVentaInforme === 'function'
                                    ? renderProductosVentaInforme(row)
                                    : ((row.productos || []).map(p => `${p.cantidad}x ${p.nombre}`).join('<br>') || 'Sin productos')}
                                ${typeof obtenerResumenDevolucionVenta === 'function' ? obtenerResumenDevolucionVenta(row) : ''}
                            </div>
                        `,
                        allowHtml: true,
                        exportValue: row => (row.productos || []).map(p => `${p.cantidad}x ${p.nombre}`).join(' | ')
                    },
                    {
                        id: 'totalUsd',
                        label: 'Total $',
                        key: 'total_dolares',
                        type: 'money',
                        currency: '$',
                        align: 'right',
                        filterable: true
                    },
                    {
                        id: 'totalBs',
                        label: 'Total Bs',
                        key: 'total_bolivares',
                        type: 'money',
                        currency: 'Bs',
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
                        render: row => typeof renderAccionesVentaInforme === 'function' ? renderAccionesVentaInforme(row, row.__numeroVenta) : '',
                        allowHtml: true,
                        exportable: false
                    }
                ],
                bulkActions: [
                    {
                        id: 'export-selected-csv',
                        label: 'Exportar seleccion CSV',
                        handler: () => window.SVTable.exportSelected('tabla-informes-principal', 'csv')
                    },
                    {
                        id: 'clear-selection',
                        label: 'Limpiar seleccion',
                        handler: () => window.SVTable.clearSelection('tabla-informes-principal')
                    }
                ]
            });
        }
    }
};

window.InformesService = InformesService;
