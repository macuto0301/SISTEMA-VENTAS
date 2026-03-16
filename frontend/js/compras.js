// ============================================
// MÓDULO DE PROVEEDORES Y COMPRAS
// ============================================

window.window.indiceSeleccionado = -1;

function mapearFiltrosProveedores(filters = {}) {
    return {
        nombre: filters.nombre || '',
        rif: filters.rif || '',
        telefono: filters.telefono || '',
        email: filters.email || ''
    };
}

function mapearFiltrosCompras(filters = {}) {
    return {
        factura: filters.factura || '',
        fecha: filters.fecha || '',
        fecha_libro: filters.libro || '',
        proveedor: filters.proveedor || '',
        estado: filters.estado || ''
    };
}

function redondearMontoCompra(valor) {
    return Math.round((parseFloat(valor) || 0) * 100) / 100;
}

function construirItemCompra(producto, cantidad = 1) {
    const precioCosto = redondearMontoCompra(producto.precio_costo);
    const porcentaje1 = parseFloat(producto.porcentaje_ganancia_1 ?? producto.porcentaje_ganancia) || 0;
    const porcentaje2 = parseFloat(producto.porcentaje_ganancia_2 ?? porcentaje1) || 0;
    const porcentaje3 = parseFloat(producto.porcentaje_ganancia_3 ?? porcentaje1) || 0;
    const precio1 = redondearMontoCompra(producto.precio_1_dolares ?? producto.precio_dolares);
    const precio2 = redondearMontoCompra(producto.precio_2_dolares ?? precio1);
    const precio3 = redondearMontoCompra(producto.precio_3_dolares ?? precio1);

    return {
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        cantidad,
        precio_unitario: precioCosto,
        subtotal: redondearMontoCompra(cantidad * precioCosto),
        metodo_redondeo: producto.metodo_redondeo || window.metodoRedondeoBs || 'none',
        precio_1_dolares: precio1,
        precio_2_dolares: precio2,
        precio_3_dolares: precio3,
        porcentaje_ganancia_1: porcentaje1,
        porcentaje_ganancia_2: porcentaje2,
        porcentaje_ganancia_3: porcentaje3
    };
}

function recalcularSubtotalCompra(item) {
    item.subtotal = redondearMontoCompra((parseInt(item.cantidad, 10) || 0) * (parseFloat(item.precio_unitario) || 0));
}

function recalcularPrecioCompraDesdePorcentaje(lista = 1) {
    const costo = parseFloat(document.getElementById('compraPrecioCostoModal')?.value) || 0;
    const porcentajeInput = document.getElementById(`compraPorcentajeGanancia${lista}Modal`);
    const precioInput = document.getElementById(`compraPrecioDolares${lista}Modal`);
    if (!porcentajeInput || !precioInput) return;

    const porcentaje = parseFloat(porcentajeInput.value) || 0;
    precioInput.value = costo > 0 ? redondearMontoCompra(costo * (1 + (porcentaje / 100))).toFixed(2) : '0.00';
}

function recalcularPorcentajeCompraDesdePrecio(lista = 1) {
    const costo = parseFloat(document.getElementById('compraPrecioCostoModal')?.value) || 0;
    const porcentajeInput = document.getElementById(`compraPorcentajeGanancia${lista}Modal`);
    const precioInput = document.getElementById(`compraPrecioDolares${lista}Modal`);
    if (!porcentajeInput || !precioInput) return;

    const precio = parseFloat(precioInput.value) || 0;
    porcentajeInput.value = costo > 0 ? ((((precio / costo) - 1) * 100) || 0).toFixed(4) : '0.0000';
}

function recalcularTodosLosPreciosCompra() {
    [1, 2, 3].forEach(recalcularPrecioCompraDesdePorcentaje);
    calcularPrecioBolivaresCompra();
}

function calcularPrecioBolivaresCompra() {
    const precioDolares = parseFloat(document.getElementById('compraPrecioDolares1Modal')?.value) || 0;
    const metodo = document.getElementById('compraMetodoRedondeoModal')?.value || 'none';
    const precioBs = window.aplicarRedondeoBs(precioDolares * window.tasaDolar, metodo);
    const inputBs = document.getElementById('compraPrecioBolivaresModal');
    if (inputBs) {
        inputBs.value = precioBs ? precioBs.toFixed(2) : '';
    }
}

function calcularPrecioDolaresCompra() {
    const precioBs = parseFloat(document.getElementById('compraPrecioBolivaresModal')?.value) || 0;
    const precioDolares = precioBs / window.tasaDolar;
    const inputPrecio = document.getElementById('compraPrecioDolares1Modal');
    if (inputPrecio) {
        inputPrecio.value = precioDolares ? precioDolares.toFixed(2) : '';
    }
    recalcularPorcentajeCompraDesdePrecio(1);
}

function abrirModalPreciosCompra(index) {
    const item = ComprasModule.productosCompra[index];
    const modal = document.getElementById('modalCompraPrecios');
    if (!item || !modal) return;

    document.getElementById('compraPrecioIndex').value = index;
    document.getElementById('compraPrecioProductoNombre').textContent = item.producto_nombre;
    document.getElementById('compraPrecioCostoModal').value = redondearMontoCompra(item.precio_unitario).toFixed(2);
    document.getElementById('compraPorcentajeGanancia1Modal').value = (parseFloat(item.porcentaje_ganancia_1) || 0).toFixed(4);
    document.getElementById('compraPorcentajeGanancia2Modal').value = (parseFloat(item.porcentaje_ganancia_2) || 0).toFixed(4);
    document.getElementById('compraPorcentajeGanancia3Modal').value = (parseFloat(item.porcentaje_ganancia_3) || 0).toFixed(4);
    document.getElementById('compraPrecioDolares1Modal').value = redondearMontoCompra(item.precio_1_dolares).toFixed(2);
    document.getElementById('compraPrecioDolares2Modal').value = redondearMontoCompra(item.precio_2_dolares).toFixed(2);
    document.getElementById('compraPrecioDolares3Modal').value = redondearMontoCompra(item.precio_3_dolares).toFixed(2);
    document.getElementById('compraMetodoRedondeoModal').value = item.metodo_redondeo || window.metodoRedondeoBs || 'none';
    calcularPrecioBolivaresCompra();
    modal.style.display = 'block';
}

function cerrarModalPreciosCompra() {
    const modal = document.getElementById('modalCompraPrecios');
    if (modal) {
        modal.style.display = 'none';
    }
}

function limpiarErrorProveedorCompra() {
    const selectProveedor = document.getElementById('compraProveedor');
    if (!selectProveedor) return;
    selectProveedor.style.borderColor = '#ccc';
    selectProveedor.style.boxShadow = 'none';
    selectProveedor.removeAttribute('aria-invalid');
}

function marcarErrorProveedorCompra() {
    const selectProveedor = document.getElementById('compraProveedor');
    if (!selectProveedor) return;
    selectProveedor.style.borderColor = '#dc3545';
    selectProveedor.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.15)';
    selectProveedor.setAttribute('aria-invalid', 'true');
    selectProveedor.focus();
}

function limpiarErrorFacturaCompra() {
    const inputFactura = document.getElementById('compraNroFactura');
    if (!inputFactura) return;
    inputFactura.style.borderColor = '#ccc';
    inputFactura.style.boxShadow = 'none';
    inputFactura.removeAttribute('aria-invalid');
}

function marcarErrorFacturaCompra() {
    const inputFactura = document.getElementById('compraNroFactura');
    if (!inputFactura) return;
    inputFactura.style.borderColor = '#dc3545';
    inputFactura.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.15)';
    inputFactura.setAttribute('aria-invalid', 'true');
    inputFactura.focus();
}

function guardarPreciosCompra() {
    const index = parseInt(document.getElementById('compraPrecioIndex')?.value, 10);
    const item = ComprasModule.productosCompra[index];
    if (!item) {
        cerrarModalPreciosCompra();
        return;
    }

    item.precio_unitario = redondearMontoCompra(document.getElementById('compraPrecioCostoModal').value);
    item.porcentaje_ganancia_1 = parseFloat(document.getElementById('compraPorcentajeGanancia1Modal').value) || 0;
    item.porcentaje_ganancia_2 = parseFloat(document.getElementById('compraPorcentajeGanancia2Modal').value) || 0;
    item.porcentaje_ganancia_3 = parseFloat(document.getElementById('compraPorcentajeGanancia3Modal').value) || 0;
    item.precio_1_dolares = redondearMontoCompra(document.getElementById('compraPrecioDolares1Modal').value);
    item.precio_2_dolares = redondearMontoCompra(document.getElementById('compraPrecioDolares2Modal').value);
    item.precio_3_dolares = redondearMontoCompra(document.getElementById('compraPrecioDolares3Modal').value);
    item.metodo_redondeo = document.getElementById('compraMetodoRedondeoModal').value || 'none';
    recalcularSubtotalCompra(item);

    mostrarProductosCompra();
    cerrarModalPreciosCompra();
    mostrarNotificacion(`✅ Precios preparados para ${item.producto_nombre}`);
}

const ProveedoresModule = {
    async init() {
        await this.cargarProveedores();
    },

    async cargarProveedores(options = {}) {
        const container = document.getElementById('listaProveedores');
        if (container) {
            container.innerHTML = '<div class="sv-table-loading-card">Cargando proveedores...</div>';
        }

        const paginacionActual = AppState.paginacion.proveedores || { page: 1, page_size: 10 };
        const page = options.page || paginacionActual.page || 1;
        const pageSize = options.pageSize || paginacionActual.page_size || 10;
        const response = await ApiService.cargarProveedores({
            page,
            pageSize,
            search: options.search || '',
            filters: mapearFiltrosProveedores(options.filters)
        });

        AppState.proveedores = response.items;
        AppState.paginacion.proveedores = response.pagination;
        proveedores = AppState.proveedores;
        this.mostrarProveedores();
    },

    mostrarProveedores(lista = null) {
        const proveedoresMostrar = lista || AppState.proveedores;

        if (!window.SVTable) {
            return;
        }

        window.SVTable.mount({
            id: 'tabla-proveedores',
            container: 'listaProveedores',
            title: 'Proveedores',
            ariaLabel: 'Tabla de proveedores',
            rows: proveedoresMostrar,
            rowId: row => row.id,
            exportFileName: 'proveedores',
            searchPlaceholder: 'Buscar por nombre, RIF, telefono o email',
            emptyState: 'No hay proveedores registrados',
            pageSize: 10,
            remotePagination: {
                enabled: true,
                page: AppState.paginacion.proveedores?.page || 1,
                pageSize: AppState.paginacion.proveedores?.page_size || 10,
                total: AppState.paginacion.proveedores?.total || proveedoresMostrar.length,
                totalPages: AppState.paginacion.proveedores?.total_pages || 1,
                onPageChange: ({ page, pageSize, search, filters }) => this.cargarProveedores({ page, pageSize, search, filters }),
                onPageSizeChange: ({ page, pageSize, search, filters }) => this.cargarProveedores({ page, pageSize, search, filters }),
                onQueryChange: ({ page, pageSize, search, filters }) => this.cargarProveedores({ page, pageSize, search, filters })
            },
            columns: [
                {
                    id: 'nombre',
                    label: 'Nombre',
                    key: 'nombre',
                    filterable: true
                },
                {
                    id: 'rif',
                    label: 'RIF',
                    key: 'rif',
                    filterable: true
                },
                {
                    id: 'telefono',
                    label: 'Telefono',
                    key: 'telefono',
                    filterable: true,
                    render: row => row.telefono || '-'
                },
                {
                    id: 'email',
                    label: 'Email',
                    key: 'email',
                    filterable: true,
                    render: row => row.email || '-'
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
                        <button onclick="editarProveedor(${row.id})" class="btn-small" style="background: #ffc107; color: black;" title="Editar proveedor">✏️</button>
                        <button onclick="eliminarProveedor(${row.id})" class="btn-small" style="background: #dc3545; color: white;" title="Eliminar proveedor">🗑️</button>
                    `,
                    allowHtml: true,
                    exportable: false
                }
            ],
            bulkActions: [
                {
                    id: 'export-selected-csv',
                    label: 'Exportar seleccion CSV',
                    handler: () => window.SVTable.exportSelected('tabla-proveedores', 'csv')
                },
                {
                    id: 'clear-selection',
                    label: 'Limpiar seleccion',
                    handler: () => window.SVTable.clearSelection('tabla-proveedores')
                }
            ]
        });
    }
};

window.ProveedoresModule = ProveedoresModule;

function abrirModalProveedor(proveedor = null) {
    document.getElementById('proveedorId').value = proveedor ? proveedor.id : -1;
    document.getElementById('proveedorNombre').value = proveedor ? proveedor.nombre : '';
    document.getElementById('proveedorRif').value = proveedor ? proveedor.rif : '';
    document.getElementById('proveedorTelefono').value = proveedor ? proveedor.telefono : '';
    document.getElementById('proveedorEmail').value = proveedor ? proveedor.email : '';
    document.getElementById('proveedorDireccion').value = proveedor ? proveedor.direccion : '';
    document.getElementById('modalTituloProveedor').textContent = proveedor ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor';
    document.getElementById('modalProveedor').style.display = 'block';
}

function cerrarModalProveedor() {
    document.getElementById('modalProveedor').style.display = 'none';
}

async function guardarProveedor() {
    const id = parseInt(document.getElementById('proveedorId').value);
    const proveedor = {
        nombre: document.getElementById('proveedorNombre').value,
        rif: document.getElementById('proveedorRif').value,
        telefono: document.getElementById('proveedorTelefono').value,
        email: document.getElementById('proveedorEmail').value,
        direccion: document.getElementById('proveedorDireccion').value
    };

    if (!proveedor.nombre || !proveedor.rif) {
        alert('Nombre y RIF son obligatorios');
        return;
    }

    console.log('Guardando proveedor:', proveedor);

    if (id === -1) {
        const resultado = await ApiService.guardarProveedor(proveedor);
        console.log('Resultado guardar:', resultado);
        await ProveedoresModule.cargarProveedores();
        mostrarNotificacion('✅ Proveedor creado');
    } else {
        const actualizado = await ApiService.actualizarProveedor(id, proveedor);
        if (!actualizado) {
            mostrarNotificacion('⚠️ No se pudo actualizar el proveedor');
            return;
        }
        mostrarNotificacion('✅ Proveedor actualizado');
    }

    await ProveedoresModule.cargarProveedores();
    cerrarModalProveedor();
}

function editarProveedor(id) {
    const proveedor = AppState.proveedores.find(p => p.id === id);
    if (proveedor) {
        abrirModalProveedor(proveedor);
    }
}

async function eliminarProveedor(id) {
    if (confirm('¿Está seguro de eliminar este proveedor?')) {
        const eliminado = await ApiService.eliminarProveedor(id);
        if (!eliminado) {
            mostrarNotificacion('⚠️ No se pudo eliminar el proveedor');
            return;
        }
        await ProveedoresModule.cargarProveedores();
        mostrarNotificacion('✅ Proveedor eliminado');
    }
}

function filtrarProveedores() {
    const texto = document.getElementById('buscarProveedor').value.toLowerCase();
    const filtrados = AppState.proveedores.filter(p => 
        p.nombre.toLowerCase().includes(texto) || 
        p.rif.toLowerCase().includes(texto)
    );
    ProveedoresModule.mostrarProveedores(filtrados);
}

// ============================================
// MÓDULO DE COMPRAS
// ============================================

const ComprasModule = {
    productosCompra: [],

    async init() {
        console.log('ComprasModule.init() llamado');
        try {
            if (!AppState.proveedores || AppState.proveedores.length === 0) {
                console.log('Cargando proveedores...');
                await ProveedoresModule.cargarProveedores();
            }
            await this.cargarCompras();
        } catch (e) {
            console.error('Error en ComprasModule.init():', e);
        }
    },

    async cargarCompras(options = {}) {
        console.log('Cargando compras...');
        const container = document.getElementById('listaCompras');
        if (container) {
            container.innerHTML = '<div class="sv-table-loading-card">Cargando compras...</div>';
        }

        const paginacionActual = AppState.paginacion.compras || { page: 1, page_size: 10 };
        const page = options.page || paginacionActual.page || 1;
        const pageSize = options.pageSize || paginacionActual.page_size || 10;
        const response = await ApiService.cargarCompras({
            page,
            pageSize,
            search: options.search || '',
            filters: {
                ...mapearFiltrosCompras(options.filters),
                fecha_inicio: document.getElementById('fechaInicioCompraFiltro')?.value || '',
                fecha_fin: document.getElementById('fechaFinCompraFiltro')?.value || '',
                estado: document.getElementById('estadoCompraFiltro')?.value || mapearFiltrosCompras(options.filters).estado || ''
            }
        });

        AppState.compras = response.items;
        AppState.paginacion.compras = response.pagination;
        console.log('Compras cargadas:', AppState.compras);
        compras = AppState.compras;
        this.mostrarCompras(AppState.compras);
    },

    obtenerFechaCompra(compra) {
        if (!compra || !compra.fecha) return null;

        const fecha = new Date(`${compra.fecha}T00:00:00`);
        return Number.isNaN(fecha.getTime()) ? null : fecha;
    },

    obtenerComprasFiltradas() {
        const inicioInput = document.getElementById('fechaInicioCompraFiltro')?.value || '';
        const finInput = document.getElementById('fechaFinCompraFiltro')?.value || '';
        const estadoInput = document.getElementById('estadoCompraFiltro')?.value || '';

        let fechaInicio = null;
        let fechaFin = null;

        if (inicioInput) {
            fechaInicio = new Date(`${inicioInput}T00:00:00`);
        }

        if (finInput) {
            fechaFin = new Date(`${finInput}T23:59:59`);
        }

        return AppState.compras.filter(compra => {
            const coincideEstado = !estadoInput || compra.estado === estadoInput;
            if (!coincideEstado) return false;

            if (!fechaInicio && !fechaFin) return true;

            const fechaCompra = this.obtenerFechaCompra(compra);
            if (!fechaCompra) return false;

            if (fechaInicio && fechaCompra < fechaInicio) return false;
            if (fechaFin && fechaCompra > fechaFin) return false;

            return true;
        });
    },

    async aplicarFiltrosActivos() {
        await this.cargarCompras({ page: 1, pageSize: AppState.paginacion.compras?.page_size || 10 });
    },

    mostrarCompras(lista = null) {
        const container = document.getElementById('listaCompras');
        const resumenContainer = document.getElementById('resumenCompras');
        if (!container || !resumenContainer) return;
        
        const comprasMostrar = lista || AppState.compras;

        const pendientes = comprasMostrar.filter(c => c.estado === 'pendiente').length;
        const pagadas = comprasMostrar.filter(c => c.estado === 'pagada').length;
        const totalDolares = comprasMostrar.reduce((sum, c) => sum + (c.total_dolares || 0), 0);
        const totalBs = comprasMostrar.reduce((sum, c) => sum + (c.total_bs || 0), 0);

        resumenContainer.innerHTML = `
            <div class="resumen-ventas-grid resumen-ventas-grid--compact">
                <div class="tarjeta-resumen tarjeta-resumen--ventas">
                    <h3>Total</h3>
                    <div class="valor">${comprasMostrar.length}</div>
                </div>
                <div class="tarjeta-resumen tarjeta-resumen--pendientes">
                    <h3>Pendientes</h3>
                    <div class="valor">${pendientes}</div>
                </div>
                <div class="tarjeta-resumen tarjeta-resumen--pagadas">
                    <h3>Pagadas</h3>
                    <div class="valor">${pagadas}</div>
                </div>
                <div class="tarjeta-resumen tarjeta-resumen--bolivares">
                    <h3>Total acumulado</h3>
                    <div class="valor">$${totalDolares.toFixed(2)}</div>
                    <small>Bs ${totalBs.toFixed(2)}</small>
                </div>
            </div>
        `;

        container.innerHTML = '<div id="tablaComprasModelo"></div>';

        if (!window.SVTable) return;

        const comprasConIndice = comprasMostrar.map((compra, idx) => ({
            ...compra,
            __indice: compra.numero_compra || compra.id || (idx + 1)
        }));

        window.SVTable.mount({
            id: 'tabla-compras',
            container: 'tablaComprasModelo',
            title: 'Compras',
            ariaLabel: 'Tabla de compras',
            rows: comprasConIndice,
            rowId: row => row.id,
            exportFileName: 'compras',
            searchPlaceholder: 'Buscar compras por factura, proveedor o estado',
            emptyState: 'No hay compras registradas',
            pageSize: 10,
            remotePagination: {
                enabled: true,
                page: AppState.paginacion.compras?.page || 1,
                pageSize: AppState.paginacion.compras?.page_size || 10,
                total: AppState.paginacion.compras?.total || comprasMostrar.length,
                totalPages: AppState.paginacion.compras?.total_pages || 1,
                onPageChange: ({ page, pageSize, search, filters }) => this.cargarCompras({ page, pageSize, search, filters }),
                onPageSizeChange: ({ page, pageSize, search, filters }) => this.cargarCompras({ page, pageSize, search, filters }),
                onQueryChange: ({ page, pageSize, search, filters }) => this.cargarCompras({ page, pageSize, search, filters })
            },
            columns: [
                {
                    id: 'indice',
                    label: '#',
                    key: '__indice',
                    align: 'center',
                    filterable: true
                },
                {
                    id: 'factura',
                    label: 'Factura',
                    key: 'nro_factura',
                    filterable: true,
                    render: row => row.nro_factura || '-'
                },
                {
                    id: 'fecha',
                    label: 'Fecha',
                    key: 'fecha',
                    filterable: true
                },
                {
                    id: 'libro',
                    label: 'Libro',
                    key: 'fecha_libro',
                    filterable: true,
                    render: row => row.fecha_libro || '-'
                },
                {
                    id: 'proveedor',
                    label: 'Proveedor',
                    key: 'proveedor_nombre',
                    filterable: true,
                    render: row => row.proveedor_nombre || 'Sin proveedor'
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
                    id: 'estado',
                    label: 'Estado',
                    key: 'estado',
                    type: 'badge',
                    align: 'center',
                    filterable: true,
                    filterType: 'select',
                    badgeTone: row => row.estado === 'pagada' ? 'success' : row.estado === 'cancelada' ? 'danger' : 'warning',
                    render: row => row.estado
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
                        <button onclick="verDetalleCompra(${row.id})" class="btn-small" style="background: #17a2b8; color: white;" title="Ver detalle">👁️ Ver</button>
                        ${row.estado === 'pendiente' ? `<button onclick="marcarCompraPagada(${row.id})" class="btn-small" style="background: #28a745; color: white;" title="Marcar como pagada">💰 Pagar</button>` : ''}
                    `,
                    allowHtml: true,
                    exportable: false
                }
            ],
            bulkActions: [
                {
                    id: 'export-selected-csv',
                    label: 'Exportar seleccion CSV',
                    handler: () => window.SVTable.exportSelected('tabla-compras', 'csv')
                },
                {
                    id: 'clear-selection',
                    label: 'Limpiar seleccion',
                    handler: () => window.SVTable.clearSelection('tabla-compras')
                }
            ]
        });
    }
};

window.ComprasModule = ComprasModule;

function abrirModalCompra() {
    ComprasModule.productosCompra = [];
    
    const selectProveedor = document.getElementById('compraProveedor');
    if (selectProveedor) {
        selectProveedor.innerHTML = '<option value="">Seleccionar proveedor...</option>';
        AppState.proveedores.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.nombre;
            selectProveedor.appendChild(opt);
        });
        selectProveedor.value = '';
        selectProveedor.onchange = limpiarErrorProveedorCompra;
        limpiarErrorProveedorCompra();
    }
    
    // Set default dates to today
    const today = obtenerFechaActualLocal();
    const inputFecha = document.getElementById('compraFecha');
    const inputFechaLibro = document.getElementById('compraFechaLibro');
    const inputNroFactura = document.getElementById('compraNroFactura');
    
    if (inputFecha) inputFecha.value = today;
    if (inputFechaLibro) inputFechaLibro.value = today;
    if (inputNroFactura) {
        inputNroFactura.value = '';
        inputNroFactura.oninput = limpiarErrorFacturaCompra;
        limpiarErrorFacturaCompra();
    }
    
    const inputBusqueda = document.getElementById('buscarProductoCompra');
    if (inputBusqueda) {
        inputBusqueda.value = '';
    }
    
    const listaProductos = document.getElementById('listaProductosCompra');
    if (listaProductos) {
        listaProductos.innerHTML = '';
    }
    
    const totalSpan = document.getElementById('compraTotal');
    if (totalSpan) {
        totalSpan.textContent = '0.00';
    }

    const precioIndex = document.getElementById('compraPrecioIndex');
    if (precioIndex) {
        precioIndex.value = '';
    }

    cerrarModalPreciosCompra();
    
    const modal = document.getElementById('modalCompra');
    if (modal) {
        modal.style.display = 'block';
    }
}

function cerrarModalCompra() {
    cerrarModalPreciosCompra();
    document.getElementById('modalCompra').style.display = 'none';
}

async function filtrarProductosCompra(e) {
    const texto = e.target.value.toLowerCase().trim();
    const sugerencias = document.getElementById('sugerenciasCompra');
    
    // Resetear selección al escribir
    window.indiceSeleccionado = -1;
    
    // Extraer búsqueda del formato rápido (5*codigo -> busca "codigo")
    const matchRapido = texto.match(/^(\d+)[*\s]+(.+)$/);
    const busqueda = matchRapido ? matchRapido[2] : texto;
    
    if (busqueda.length === 0) {
        if (sugerencias) sugerencias.style.display = 'none';
        return;
    }

    const resultados = typeof buscarProductosRemotos === 'function'
        ? (await buscarProductosRemotos(busqueda, {}, 20)).map(item => item.producto)
        : productos.filter(p =>
            p.nombre.toLowerCase().includes(busqueda) ||
            p.codigo.toLowerCase().includes(busqueda)
        );
    
    if (resultados.length > 0 && sugerencias) {
        const esRapido = !!matchRapido;
        sugerencias.innerHTML = resultados.map(p => `
            <div class="sugerencia-item" onclick="seleccionarProductoCompra(${p.id}, ${esRapido ? matchRapido[1] : 1})" style="cursor: pointer; padding: 10px; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${p.nombre}</strong>
                        <small style="color: #666;">(${p.codigo})</small>
                        ${esRapido ? `<small style="color: #667eea; margin-left: 5px;">(x${matchRapido[1]})</small>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #28a745; font-weight: bold;">$${p.precio_costo.toFixed(2)}</div>
                        <small style="color: #666;">Stock: ${p.cantidad}</small>
                    </div>
                </div>
            </div>
        `).join('');
        sugerencias.style.display = 'block';
    } else if (sugerencias) {
        sugerencias.innerHTML = '<div class="sugerencia-item" style="cursor: default; color: #666;">No se encontraron productos</div>';
        sugerencias.style.display = 'block';
    }
}

function agregarProductoRapido(producto, cantidad) {
    const existente = ComprasModule.productosCompra.find(p => p.producto_id === producto.id);
    let index = -1;
    
    if (existente) {
        existente.cantidad += cantidad;
        recalcularSubtotalCompra(existente);
        index = ComprasModule.productosCompra.findIndex(p => p.producto_id === producto.id);
    } else {
        ComprasModule.productosCompra.push(construirItemCompra(producto, cantidad));
        index = ComprasModule.productosCompra.length - 1;
    }
    
    mostrarProductosCompra();
    abrirModalPreciosCompra(index);
    mostrarNotificacion(`✅ Agregado: ${cantidad}x ${producto.nombre}`);
}

function seleccionarProductoCompra(productoId, cantidad = 1) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    const existente = ComprasModule.productosCompra.find(p => p.producto_id === producto.id);
    let index = -1;
    
    if (existente) {
        existente.cantidad += cantidad;
        recalcularSubtotalCompra(existente);
        index = ComprasModule.productosCompra.findIndex(p => p.producto_id === producto.id);
    } else {
        ComprasModule.productosCompra.push(construirItemCompra(producto, cantidad));
        index = ComprasModule.productosCompra.length - 1;
    }
    
    document.getElementById('buscarProductoCompra').value = '';
    const sugerencias = document.getElementById('sugerenciasCompra');
    if (sugerencias) sugerencias.style.display = 'none';
    
    mostrarProductosCompra();
    abrirModalPreciosCompra(index);
    mostrarNotificacion(`✅ Agregado: ${cantidad}x ${producto.nombre}`);
}

function mostrarProductosCompra() {
    const container = document.getElementById('listaProductosCompra');
    if (!container) return;
    
    const total = ComprasModule.productosCompra.reduce((sum, p) => sum + p.subtotal, 0);
    
    const totalSpan = document.getElementById('compraTotal');
    if (totalSpan) totalSpan.textContent = total.toFixed(2);
    
    if (ComprasModule.productosCompra.length === 0) {
        container.innerHTML = '<div class="mensaje-vacio">Agregue productos buscando por nombre o código</div>';
        return;
    }
    
    container.innerHTML = `
        <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden;">
            <thead style="background: #f8f9fa;">
                <tr>
                    <th style="padding: 10px; text-align: left;">Producto</th>
                    <th style="padding: 10px; text-align: center; width: 100px;">Cantidad</th>
                    <th style="padding: 10px; text-align: center; width: 120px;">Costo $</th>
                    <th style="padding: 10px; text-align: right;">Subtotal</th>
                    <th style="padding: 10px; text-align: center; width: 50px;"></th>
                </tr>
            </thead>
            <tbody>
                ${ComprasModule.productosCompra.map((p, idx) => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px;">${p.producto_nombre}</td>
                        <td style="padding: 5px; text-align: center;">
                            <input type="number" min="1" value="${p.cantidad}" 
                                onchange="actualizarProductoCompra(${idx}, 'cantidad', this.value)"
                                style="width: 70px; padding: 5px; text-align: center; border: 1px solid #ddd; border-radius: 4px;">
                        </td>
                        <td style="padding: 5px; text-align: center;">
                            <input type="number" step="0.01" min="0" value="${p.precio_unitario.toFixed(2)}"
                                onchange="actualizarProductoCompra(${idx}, 'costo', this.value)"
                                style="width: 90px; padding: 5px; text-align: center; border: 1px solid #ddd; border-radius: 4px;">
                        </td>
                        <td style="padding: 10px; text-align: right; font-weight: bold;">
                            <div>$${p.subtotal.toFixed(2)}</div>
                            <button type="button" onclick="abrirModalPreciosCompra(${idx})" style="margin-top: 6px; border: none; background: #eef2ff; color: #4338ca; border-radius: 999px; padding: 4px 10px; cursor: pointer; font-size: 0.8rem;">Precios</button>
                        </td>
                        <td style="padding: 10px; text-align: center;">
                            <button onclick="eliminarProductoCompra(${idx})" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer;">✕</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function actualizarProductoCompra(index, campo, valor) {
    if (campo === 'cantidad') {
        ComprasModule.productosCompra[index].cantidad = parseInt(valor) || 1;
    } else if (campo === 'costo') {
        ComprasModule.productosCompra[index].precio_unitario = redondearMontoCompra(valor);
    }
    const p = ComprasModule.productosCompra[index];
    recalcularSubtotalCompra(p);
    mostrarProductosCompra();
}

function eliminarProductoCompra(index) {
    ComprasModule.productosCompra.splice(index, 1);
    mostrarProductosCompra();
}

async function guardarCompra() {
    const proveedorId = parseInt(document.getElementById('compraProveedor').value);
    const nroFactura = document.getElementById('compraNroFactura').value.trim();
    const fechaFactura = document.getElementById('compraFecha').value;
    const fechaLibro = document.getElementById('compraFechaLibro').value;
    
    if (!proveedorId) {
        marcarErrorProveedorCompra();
        return;
    }

    limpiarErrorProveedorCompra();

    if (!nroFactura) {
        marcarErrorFacturaCompra();
        return;
    }

    limpiarErrorFacturaCompra();

    if (ComprasModule.productosCompra.length === 0) {
        alert('Agregue al menos un producto');
        return;
    }
    
    const proveedorSeleccionado = AppState.proveedores.find(p => p.id === proveedorId);
    const nombreProveedor = proveedorSeleccionado ? proveedorSeleccionado.nombre : 'Proveedor';
    
    const total = ComprasModule.productosCompra.reduce((sum, p) => sum + p.subtotal, 0);
    
    const compra = {
        proveedor_id: proveedorId,
        proveedor_nombre: nombreProveedor,
        nro_factura: nroFactura,
        fecha: fechaFactura,
        fecha_libro: fechaLibro,
        total_dolares: total,
        total_bs: total * tasaDolar,
        estado: 'pendiente',
        detalles: ComprasModule.productosCompra
    };
    
    console.log('Guardando compra:', compra);
    
    try {
        const resultado = await ApiService.guardarCompra(compra);
        console.log('Resultado compra:', resultado);

        const numeroCompra = resultado?.numero_compra || resultado?.id;
        
        if (typeof cargarProductos === 'function') {
            await cargarProductos({ page: 1 });
        }
        
        mostrarNotificacion(`✅ Compra #${numeroCompra} registrada`);
        cerrarModalCompra();
        await ComprasModule.cargarCompras();
    } catch (e) {
        console.error('Error al guardar compra:', e);
        alert('Error al guardar la compra');
    }
}

async function verDetalleCompra(id) {
    console.log('ApiService:', ApiService);
    console.log('getCompra:', ApiService.getCompra);
    try {
        const compra = await ApiService.getCompra(id);
        
        const detallesHtml = compra.detalles.map(d => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${d.producto_nombre}</td>
                <td style="padding: 10px; text-align: center;">${d.cantidad}</td>
                <td style="padding: 10px; text-align: right;">$${d.precio_unitario.toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; font-weight: bold;">$${d.subtotal.toFixed(2)}</td>
            </tr>
        `).join('');
        
        const totalBs = compra.total_bs || (compra.total_dolares * tasaDolar);
        
        document.getElementById('detalleCompraInfo').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div><strong>Nro. Compra:</strong> ${compra.numero_compra || compra.id}</div>
                <div><strong>Nro. Factura:</strong> ${compra.nro_factura || '-'}</div>
                <div><strong>Proveedor:</strong> ${compra.proveedor_nombre}</div>
                <div><strong>Fecha Factura:</strong> ${compra.fecha || '-'}</div>
                <div><strong>Fecha Libro:</strong> ${compra.fecha_libro || '-'}</div>
                <div><strong>Estado:</strong> <span style="padding: 2px 6px; border-radius: 4px; background: ${compra.estado === 'pagada' ? '#d4edda' : '#fff3cd'}; color: ${compra.estado === 'pagada' ? '#155724' : '#856404'};">${compra.estado.toUpperCase()}</span></div>
                <div><strong>Total:</strong> <span style="font-weight: bold; color: #667eea;">$${compra.total_dolares.toFixed(2)}</span> / <span style="font-weight: bold;">Bs. ${totalBs.toFixed(2)}</span></div>
            </div>
        `;
        
        document.getElementById('detalleCompraTabla').innerHTML = `
            <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden;">
                <thead style="background: #f8f9fa;">
                    <tr>
                        <th style="padding: 10px; text-align: left;">Producto</th>
                        <th style="padding: 10px; text-align: center;">Cantidad</th>
                        <th style="padding: 10px; text-align: right;">Costo $</th>
                        <th style="padding: 10px; text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${detallesHtml}
                </tbody>
            </table>
        `;
        
        const modalDetalleCompra = document.getElementById('modalDetalleCompra');
        if (modalDetalleCompra) {
            modalDetalleCompra.style.zIndex = '13000';
            modalDetalleCompra.style.display = 'block';
        }
    } catch (e) {
        console.error('Error al cargar detalle:', e);
        alert('Error al cargar los detalles de la compra');
    }
}

function cerrarModalDetalleCompra() {
    const modalDetalleCompra = document.getElementById('modalDetalleCompra');
    if (!modalDetalleCompra) return;
    modalDetalleCompra.style.display = 'none';
    modalDetalleCompra.style.zIndex = '';
}

async function marcarCompraPagada(id) {
    if (confirm('¿Marcar esta compra como pagada?')) {
        await ApiService.actualizarEstadoCompra(id, 'pagada');
        await ComprasModule.cargarCompras();
        mostrarNotificacion('✅ Compra marcada como pagada');
    }
}

async function filtrarCompras() {
    const inicioInput = document.getElementById('fechaInicioCompraFiltro')?.value;
    const finInput = document.getElementById('fechaFinCompraFiltro')?.value;

    if (inicioInput && finInput) {
        const fechaInicio = new Date(`${inicioInput}T00:00:00`);
        const fechaFin = new Date(`${finInput}T23:59:59`);

        if (fechaInicio > fechaFin) {
            alert('La fecha final no puede ser menor a la inicial');
            return;
        }
    }

    await ComprasModule.aplicarFiltrosActivos();
}

async function limpiarFiltrosCompras() {
    const fechaInicio = document.getElementById('fechaInicioCompraFiltro');
    const fechaFin = document.getElementById('fechaFinCompraFiltro');
    const estado = document.getElementById('estadoCompraFiltro');

    if (fechaInicio) fechaInicio.value = '';
    if (fechaFin) fechaFin.value = '';
    if (estado) estado.value = '';

    await ComprasModule.cargarCompras({ page: 1, pageSize: AppState.paginacion.compras?.page_size || 10 });
}

async function cargarComprasDelDia() {
    const hoy = obtenerFechaActualLocal();

    const fechaInicio = document.getElementById('fechaInicioCompraFiltro');
    const fechaFin = document.getElementById('fechaFinCompraFiltro');

    if (fechaInicio) fechaInicio.value = hoy;
    if (fechaFin) fechaFin.value = hoy;

    await ComprasModule.aplicarFiltrosActivos();
}

async function cargarTodasLasCompras() {
    await limpiarFiltrosCompras();
}

function obtenerFechaActualLocal() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
}

// Event listeners para búsqueda de productos en compras
// window.indiceSeleccionado is now window.window.indiceSeleccionado

document.addEventListener('DOMContentLoaded', function() {
    const inputBusqueda = document.getElementById('buscarProductoCompra');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', filtrarProductosCompra);
        inputBusqueda.addEventListener('keydown', async function(e) {
            const sugerencias = document.getElementById('sugerenciasCompra');
            const items = sugerencias?.querySelectorAll('.sugerencia-item') || [];
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (items.length > 0) {
                    window.indiceSeleccionado = Math.min(window.indiceSeleccionado + 1, items.length - 1);
                    actualizarSeleccion(items);
                }
                return;
            }
            
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length > 0) {
                    window.indiceSeleccionado = Math.max(window.indiceSeleccionado - 1, 0);
                    actualizarSeleccion(items);
                }
                return;
            }
            
            if (e.key === 'Enter') {
                e.preventDefault();
                
                if (window.indiceSeleccionado >= 0 && items[window.indiceSeleccionado]) {
                    items[window.indiceSeleccionado].click();
                    window.indiceSeleccionado = -1;
                    return;
                }
                
                const texto = this.value.toLowerCase().trim();
                const matchRapido = texto.match(/^(\d+)[*\s]+(.+)$/);
                
                if (matchRapido) {
                    const cantidad = parseInt(matchRapido[1]);
                    const buscar = matchRapido[2].toLowerCase();
                    
                    const resultados = typeof buscarProductosRemotos === 'function'
                        ? (await buscarProductosRemotos(buscar, {}, 20)).map(item => item.producto)
                        : productos.filter(p =>
                            p.nombre.toLowerCase().includes(buscar) ||
                            p.codigo.toLowerCase().includes(buscar)
                        );
                    
                    if (resultados.length > 0) {
                        agregarProductoRapido(resultados[0], cantidad);
                        this.value = '';
                        if (sugerencias) sugerencias.style.display = 'none';
                        return;
                    }
                }
                
                if (sugerencias) {
                    const primera = sugerencias.querySelector('.sugerencia-item');
                    if (primera && sugerencias.style.display === 'block') {
                        primera.click();
                    }
                }
            }
            if (e.key === 'Escape') {
                if (sugerencias) sugerencias.style.display = 'none';
                window.indiceSeleccionado = -1;
            }
        });
    }
    
    function actualizarSeleccion(items) {
        items.forEach((item, idx) => {
            if (idx === window.indiceSeleccionado) {
                item.style.background = '#e9ecef';
                item.style.fontWeight = 'bold';
            } else {
                item.style.background = '';
                item.style.fontWeight = '';
            }
        });
    }
    
    // Cerrar sugerencias al hacer click fuera
    document.addEventListener('click', function(e) {
        const sugerencias = document.getElementById('sugerenciasCompra');
        if (sugerencias && !e.target.closest('#sugerenciasCompra') && !e.target.closest('#buscarProductoCompra')) {
            sugerencias.style.display = 'none';
        }
        window.indiceSeleccionado = -1;
    });
});
