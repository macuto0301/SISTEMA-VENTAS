// ============================================
// INFORME DE CAPITAL INVERTIDO EN INVENTARIO
// ============================================

const InformesCapitalService = {

    _ultimosDatos: null,

    obtenerApiUrl() {
        return window.API_URL || (window.API?.baseUrl || '/api').replace(/\/$/, '');
    },

    obtenerHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        try {
            const sesionGuardada = localStorage.getItem('sesion_ventas') || sessionStorage.getItem('sesion_ventas');
            if (sesionGuardada) {
                const sesion = JSON.parse(sesionGuardada);
                if (sesion?.token) {
                    headers['Authorization'] = `Bearer ${sesion.token}`;
                }
            }
        } catch (e) {
            console.warn('Error leyendo sesion para headers:', e);
        }
        return headers;
    },

    // -- Carga de datos --

    async cargarDatosCapital(params = {}) {
        const url = new URL(`${this.obtenerApiUrl()}/productos/inventario/capital`, window.location.origin);

        if (params.page) url.searchParams.set('page', params.page);
        if (params.pageSize) url.searchParams.set('page_size', params.pageSize);
        if (params.q) url.searchParams.set('q', params.q);
        if (params.categoria) url.searchParams.set('categoria', params.categoria);
        if (params.almacen) url.searchParams.set('almacen', params.almacen);
        if (params.fecha_inicio) url.searchParams.set('fecha_inicio', params.fecha_inicio);
        if (params.fecha_fin) url.searchParams.set('fecha_fin', params.fecha_fin);
        if (params.in_stock) url.searchParams.set('in_stock', 'true');

        try {
            const resp = await fetch(url.toString(), { headers: this.obtenerHeaders() });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error || err.msg || `Error ${resp.status}`);
            }
            const data = await resp.json();
            this._ultimosDatos = data;
            return data;
        } catch (error) {
            console.error('Error cargando capital invertido:', error);
            window.Utils?.mostrarNotificacion?.(`Error al cargar informe: ${error.message}`, 'error');
            return null;
        }
    },

    // -- Construccion de parametros desde filtros del DOM --

    construirParametros({ page = 1, pageSize = 25, search = '' } = {}) {
        const categoria = this.obtenerValorFiltro('filtroCategoriaCap');
        const almacen = this.obtenerValorFiltro('filtroAlmacenCap');
        const fechaInicio = this.obtenerValorFiltro('fechaInicioCap');
        const fechaFin = this.obtenerValorFiltro('fechaFinCap');
        const soloStock = document.getElementById('filtroSoloStockCap')?.checked || false;

        return {
            page,
            pageSize,
            q: search,
            categoria,
            almacen,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            in_stock: soloStock,
        };
    },

    obtenerValorFiltro(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    },

    // -- Acciones principales --

    async cargarInforme() {
        const data = await this.cargarDatosCapital(this.construirParametros());
        if (data) this.mostrar(data);
    },

    async filtrar() {
        const fechaInicio = this.obtenerValorFiltro('fechaInicioCap');
        const fechaFin = this.obtenerValorFiltro('fechaFinCap');

        if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) {
            alert('Debe seleccionar ambas fechas (Desde y Hasta)');
            return;
        }

        if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
            alert('La fecha final no puede ser menor a la inicial');
            return;
        }

        const data = await this.cargarDatosCapital(this.construirParametros());
        if (data) this.mostrar(data);
    },

    async limpiarFiltros() {
        const ids = ['filtroCategoriaCap', 'filtroAlmacenCap', 'fechaInicioCap', 'fechaFinCap'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const chk = document.getElementById('filtroSoloStockCap');
        if (chk) chk.checked = false;

        const data = await this.cargarDatosCapital({ page: 1, pageSize: 25 });
        if (data) this.mostrar(data);
    },

    // -- Render principal --

    mostrar(data) {
        if (!data) return;

        const { items = [], resumen = {}, categorias = [], almacenes = [], pagination } = data;

        this.renderResumen(resumen);
        this.actualizarDropdowns(categorias, almacenes);
        this.renderTabla(items, pagination, resumen);
    },

    renderResumen(resumen) {
        const contenedor = document.getElementById('resumenCapital');
        if (!contenedor) return;

        const fmt = (n) => {
            const num = Number(n) || 0;
            return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const fmtInt = (n) => {
            const num = Number(n) || 0;
            return Number.isInteger(num) ? num.toLocaleString('es-VE') : num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        contenedor.innerHTML = `
            <h3>Capital Invertido en Inventario</h3>
            <div class="resumen-ventas-grid resumen-capital-grid">
                <div class="tarjeta-resumen tarjeta-resumen--capital">
                    <h3>Capital Invertido</h3>
                    <div class="valor">$${fmt(resumen.capital_invertido)}</div>
                    <small>Total en costo de productos</small>
                </div>
                <div class="tarjeta-resumen tarjeta-resumen--productos-total">
                    <h3>Total Productos</h3>
                    <div class="valor">${resumen.total_productos || 0}</div>
                    <small>${resumen.categorias_count || 0} categorias &middot; ${resumen.almacenes_count || 0} almacenes</small>
                </div>
                <div class="tarjeta-resumen tarjeta-resumen--unidades">
                    <h3>Total Unidades</h3>
                    <div class="valor">${fmtInt(resumen.total_unidades)}</div>
                    <small>Unidades en inventario</small>
                </div>
                <div class="tarjeta-resumen tarjeta-resumen--venta-potencial">
                    <h3>Valor Venta Potencial</h3>
                    <div class="valor">$${fmt(resumen.valor_venta_potencial)}</div>
                    <small>Si se vende todo al precio lista 1</small>
                </div>
                <div class="tarjeta-resumen tarjeta-resumen--ganancia-potencial">
                    <h3>Ganancia Potencial</h3>
                    <div class="valor">$${fmt(resumen.ganancia_potencial)}</div>
                    <small>Diferencia venta - costo</small>
                </div>
            </div>
        `;
    },

    actualizarDropdowns(categorias, almacenes) {
        this._actualizarSelect('filtroCategoriaCap', categorias);
        this._actualizarSelect('filtroAlmacenCap', almacenes);
    },

    _actualizarSelect(id, opciones) {
        const select = document.getElementById(id);
        if (!select) return;
        const valorActual = select.value;
        const opcionesHtml = opciones.map(op => `<option value="${op}">${op}</option>`).join('');
        select.innerHTML = `<option value="">Todos</option>${opcionesHtml}`;
        if (opciones.includes(valorActual)) {
            select.value = valorActual;
        }
    },

    renderTabla(items, pagination, resumen) {
        if (!window.SVTable) return;

        const rows = items.map((item, idx) => ({
            ...item,
            __rowId: item.id || idx,
        }));

        const remotePaginationConfig = pagination ? {
            enabled: true,
            page: pagination.page || 1,
            pageSize: pagination.page_size || 25,
            total: pagination.total || items.length,
            totalPages: pagination.total_pages || 1,
            onPageChange: async ({ page, pageSize, search, filters }) => {
                const params = this.construirParametros({ page, pageSize, search });
                const data = await this.cargarDatosCapital(params);
                if (data) this.mostrar(data);
            },
            onPageSizeChange: async ({ page, pageSize, search, filters }) => {
                const params = this.construirParametros({ page: 1, pageSize, search });
                const data = await this.cargarDatosCapital(params);
                if (data) this.mostrar(data);
            },
            onQueryChange: async ({ page, pageSize, search, filters }) => {
                const params = this.construirParametros({ page: 1, pageSize, search });
                const data = await this.cargarDatosCapital(params);
                if (data) this.mostrar(data);
            }
        } : undefined;

        window.SVTable.mount({
            id: 'tabla-capital-invertido',
            container: 'tablaCapitalInvertido',
            title: 'Capital Invertido en Inventario',
            ariaLabel: 'Tabla de capital invertido en inventario',
            rows,
            rowId: row => row.__rowId,
            exportFileName: 'informe-capital-invertido',
            searchPlaceholder: 'Buscar producto, codigo, categoria...',
            emptyState: 'No hay productos para los filtros actuales',
            pageSize: pagination?.page_size || 25,
            remotePagination: remotePaginationConfig,
            columns: [
                {
                    id: 'codigo',
                    label: 'Codigo',
                    key: 'codigo',
                    align: 'center',
                    filterable: true,
                },
                {
                    id: 'nombre',
                    label: 'Producto',
                    key: 'nombre',
                    filterable: true,
                    render: row => `<strong>${row.nombre || '-'}</strong>`,
                    allowHtml: true,
                },
                {
                    id: 'categoria',
                    label: 'Categoria',
                    key: 'categoria',
                    filterable: true,
                    filterType: 'select',
                    filterOptions: () => [...new Set(rows.map(r => r.categoria).filter(Boolean))].sort(),
                },
                {
                    id: 'almacen',
                    label: 'Almacen',
                    key: 'almacen',
                    filterable: true,
                    filterType: 'select',
                    filterOptions: () => [...new Set(rows.map(r => r.almacen).filter(Boolean))].sort(),
                },
                {
                    id: 'unidad',
                    label: 'Unidad',
                    key: 'unidad',
                    align: 'center',
                },
                {
                    id: 'cantidad',
                    label: 'Cantidad',
                    key: 'cantidad',
                    align: 'right',
                    filterable: true,
                    render: row => {
                        const cant = Number(row.cantidad) || 0;
                        const cls = cant <= 0 ? ' style="color:var(--danger);font-weight:700;"' : '';
                        const formatted = Number.isInteger(cant) ? cant.toLocaleString('es-VE') : cant.toLocaleString('es-VE', { minimumFractionDigits: 2 });
                        return `<span${cls}>${formatted}</span>`;
                    },
                    allowHtml: true,
                    sortValue: row => Number(row.cantidad) || 0,
                    exportValue: row => Number(row.cantidad) || 0,
                },
                {
                    id: 'precio_costo',
                    label: 'Costo Unit. $',
                    key: 'precio_costo',
                    type: 'money',
                    currency: '$',
                    align: 'right',
                    filterable: true,
                },
                {
                    id: 'valor_total',
                    label: 'Valor Total $',
                    key: 'valor_total',
                    type: 'money',
                    currency: '$',
                    align: 'right',
                    filterable: true,
                    render: row => {
                        const val = Number(row.valor_total) || 0;
                        return `<strong class="sv-table-money">$ ${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>`;
                    },
                    allowHtml: true,
                    sortValue: row => Number(row.valor_total) || 0,
                    exportValue: row => Number(row.valor_total) || 0,
                },
                {
                    id: 'precio_venta',
                    label: 'P. Venta $',
                    key: 'precio_venta',
                    type: 'money',
                    currency: '$',
                    align: 'right',
                },
            ],
            defaultSort: { columnId: 'valor_total', direction: 'desc' },
            bulkActions: [
                {
                    id: 'export-capital-csv',
                    label: 'Exportar seleccion CSV',
                    handler: () => window.SVTable.exportSelected('tabla-capital-invertido', 'csv')
                },
                {
                    id: 'clear-capital-selection',
                    label: 'Limpiar seleccion',
                    handler: () => window.SVTable.clearSelection('tabla-capital-invertido')
                }
            ]
        });
    },

    // -- Exportar a PDF (impresion) --

    async exportarPDF() {
        const cached = this._ultimosDatos;
        if (!cached || !cached.items?.length) {
            alert('No hay datos para exportar. Cargue el informe primero.');
            return;
        }

        // Fetch ALL matching products (not just current page) for the PDF
        const totalProducts = cached.pagination?.total || cached.items.length;
        let items, resumen;

        if (totalProducts > (cached.pagination?.page_size || 25)) {
            window.Utils?.mostrarNotificacion?.('Preparando PDF con todos los productos...', 'info');
            const params = this.construirParametros({ page: 1, pageSize: totalProducts });
            const fullData = await this.cargarDatosCapital(params);
            if (!fullData) {
                alert('Error al obtener todos los datos para el PDF.');
                return;
            }
            items = fullData.items;
            resumen = fullData.resumen;
        } else {
            items = cached.items;
            resumen = cached.resumen;
        }

        const fmt = (n) => {
            const num = Number(n) || 0;
            return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const fmtInt = (n) => {
            const num = Number(n) || 0;
            return Number.isInteger(num) ? num.toLocaleString('es-VE') : num.toLocaleString('es-VE', { minimumFractionDigits: 2 });
        };

        const empresa = window.AppState?.configuracion?.empresa_nombre || 'Mi Empresa';
        const rif = window.AppState?.configuracion?.empresa_rif || '';
        const ahora = new Date();
        const fechaStr = ahora.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaStr = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

        const filasHtml = items.map((item, i) => `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td>${item.codigo || ''}</td>
                <td><strong>${item.nombre || ''}</strong></td>
                <td>${item.categoria || '-'}</td>
                <td>${item.almacen || '-'}</td>
                <td style="text-align:center;">${item.unidad || 'und'}</td>
                <td style="text-align:right;">${fmtInt(item.cantidad)}</td>
                <td style="text-align:right;">$${fmt(item.precio_costo)}</td>
                <td style="text-align:right;font-weight:700;">$${fmt(item.valor_total)}</td>
                <td style="text-align:right;">$${fmt(item.precio_venta)}</td>
            </tr>
        `).join('');

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Capital Invertido - ${fechaStr}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 15px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #1d4f5f; padding-bottom: 12px; }
        .header-left h1 { font-size: 16px; color: #1d4f5f; margin-bottom: 2px; }
        .header-left p { font-size: 10px; color: #555; }
        .header-right { text-align: right; font-size: 10px; color: #555; }
        .resumen-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 18px; }
        .resumen-card { background: #f0f5f3; border-radius: 6px; padding: 8px 10px; border-left: 3px solid #1d4f5f; }
        .resumen-card.highlight { background: #e8f0ec; border-left-color: #2d8f57; }
        .resumen-card h4 { font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 3px; }
        .resumen-card .val { font-size: 14px; font-weight: 800; color: #1d4f5f; }
        .resumen-card.highlight .val { color: #2d8f57; }
        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        th { background: #1d4f5f; color: #fff; padding: 6px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; font-size: 10px; }
        tr:nth-child(even) { background: #f8faf9; }
        tr:hover { background: #eef3f0; }
        .total-row { background: #1d4f5f !important; color: #fff; font-weight: 700; }
        .total-row td { border-bottom: none; padding: 8px; font-size: 11px; }
        .footer { margin-top: 15px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
        @media print {
            body { padding: 5mm; }
            .resumen-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .total-row { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            tr:nth-child(even) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>${empresa}</h1>
            ${rif ? `<p>RIF: ${rif}</p>` : ''}
            <p style="font-size:12px; font-weight:700; margin-top:6px; color:#1d4f5f;">Informe de Capital Invertido en Inventario</p>
        </div>
        <div class="header-right">
            <p>Fecha: ${fechaStr}</p>
            <p>Hora: ${horaStr}</p>
            <p>${resumen.total_productos || 0} productos</p>
        </div>
    </div>

    <div class="resumen-grid">
        <div class="resumen-card highlight">
            <h4>Capital Invertido</h4>
            <div class="val">$${fmt(resumen.capital_invertido)}</div>
        </div>
        <div class="resumen-card">
            <h4>Total Productos</h4>
            <div class="val">${resumen.total_productos || 0}</div>
        </div>
        <div class="resumen-card">
            <h4>Total Unidades</h4>
            <div class="val">${fmtInt(resumen.total_unidades)}</div>
        </div>
        <div class="resumen-card">
            <h4>Valor Venta Potencial</h4>
            <div class="val">$${fmt(resumen.valor_venta_potencial)}</div>
        </div>
        <div class="resumen-card highlight">
            <h4>Ganancia Potencial</h4>
            <div class="val">$${fmt(resumen.ganancia_potencial)}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="text-align:center;">#</th>
                <th>Codigo</th>
                <th>Producto</th>
                <th>Categoria</th>
                <th>Almacen</th>
                <th style="text-align:center;">Unidad</th>
                <th style="text-align:right;">Cant.</th>
                <th style="text-align:right;">Costo Unit.</th>
                <th style="text-align:right;">Valor Total</th>
                <th style="text-align:right;">P. Venta</th>
            </tr>
        </thead>
        <tbody>
            ${filasHtml}
            <tr class="total-row">
                <td colspan="6" style="text-align:right;">TOTAL CAPITAL INVERTIDO:</td>
                <td style="text-align:right;">${fmtInt(resumen.total_unidades)}</td>
                <td></td>
                <td style="text-align:right;">$${fmt(resumen.capital_invertido)}</td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        Generado el ${fechaStr} a las ${horaStr} &mdash; ${empresa}
    </div>
</body>
</html>`;

        const ventana = window.open('', '_blank');
        if (ventana) {
            ventana.document.write(html);
            ventana.document.close();
            setTimeout(() => ventana.print(), 600);
        }
    }
};

window.InformesCapitalService = InformesCapitalService;
