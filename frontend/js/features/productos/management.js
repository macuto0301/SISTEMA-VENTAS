const ProductosFeature = {
    _productModal: null,
    _priceModal: null,
    _priceListModal: null,
    _productFields: null,
    _priceFields: null,
    _productActions: null,
    _priceActions: null,
    _priceListActions: null,
    _productSearchBox: null,

    inicializarComponentesProducto() {
        if (!this._productModal && window.SVModal) {
            this._productModal = window.SVModal.enhance('modalProducto', {
                titleSelector: '#modalTitulo',
                closeSelector: '#btnCerrarModalProducto',
                backdropDismissible: false
            });
        }

        if (!this._priceModal && window.SVModal) {
            this._priceModal = window.SVModal.enhance('modalProductoPrecios', {
                closeSelector: '#btnCerrarModalPreciosProducto'
            });
        }

        if (!this._priceListModal && window.SVModal) {
            this._priceListModal = window.SVModal.enhance('modalListaPrecios', {
                closeSelector: '#btnCerrarModalListaPrecios'
            });
        }

        if (!this._productFields && window.SVField) {
            this._productFields = {
                codigo: window.SVField.enhance('productoCodigo'),
                nombre: window.SVField.enhance('productoNombre'),
                descripcion: window.SVField.enhance('productoDescripcion'),
                categoria: window.SVField.enhance('productoCategoria'),
                tipo: window.SVField.enhance('productoTipo'),
                ubicacion: window.SVField.enhance('productoUbicacion'),
                marca: window.SVField.enhance('productoMarca'),
                modelo: window.SVField.enhance('productoModelo'),
                unidad: window.SVField.enhance('productoUnidad')
            };

            this._productFields.codigo?.setHelp('Si lo dejas vacio se genera automaticamente.');
        }

        if (!this._priceFields && window.SVField) {
            this._priceFields = {
                costo: window.SVField.enhance('productoPrecioCosto'),
                ganancia1: window.SVField.enhance('productoPorcentajeGanancia1'),
                precio1: window.SVField.enhance('productoPrecioDolares1'),
                ganancia2: window.SVField.enhance('productoPorcentajeGanancia2'),
                precio2: window.SVField.enhance('productoPrecioDolares2'),
                ganancia3: window.SVField.enhance('productoPorcentajeGanancia3'),
                precio3: window.SVField.enhance('productoPrecioDolares3'),
                precioBs: window.SVField.enhance('productoPrecioBolivares'),
                redondeo: window.SVField.enhance('productoMetodoRedondeo')
            };
        }

        if (!this._productActions && window.SVButtonGroup) {
            this._productActions = window.SVButtonGroup.enhance(document.querySelector('#modalProducto .form-actions'));
        }

        if (!this._priceActions && window.SVButtonGroup) {
            this._priceActions = window.SVButtonGroup.enhance(document.querySelector('#modalProductoPrecios .form-actions'));
        }

        if (!this._priceListActions && window.SVButtonGroup) {
            this._priceListActions = window.SVButtonGroup.enhance(document.querySelector('#modalListaPrecios .form-actions'));
        }

        if (!this._productSearchBox && window.SVSearchBox && document.getElementById('buscarProductoGestion')) {
            this._productSearchBox = window.SVSearchBox.enhance('buscarProductoGestion', { fullWidth: true });
        }

        return this._productFields;
    },

    obtenerCampoProducto(nombre) {
        this.inicializarComponentesProducto();
        return this._productFields?.[nombre] || null;
    },

    obtenerCampoPrecio(nombre) {
        this.inicializarComponentesProducto();
        return this._priceFields?.[nombre] || null;
    },

    limpiarErroresProducto() {
        this.inicializarComponentesProducto();
        Object.values(this._productFields || {}).forEach(field => field?.clearError?.());
    },

    limpiarErroresPrecios() {
        this.inicializarComponentesProducto();
        Object.values(this._priceFields || {}).forEach(field => field?.clearError?.());
    },

    actualizarResumenPreciosProducto() {
        this.inicializarComponentesProducto();
        const costo = parseFloat(document.getElementById('productoPrecioCosto')?.value) || 0;
        const precio1 = parseFloat(document.getElementById('productoPrecioDolares1')?.value) || 0;
        const precio2 = parseFloat(document.getElementById('productoPrecioDolares2')?.value) || 0;
        const precio3 = parseFloat(document.getElementById('productoPrecioDolares3')?.value) || 0;
        const precioBs = parseFloat(document.getElementById('productoPrecioBolivares')?.value) || 0;

        const formatearDolares = monto => `$${monto.toFixed(2)}`;
        const formatearBs = monto => `Bs ${monto.toFixed(2)}`;

        const costoEl = document.getElementById('productoResumenCosto');
        const precio1El = document.getElementById('productoResumenPrecio1');
        const precio2El = document.getElementById('productoResumenPrecio2');
        const precio3El = document.getElementById('productoResumenPrecio3');
        const precioBsEl = document.getElementById('productoResumenPrecioBs');

        if (costoEl) costoEl.textContent = formatearDolares(costo);
        if (precio1El) precio1El.textContent = formatearDolares(precio1);
        if (precio2El) precio2El.textContent = formatearDolares(precio2);
        if (precio3El) precio3El.textContent = formatearDolares(precio3);
        if (precioBsEl) precioBsEl.textContent = formatearBs(precioBs);
    },

    obtenerPaginacion(nombre) {
        if (typeof window.obtenerPaginacion === 'function') {
            return window.obtenerPaginacion(nombre);
        }
        if (window.StateCacheCore?.obtenerPaginacion) {
            return window.StateCacheCore.obtenerPaginacion(nombre);
        }
        return { page: 1, page_size: 20, total: 0, total_pages: 0, has_next: false, has_prev: false };
    },

    actualizarPaginacion(nombre, pagination) {
        if (typeof window.actualizarPaginacion === 'function') {
            window.actualizarPaginacion(nombre, pagination);
            return;
        }
        window.StateCacheCore?.actualizarPaginacion?.(nombre, pagination);
    },

    mezclarProductosEnCache(items) {
        if (typeof window.mezclarProductosEnCache === 'function') {
            window.mezclarProductosEnCache(items);
            return;
        }
        window.StateCacheCore?.mezclarProductosEnCache?.(items);
    },

    actualizarConsultaProductos(search, filters) {
        if (typeof window.actualizarConsultaProductos === 'function') {
            window.actualizarConsultaProductos(search, filters);
            return;
        }
        window.StateCacheCore?.actualizarConsultaProductos?.(search, filters);
    },

    normalizarProductoPrecios(producto) {
        if (typeof window.normalizarProductoPrecios === 'function') {
            return window.normalizarProductoPrecios(producto);
        }
        return window.PricingUtils?.normalizarProductoPrecios?.(producto) || producto;
    },

    obtenerPrecioProducto(producto, lista = 1) {
        if (typeof window.obtenerPrecioProducto === 'function') {
            return window.obtenerPrecioProducto(producto, lista);
        }
        return window.PricingUtils?.obtenerPrecioProducto?.(producto, lista) || 0;
    },

    obtenerPorcentajeGananciaProducto(producto, lista = 1) {
        if (typeof window.obtenerPorcentajeGananciaProducto === 'function') {
            return window.obtenerPorcentajeGananciaProducto(producto, lista);
        }
        return window.PricingUtils?.obtenerPorcentajeGananciaProducto?.(producto, lista) || 0;
    },

    aplicarRedondeoBs(monto, metodo = 'none') {
        if (typeof window.aplicarRedondeoBs === 'function') {
            return window.aplicarRedondeoBs(monto, metodo);
        }
        return window.PricingUtils?.aplicarRedondeoBs?.(monto, metodo) ?? monto;
    },

    construirUrlFotoProducto(fotoUrl) {
        return window.MediaUtils?.construirUrl?.(fotoUrl, this.getApiBase().replace(/\/api$/, '')) || '';
    },

    obtenerUrlsGaleriaProducto(producto) {
        return window.MediaUtils?.obtenerUrlsGaleriaProducto?.(producto, this.getApiBase().replace(/\/api$/, '')) || [];
    },

    resetearEstadoFotoProducto(currentPhotos = []) {
        return window.ProductosMediaFeature?.resetearEstadoFotoProducto?.(currentPhotos);
    },

    getApiBase() {
        if (typeof API !== 'undefined' && API?.baseUrl) {
            return API.baseUrl;
        }
        return 'http://localhost:5000/api';
    },

    getAuthHeaders() {
        if (typeof API !== 'undefined' && typeof API.getAuthHeaders === 'function') {
            return API.getAuthHeaders();
        }
        try {
            const sesion = JSON.parse(localStorage.getItem('sesion_ventas') || sessionStorage.getItem('sesion_ventas') || 'null');
            if (sesion?.token) {
                return { Authorization: `Bearer ${sesion.token}` };
            }
        } catch (error) {
            console.warn('No se pudo leer la sesion local', error);
        }
        return {};
    },

    escaparHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    normalizarTipoProducto(tipo) {
        return String(tipo || 'producto').trim().toLowerCase() === 'servicio' ? 'servicio' : 'producto';
    },

    productoManejaExistencia(producto) {
        if (typeof producto?.maneja_existencia === 'boolean') {
            return producto.maneja_existencia;
        }
        return this.normalizarTipoProducto(producto?.tipo) !== 'servicio';
    },

    descargarBlob(blob, nombreArchivo) {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    obtenerFechaLista() {
        if (window.Utils?.obtenerFechaHoy) {
            return window.Utils.obtenerFechaHoy();
        }
        return new Date().toLocaleDateString('es-ES');
    },

    obtenerDatosEmpresaLista() {
        return {
            nombre: window.AppState.nombreEmpresa || 'Mi Empresa',
            rif: window.AppState.rifEmpresa || '',
            direccion: window.AppState.direccionEmpresa || '',
            telefono: window.AppState.telefonoEmpresa || '',
            correo: window.AppState.correoEmpresa || ''
        };
    },

    obtenerResumenListaPrecio(numeroLista) {
        const etiquetas = {
            1: 'Precio 1',
            2: 'Precio 2',
            3: 'Precio 3'
        };
        return etiquetas[Number(numeroLista)] || 'Precio 1';
    },

    obtenerProductosVisiblesLista() {
        return Array.isArray(window.AppState.productosVista) && window.AppState.productosVista.length
            ? window.AppState.productosVista
            : (window.productos || []);
    },

    obtenerBusquedaActualLista() {
        return String(document.getElementById('buscarProductoGestion')?.value || window.AppState.productosQuery?.search || '').trim();
    },

    incluirSinExistenciaLista() {
        return Boolean(document.getElementById('listaPreciosIncluirSinExistencia')?.checked);
    },

    obtenerAlcanceLista() {
        return document.getElementById('listaPreciosAlcance')?.value || 'filtrado';
    },

    construirFiltrosLista() {
        const filtros = { ...(window.AppState.productosQuery?.filters || {}) };
        if (!this.incluirSinExistenciaLista()) {
            filtros.in_stock = 'true';
        } else {
            delete filtros.in_stock;
        }
        return filtros;
    },

    abrirModalListaPrecios() {
        this.inicializarComponentesProducto();
        const modal = document.getElementById('modalListaPrecios');
        const form = document.getElementById('formListaPrecios');
        if (!modal || !form) return;

        form.reset();
        const descuentoInput = document.getElementById('listaPreciosDescuento');
        const tipoPrecio = document.getElementById('listaPreciosTipoPrecio');
        const formatoSalida = document.getElementById('listaPreciosFormatoSalida');
        const alcanceLista = document.getElementById('listaPreciosAlcance');
        const cantidadModo = document.getElementById('listaPreciosCantidadModo');

        if (descuentoInput) descuentoInput.value = '0';
        if (tipoPrecio) tipoPrecio.value = '1';
        if (formatoSalida) formatoSalida.value = 'excel';
        if (alcanceLista) alcanceLista.value = 'filtrado';
        if (cantidadModo) cantidadModo.value = 'blank';
        const incluirSinExistencia = document.getElementById('listaPreciosIncluirSinExistencia');
        if (incluirSinExistencia) incluirSinExistencia.checked = false;
        this._priceListActions?.setLoading('btnGenerarListaPrecios', false);
        this._priceListModal?.open();
    },

    cerrarModalListaPrecios() {
        this.inicializarComponentesProducto();
        this._priceListActions?.setLoading('btnGenerarListaPrecios', false);
        this._priceListModal?.close();
    },

    async cargarProductosParaLista() {
        const alcance = this.obtenerAlcanceLista();
        const search = alcance === 'filtrado' ? this.obtenerBusquedaActualLista() : '';
        const filters = this.construirFiltrosLista();
        const paginacion = this.obtenerPaginacion('productos');
        const acumulados = [];
        const vistos = new Set();
        let page = 1;
        const pageSize = 200;

        while (true) {
            const response = await window.ApiService.cargarProductos({ page, pageSize, search, filters });
            const items = (response.items || []).map(item => this.normalizarProductoPrecios(item));
            items.forEach(item => {
                const key = String(item.id || item.codigo || `${item.nombre}-${acumulados.length}`);
                if (vistos.has(key)) return;
                vistos.add(key);
                acumulados.push(item);
            });

            if (!response.pagination?.has_next) {
                break;
            }
            page += 1;
        }

        if (!acumulados.length && !search && !(paginacion.total || 0)) {
            return [];
        }

        return acumulados;
    },

    construirFilasLista(productos, numeroLista, modoCantidad) {
        return productos.map(producto => {
            const precio = this.obtenerPrecioProducto(producto, numeroLista);
            const cantidad = modoCantidad === 'one' ? 1 : '';
            const total = modoCantidad === 'one' ? precio : 0;
            return {
                codigo: producto.codigo || '',
                nombre: producto.nombre || '',
                precio,
                cantidad,
                total
            };
        });
    },

    construirDocumentoListaPrecios(datos) {
        const empresa = datos.empresa;
        const cliente = datos.cliente;
        const primeraFilaDatos = 8;
        const filasHtml = datos.filas.map((fila, index) => {
            const filaExcel = primeraFilaDatos + index;
            const formulaTotal = `=C${filaExcel}*D${filaExcel}`;
            return `
            <tr>
                <td class="lp-code">${this.escaparHtml(fila.codigo || `ITEM-${index + 1}`)}</td>
                <td class="lp-name">${this.escaparHtml(fila.nombre)}</td>
                <td class="lp-money" x:num="${fila.precio.toFixed(2)}">${fila.precio.toFixed(2)}</td>
                <td class="lp-qty" x:num="${fila.cantidad === '' ? 0 : fila.cantidad}">${fila.cantidad === '' ? '&nbsp;' : fila.cantidad}</td>
                <td class="lp-money" x:fmla="${formulaTotal}" x:num="${fila.total.toFixed(2)}">${fila.total.toFixed(2)}</td>
            </tr>
        `;
        }).join('');

        const ultimaFilaDatos = primeraFilaDatos + Math.max(datos.filas.length - 1, 0);
        const filaSubtotal = ultimaFilaDatos + 1;
        const filaDescuento = filaSubtotal + 1;
        const filaTotal = filaDescuento + 1;
        const formulaSubtotal = `=SUM(E${primeraFilaDatos}:E${ultimaFilaDatos})`;
        const formulaDescuento = `=E${filaSubtotal}*${(datos.descuento / 100).toFixed(4)}`;
        const formulaTotalFinal = `=E${filaSubtotal}-E${filaDescuento}`;

        return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="UTF-8">
    <title>${this.escaparHtml(datos.tituloDocumento)}</title>
    <style>
        body { font-family: Georgia, 'Times New Roman', serif; margin: 0; padding: 18px; color: #10233a; background: #ffffff; }
        .lp-sheet { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .lp-sheet td, .lp-sheet th { border: 1px solid #7c8ea3; padding: 6px 8px; vertical-align: middle; }
        .lp-clean { border: none !important; }
        .lp-company { font-size: 28px; font-weight: 700; text-align: center; border: none !important; padding: 4px 0 10px; }
        .lp-contact { border: none !important; font-size: 13px; font-weight: 700; color: #183b64; padding-bottom: 10px; }
        .lp-contact-right { border: none !important; font-size: 13px; text-align: right; color: #183b64; padding-bottom: 10px; }
        .lp-doc-title { border: none !important; color: #b32020; font-size: 15px; font-weight: 700; padding-bottom: 8px; }
        .lp-label { width: 90px; font-weight: 700; background: #f4f6f9; text-transform: uppercase; }
        .lp-client-value { font-weight: 700; }
        .lp-head { background: #d9e6f2; text-transform: uppercase; font-weight: 700; text-align: center; }
        .lp-code { width: 90px; font-weight: 700; }
        .lp-name { width: auto; font-weight: 700; }
        .lp-qty { width: 90px; text-align: center; }
        .lp-money { width: 120px; text-align: right; font-weight: 700; }
        .lp-summary-label { font-weight: 700; text-transform: uppercase; background: #fff08a; }
        .lp-summary-value { text-align: right; font-weight: 700; background: #edd1ef; }
        .lp-summary-total-label { font-size: 18px; font-weight: 700; text-transform: uppercase; background: #edd1ef; }
        .lp-summary-total-value { font-size: 22px; text-align: right; font-weight: 700; background: #edd1ef; }
        .lp-muted { color: #50657d; font-size: 12px; }
        @media print {
            body { padding: 10mm; }
            @page { size: auto; margin: 10mm; }
        }
    </style>
</head>
<body>
    <table class="lp-sheet">
        <colgroup>
            <col style="width: 70px;">
            <col>
            <col style="width: 120px;">
            <col style="width: 90px;">
            <col style="width: 130px;">
        </colgroup>
        <tr>
            <td colspan="5" class="lp-company">${this.escaparHtml(empresa.nombre)}</td>
        </tr>
        <tr>
            <td colspan="3" class="lp-contact">CORREO ${this.escaparHtml(empresa.correo || '-')}</td>
            <td colspan="2" class="lp-contact-right">TEL ${this.escaparHtml(empresa.telefono || '-')}</td>
        </tr>
        <tr>
            <td colspan="3" class="lp-doc-title">LISTA DE PRECIOS - ${this.escaparHtml(datos.etiquetaPrecio)}</td>
            <td colspan="2" class="lp-contact-right">FECHA ${this.escaparHtml(datos.fecha)}</td>
        </tr>
        <tr>
            <td class="lp-label">CLIENTE</td>
            <td colspan="4" class="lp-client-value">${this.escaparHtml(cliente.nombre || '')}</td>
        </tr>
        <tr>
            <td class="lp-label">DIREC</td>
            <td colspan="4" class="lp-client-value">${this.escaparHtml(cliente.direccion || '')}</td>
        </tr>
        <tr>
            <td class="lp-label">TEL</td>
            <td colspan="2" class="lp-client-value">${this.escaparHtml(cliente.telefono || '')}</td>
            <td class="lp-label">RIF</td>
            <td class="lp-client-value">${this.escaparHtml(cliente.rif || '')}</td>
        </tr>
        <tr>
            <th class="lp-head">Codigo</th>
            <th class="lp-head">Producto</th>
            <th class="lp-head">Precio</th>
            <th class="lp-head">Cantidad</th>
            <th class="lp-head">Total</th>
        </tr>
        ${filasHtml}
        <tr>
            <td colspan="3" class="lp-clean"></td>
            <td class="lp-summary-label">Subtotal</td>
            <td class="lp-summary-value" x:fmla="${formulaSubtotal}" x:num="${datos.subtotal.toFixed(2)}">${datos.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
            <td colspan="3" class="lp-clean"></td>
            <td class="lp-summary-label">Descuento ${datos.descuento.toFixed(2)}%</td>
            <td class="lp-summary-value" x:fmla="${formulaDescuento}" x:num="${datos.montoDescuento.toFixed(2)}">${datos.montoDescuento.toFixed(2)}</td>
        </tr>
        <tr>
            <td colspan="3" class="lp-clean"></td>
            <td class="lp-summary-total-label">Total</td>
            <td class="lp-summary-total-value" x:fmla="${formulaTotalFinal}" x:num="${datos.total.toFixed(2)}">${datos.total.toFixed(2)}</td>
        </tr>
        <tr>
            <td colspan="5" class="lp-clean lp-muted">${this.escaparHtml(empresa.direccion || '')}${empresa.rif ? ` | RIF ${this.escaparHtml(empresa.rif)}` : ''}</td>
        </tr>
    </table>
</body>
</html>`;
    },

    exportarListaPreciosExcel(html, nombreArchivo) {
        this.descargarBlob(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), nombreArchivo);
    },

    abrirVistaImprimibleListaPrecios(html, titulo) {
        const ventana = window.open('', '_blank', 'width=1200,height=800');
        if (!ventana) {
            window.mostrarNotificacion?.('⚠️ El navegador bloqueo la ventana de impresion');
            return;
        }
        ventana.document.write(html);
        ventana.document.close();
        ventana.focus();
        setTimeout(() => ventana.print(), 500);
    },

    async generarListaPrecios(event) {
        this.inicializarComponentesProducto();
        if (event) event.preventDefault();

        const tipoPrecio = Number(document.getElementById('listaPreciosTipoPrecio')?.value || 1);
        const formatoSalida = document.getElementById('listaPreciosFormatoSalida')?.value || 'excel';
        const modoCantidad = document.getElementById('listaPreciosCantidadModo')?.value || 'blank';
        const descuento = Math.max(0, Math.min(100, parseFloat(document.getElementById('listaPreciosDescuento')?.value || '0') || 0));
        try {
            this._priceListActions?.setLoading('btnGenerarListaPrecios', true, 'Generando...');
            this._priceListModal?.setBusy(true, 'Preparando lista de precios...');

            const productos = await this.cargarProductosParaLista();
            if (!productos.length) {
                this._priceListActions?.setLoading('btnGenerarListaPrecios', false);
                this._priceListModal?.setBusy(false);
                window.mostrarNotificacion?.('⚠️ No hay productos para generar la lista');
                return;
            }

            const filas = this.construirFilasLista(productos, tipoPrecio, modoCantidad);
            const subtotal = filas.reduce((acum, fila) => acum + fila.total, 0);
            const montoDescuento = subtotal * (descuento / 100);
            const total = subtotal - montoDescuento;
            const etiquetaPrecio = this.obtenerResumenListaPrecio(tipoPrecio);
            const cliente = {
                nombre: document.getElementById('listaPreciosCliente')?.value.trim() || '',
                direccion: document.getElementById('listaPreciosDireccion')?.value.trim() || '',
                telefono: document.getElementById('listaPreciosTelefono')?.value.trim() || '',
                rif: document.getElementById('listaPreciosRif')?.value.trim() || ''
            };
            const fecha = this.obtenerFechaLista();
            const html = this.construirDocumentoListaPrecios({
                tituloDocumento: `Lista de precios ${etiquetaPrecio}`,
                etiquetaPrecio,
                fecha,
                empresa: this.obtenerDatosEmpresaLista(),
                cliente,
                filas,
                subtotal,
                descuento,
                montoDescuento,
                total
            });
            const fechaArchivo = new Date().toISOString().slice(0, 10);
            const nombreArchivo = `lista-precios-${tipoPrecio}-${fechaArchivo}.xls`;

            if (formatoSalida === 'pdf') {
                this.abrirVistaImprimibleListaPrecios(html, `Lista de precios ${etiquetaPrecio}`);
            } else {
                this.exportarListaPreciosExcel(html, nombreArchivo);
            }

            this.cerrarModalListaPrecios();
            window.mostrarNotificacion?.('✅ Lista de precios generada');
        } catch (error) {
            console.error('Error generando lista de precios:', error);
            window.mostrarNotificacion?.('⚠️ No se pudo generar la lista de precios');
        } finally {
            this._priceListActions?.setLoading('btnGenerarListaPrecios', false);
            this._priceListModal?.setBusy(false);
        }
    },

    async cargarProductos(options = {}) {
        const paginacionActual = this.obtenerPaginacion('productos');
        const append = options.append === true;
        const page = options.page || (append ? paginacionActual.page + 1 : 1);
        const pageSize = options.pageSize || paginacionActual.page_size || 20;
        const querySearch = options.search !== undefined ? options.search : (window.AppState.productosQuery?.search || '');
        const queryFilters = options.filters !== undefined ? options.filters : (window.AppState.productosQuery?.filters || {});
        const response = await window.ApiService.cargarProductos({ page, pageSize, search: querySearch, filters: queryFilters });
        response.items = (response.items || []).map(item => this.normalizarProductoPrecios(item));

        this.actualizarConsultaProductos(querySearch, queryFilters);
        this.mezclarProductosEnCache(response.items);

        const listaVistaActual = Array.isArray(window.AppState.productosVista) ? window.AppState.productosVista : [];
        window.AppState.productosVista = append
            ? [...listaVistaActual, ...response.items.filter(item => !listaVistaActual.some(existing => existing.id === item.id))]
            : response.items;

        this.actualizarPaginacion('productos', response.pagination);

        if (options.render !== false) {
            this.mostrarProductos();
        }
    },

    async cargarMasProductos() {
        const paginacion = this.obtenerPaginacion('productos');
        if (!paginacion.has_next) return;
        await this.cargarProductos({ append: true });
    },

    async buscarProductosRemotos(termino, filters = {}, pageSize = 20) {
        const texto = String(termino || '').trim();
        if (!texto) return [];

        const response = await window.ApiService.cargarProductos({
            page: 1,
            pageSize,
            search: texto,
            filters
        });
        response.items = (response.items || []).map(item => this.normalizarProductoPrecios(item));

        this.mezclarProductosEnCache(response.items);
        return response.items.map(producto => ({
            producto,
            index: window.AppState.productos.findIndex(item => item.id === producto.id)
        })).filter(item => item.index >= 0);
    },

    construirFilasTablaProductos(lista) {
        return lista.map((producto, index) => {
            const cacheIndex = window.productos.findIndex(item => item.id === producto.id || item.codigo === producto.codigo);
            const fotosProductoUrls = this.obtenerUrlsGaleriaProducto(producto);
            const fotoPrincipalUrl = fotosProductoUrls[0] || this.construirUrlFotoProducto(producto.foto_url);

            return {
                ...producto,
                __rowId: producto.id || producto.codigo || `producto-${index}`,
                __cacheIndex: cacheIndex,
                __fotoPrincipalUrl: fotoPrincipalUrl,
                __detalleTecnico: [producto.marca, producto.modelo].filter(Boolean).join(' '),
                __detalleInventario: [
                    producto.unidad ? `Unidad: ${producto.unidad}` : '',
                    producto.ubicacion ? `Ubicacion: ${producto.ubicacion}` : ''
                ].filter(Boolean).join(' | '),
                __precio1: this.obtenerPrecioProducto(producto, 1),
                __precio2: this.obtenerPrecioProducto(producto, 2),
                __precio3: this.obtenerPrecioProducto(producto, 3),
                __precioBs: this.aplicarRedondeoBs(this.obtenerPrecioProducto(producto, 1) * window.tasaDolar, producto.metodo_redondeo || 'none')
            };
        });
    },

    sincronizarBusquedaGestion(valor) {
        const input = document.getElementById('buscarProductoGestion');
        if (input && input.value !== valor) {
            input.value = valor;
        }
    },

    async guardarProducto(e) {
        this.inicializarComponentesProducto();
        if (e) e.preventDefault();
        const formProducto = document.getElementById('formProducto');
        this.limpiarErroresProducto();
        this.limpiarErroresPrecios();

        if (formProducto && !formProducto.reportValidity()) {
            return;
        }

        const idServidor = document.getElementById('productoId').getAttribute('data-server-id');

        const codigoInput = document.getElementById('productoCodigo');
        const codigo = codigoInput.value || `PROD-${(window.productos.length + 1).toString().padStart(4, '0')}`;
        const nombre = document.getElementById('productoNombre').value;
        const descripcion = document.getElementById('productoDescripcion').value;
        const precioCosto = parseFloat(document.getElementById('productoPrecioCosto').value) || 0;
        const porcentajeGanancia1 = parseFloat(document.getElementById('productoPorcentajeGanancia1').value) || 0;
        const porcentajeGanancia2 = parseFloat(document.getElementById('productoPorcentajeGanancia2').value) || 0;
        const porcentajeGanancia3 = parseFloat(document.getElementById('productoPorcentajeGanancia3').value) || 0;
        const precioDolares1 = parseFloat(document.getElementById('productoPrecioDolares1').value) || 0;
        const precioDolares2 = parseFloat(document.getElementById('productoPrecioDolares2').value) || 0;
        const precioDolares3 = parseFloat(document.getElementById('productoPrecioDolares3').value) || 0;
        const categoria = document.getElementById('productoCategoria').value;
        const tipo = this.normalizarTipoProducto(document.getElementById('productoTipo')?.value);
        const ubicacion = document.getElementById('productoUbicacion').value;
        const marca = document.getElementById('productoMarca').value;
        const modelo = document.getElementById('productoModelo').value;
        const unidad = document.getElementById('productoUnidad').value;
        const metodoRedondeo = document.getElementById('productoMetodoRedondeo').value;
        const fotos = (window.ProductosMediaFeature?.productoFotosSeleccionadas || []).map(item => item.file);
        const removePhoto = document.getElementById('productoFotoEliminar').value === 'true';

        if (!String(nombre || '').trim()) {
            this.obtenerCampoProducto('nombre')?.setError('El nombre del producto es obligatorio').focus();
            window.mostrarNotificacion('⚠️ El nombre del producto es obligatorio');
            return;
        }

        if (!String(descripcion || '').trim()) {
            this.obtenerCampoProducto('descripcion')?.setError('La descripcion del producto es obligatoria').focus();
            window.mostrarNotificacion('⚠️ La descripcion del producto es obligatoria');
            return;
        }

        if (!String(categoria || '').trim()) {
            this.obtenerCampoProducto('categoria')?.setError('La categoria del producto es obligatoria').focus();
            window.mostrarNotificacion('⚠️ La categoria del producto es obligatoria');
            return;
        }

        if (precioDolares1 <= 0 || precioDolares2 <= 0 || precioDolares3 <= 0) {
            this.obtenerCampoPrecio('precio1')?.setError(precioDolares1 <= 0 ? 'Debe indicar un precio mayor a cero' : '');
            this.obtenerCampoPrecio('precio2')?.setError(precioDolares2 <= 0 ? 'Debe indicar un precio mayor a cero' : '');
            this.obtenerCampoPrecio('precio3')?.setError(precioDolares3 <= 0 ? 'Debe indicar un precio mayor a cero' : '');
            this.abrirModalPreciosProducto();
            window.mostrarNotificacion('⚠️ Ajusta los precios P1, P2 y P3 antes de guardar');
            return;
        }

        const formData = new FormData();
        formData.append('codigo', codigo);
        formData.append('nombre', nombre);
        formData.append('tipo', tipo);
        formData.append('descripcion', descripcion);
        formData.append('precio_costo', String(precioCosto));
        formData.append('porcentaje_ganancia', String(porcentajeGanancia1));
        formData.append('precio_dolares', String(precioDolares1));
        formData.append('porcentaje_ganancia_1', String(porcentajeGanancia1));
        formData.append('porcentaje_ganancia_2', String(porcentajeGanancia2));
        formData.append('porcentaje_ganancia_3', String(porcentajeGanancia3));
        formData.append('precio_1_dolares', String(precioDolares1));
        formData.append('precio_2_dolares', String(precioDolares2));
        formData.append('precio_3_dolares', String(precioDolares3));
        formData.append('cantidad', '0');
        formData.append('categoria', categoria);
        formData.append('ubicacion', ubicacion);
        formData.append('marca', marca);
        formData.append('modelo', modelo);
        formData.append('unidad', unidad);
        formData.append('metodo_redondeo', metodoRedondeo);
        formData.append('remove_photo', removePhoto ? 'true' : 'false');

        formData.append('fotos_existentes', JSON.stringify((window.ProductosMediaFeature?.productoFotosExistentes || []).map(foto => foto.path)));

        fotos.forEach(foto => {
            formData.append('fotos', foto);
        });

        try {
            this._productActions?.setLoading('btnGuardarProducto', true, idServidor ? 'Actualizando...' : 'Guardando...');
            this._productModal?.setBusy(true, idServidor ? 'Actualizando producto...' : 'Guardando producto...');
            const apiBase = this.getApiBase();
            const url = idServidor ? `${apiBase}/productos/${idServidor}` : `${apiBase}/productos/`;
            const method = idServidor ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { ...this.getAuthHeaders() },
                body: formData
            });

            if (res.ok) {
                window.mostrarNotificacion(idServidor ? '✅ Producto actualizado en servidor' : '✅ Producto creado en servidor');
                await this.cargarProductos();
                this.cerrarModalProducto();
                return;
            }
            this._productActions?.setLoading('btnGuardarProducto', false);
            this._productModal?.setBusy(false);
            const error = await res.json().catch(() => null);
            window.mostrarNotificacion(`⚠️ ${error?.error || 'No se pudo guardar el producto en el servidor'}`);
        } catch (error) {
            this._productActions?.setLoading('btnGuardarProducto', false);
            this._productModal?.setBusy(false);
            window.mostrarNotificacion('⚠️ No se pudo guardar el producto en el servidor');
        }
    },

    async eliminarProducto(index) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;

        const prod = window.productos[index];
        if (!prod?.id) {
            window.mostrarNotificacion('⚠️ El producto no existe en el servidor');
            return;
        }

        try {
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/productos/${prod.id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            if (!res.ok) {
                window.mostrarNotificacion('⚠️ No se pudo eliminar el producto');
                return;
            }

            await this.cargarProductos();
            window.mostrarNotificacion('✅ Producto eliminado');
        } catch (error) {
            console.error('No se pudo eliminar en servidor', error);
            window.mostrarNotificacion('⚠️ No se pudo eliminar el producto');
        }
    },

    mostrarProductos(productosAMostrar = null) {
        this.inicializarComponentesProducto();
        const grid = document.getElementById('productosGrid');
        if (!grid) return;
        const lista = productosAMostrar || window.AppState.productosVista || window.productos;
        const paginacion = this.obtenerPaginacion('productos');
        const searchActual = String(window.AppState.productosQuery?.search || document.getElementById('buscarProductoGestion')?.value || '').trim();
        const mensajeVacio = lista.length === 0
            ? (window.productos.length === 0
                ? '📦 No hay productos registrados'
                : `🔍 No se encontraron coincidencias${paginacion.has_next ? '. Carga mas productos para seguir buscando.' : ''}`)
            : 'No hay productos para mostrar';

        grid.classList.add('productos-grid-tabla');

        if (!window.SVTable) {
            grid.innerHTML = '<div class="mensaje-vacio" style="text-align: center; padding: 40px; color: #666;">⚠️ El componente de tabla no esta disponible</div>';
            return;
        }

        grid.innerHTML = '<div id="tablaProductosGestion"></div>';

        const filas = this.construirFilasTablaProductos(lista);
        const instanciaExistente = window.SVTable.getInstance?.('tabla-productos-gestion');
        if (instanciaExistente) {
            instanciaExistente.state.search = searchActual;
            instanciaExistente.state.draftSearch = searchActual;
            instanciaExistente.state.page = Number(paginacion.page || 1);
        }

        window.SVTable.mount({
            id: 'tabla-productos-gestion',
            container: 'tablaProductosGestion',
            title: 'Gestion de Productos',
            ariaLabel: 'Tabla de gestion de productos',
            rows: filas,
            rowId: row => row.__rowId,
            exportFileName: 'productos',
            searchPlaceholder: 'Buscar productos por nombre, codigo o descripcion',
            emptyState: mensajeVacio,
            pageSize: paginacion.page_size || 20,
            remotePagination: {
                enabled: true,
                page: paginacion.page || 1,
                pageSize: paginacion.page_size || 20,
                total: paginacion.total || lista.length,
                totalPages: paginacion.total_pages || 1,
                onPageChange: ({ page, pageSize, search, filters }) => this.cargarProductos({ page, pageSize, search, filters }),
                onPageSizeChange: ({ page, pageSize, search, filters }) => this.cargarProductos({ page, pageSize, search, filters }),
                onQueryChange: ({ page, pageSize, search, filters }) => {
                    this.sincronizarBusquedaGestion(search || '');
                    this.cargarProductos({ page, pageSize, search, filters });
                }
            },
            columns: [
                {
                    id: 'codigo',
                    label: 'Codigo',
                    key: 'codigo',
                    filterable: true
                },
                {
                    id: 'producto',
                    label: 'Producto',
                    key: 'nombre',
                    filterable: true,
                    render: row => {
                        const nombre = this.escaparHtml(row.nombre || 'Sin nombre');
                        const detalle = this.escaparHtml(row.__detalleTecnico || row.__detalleInventario || 'Sin detalles');
                        const imagen = row.__fotoPrincipalUrl && row.__cacheIndex >= 0
                            ? `<button type="button" onclick="abrirGaleriaProductoPorIndice(${row.__cacheIndex}, 0)" style="width: 36px; height: 36px; border: 0; border-radius: 10px; overflow: hidden; padding: 0; cursor: pointer; background: #f3f4f6; flex-shrink: 0;"><img src="${this.escaparHtml(row.__fotoPrincipalUrl)}" alt="${nombre}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;"></button>`
                            : '<div style="width: 36px; height: 36px; border-radius: 10px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 9px; flex-shrink: 0;">Foto</div>';
                        return `
                            <div style="display: flex; gap: 8px; align-items: center; min-width: 220px;">
                                ${imagen}
                                <div class="sv-table-stack sv-table-stack--dense" style="min-width: 0;">
                                    <strong style="line-height: 1.2;">${nombre}</strong>
                                    <small style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${detalle}</small>
                                </div>
                            </div>
                        `;
                    },
                    allowHtml: true,
                    searchValue: row => `${row.nombre || ''} ${row.descripcion || ''} ${row.__detalleTecnico || ''} ${row.__detalleInventario || ''}`
                },
                {
                    id: 'categoria',
                    label: 'Categoria',
                    key: 'categoria',
                    filterable: true,
                    filterType: 'select',
                    render: row => row.categoria || 'Sin categoria'
                },
                {
                    id: 'tipo',
                    label: 'Tipo',
                    key: 'tipo',
                    filterable: true,
                    filterType: 'select',
                    render: row => this.normalizarTipoProducto(row.tipo) === 'servicio' ? 'Servicio' : 'Producto'
                },
                {
                    id: 'ubicacion',
                    label: 'Ubicacion',
                    key: 'ubicacion',
                    filterable: true,
                    render: row => row.ubicacion || '-'
                },
                {
                    id: 'stock',
                    label: 'Stock',
                    key: 'cantidad',
                    align: 'center',
                    filterable: true,
                    render: row => this.productoManejaExistencia(row) ? Number(row.cantidad || 0) : 'N/A'
                },
                {
                    id: 'precio1',
                    label: 'P1',
                    key: '__precio1',
                    type: 'money',
                    currency: '$',
                    align: 'right',
                    filterable: true
                },
                {
                    id: 'precio2',
                    label: 'P2',
                    key: '__precio2',
                    type: 'money',
                    currency: '$',
                    align: 'right',
                    filterable: true
                },
                {
                    id: 'precio3',
                    label: 'P3',
                    key: '__precio3',
                    type: 'money',
                    currency: '$',
                    align: 'right',
                    filterable: true
                },
                {
                    id: 'precioBs',
                    label: 'Bs',
                    key: '__precioBs',
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
                    render: row => row.__cacheIndex < 0 ? '-' : `
                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: nowrap;">
                            <button onclick="agregarAlCarrito(${row.__cacheIndex})" class="btn-small" style="background: #2563eb; color: white; min-height: 30px; padding: 4px 8px; font-size: 12px; border-radius: 10px;" title="Agregar al carrito">🛒</button>
                            <button onclick="editarProducto(${row.__cacheIndex})" class="btn-small" style="background: #f59e0b; color: white; min-height: 30px; padding: 4px 8px; font-size: 12px; border-radius: 10px;" title="Editar producto">✏️</button>
                            <button onclick="eliminarProducto(${row.__cacheIndex})" class="btn-small" style="background: #dc2626; color: white; min-height: 30px; padding: 4px 8px; font-size: 12px; border-radius: 10px;" title="Eliminar producto">🗑️</button>
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
                    handler: () => window.SVTable.exportSelected('tabla-productos-gestion', 'csv')
                },
                {
                    id: 'clear-selection',
                    label: 'Limpiar seleccion',
                    handler: () => window.SVTable.clearSelection('tabla-productos-gestion')
                }
            ]
        });
    },

    filtrarProductosGestion() {
        this.inicializarComponentesProducto();
        const termino = document.getElementById('buscarProductoGestion').value.toLowerCase();

        if (!termino) {
            this.cargarProductos({ page: 1, search: '', filters: {} });
            return;
        }

        this.cargarProductos({ page: 1, search: termino, filters: {} });
    },

    mostrarFormularioProducto() {
        this.inicializarComponentesProducto();
        this._productModal?.setTitle('Nuevo producto');
        document.getElementById('formProducto').reset();
        document.getElementById('productoId').value = '-1';
        document.getElementById('productoId').removeAttribute('data-server-id');
        document.getElementById('productoPorcentajeGanancia1').value = window.porcentajeGananciaDefecto;
        document.getElementById('productoPorcentajeGanancia2').value = window.porcentajeGananciaDefecto;
        document.getElementById('productoPorcentajeGanancia3').value = window.porcentajeGananciaDefecto;
        document.getElementById('productoPrecioDolares1').value = '';
        document.getElementById('productoPrecioDolares2').value = '';
        document.getElementById('productoPrecioDolares3').value = '';
        document.getElementById('productoTipo').value = 'producto';
        document.getElementById('productoMetodoRedondeo').value = 'none';
        document.getElementById('productoCantidad').value = 0;
        document.getElementById('productoCodigo').disabled = false;
        document.getElementById('productoPrecioBolivares').value = '';
        this.limpiarErroresProducto();
        this.limpiarErroresPrecios();
        this._productActions?.setLoading('btnGuardarProducto', false);
        this._productModal?.setBusy(false);
        this.resetearEstadoFotoProducto([]);
        this.actualizarResumenPreciosProducto();
        this._productModal?.open()?.focusFirstField();
    },

    calcularPrecioVenta(lista = 1) {
        const costo = parseFloat(document.getElementById('productoPrecioCosto').value) || 0;
        const porcentaje = parseFloat(document.getElementById(`productoPorcentajeGanancia${lista}`).value) || 0;

        if (costo > 0) {
            const precioVenta = costo * (1 + (porcentaje / 100));
            document.getElementById(`productoPrecioDolares${lista}`).value = precioVenta.toFixed(2);
            if (lista === 1) {
                this.calcularPrecioBolivares();
            }
            this.actualizarResumenPreciosProducto();
        }
    },

    recalcularPreciosProducto() {
        PRICE_LIST_NUMBERS.forEach(lista => this.calcularPrecioVenta(lista));
    },

    calcularPrecioBolivares() {
        const precioDolares = parseFloat(document.getElementById('productoPrecioDolares1').value) || 0;
        const metodo = document.getElementById('productoMetodoRedondeo').value;
        const precioBs = window.aplicarRedondeoBs(precioDolares * window.tasaDolar, metodo);
        document.getElementById('productoPrecioBolivares').value = precioBs ? precioBs.toFixed(2) : '';
        this.actualizarResumenPreciosProducto();
    },

    recalcularPorcentajeGanancia(lista = 1) {
        const costo = parseFloat(document.getElementById('productoPrecioCosto').value) || 0;
        const precioVenta = parseFloat(document.getElementById(`productoPrecioDolares${lista}`).value) || 0;

        if (costo > 0 && precioVenta > 0) {
            const porcentaje = ((precioVenta / costo) - 1) * 100;
            document.getElementById(`productoPorcentajeGanancia${lista}`).value = porcentaje.toFixed(4);
        }
        this.actualizarResumenPreciosProducto();
    },

    calcularPrecioDolares() {
        const precioBs = parseFloat(document.getElementById('productoPrecioBolivares').value) || 0;
        const precioDolares = precioBs / window.tasaDolar;
        document.getElementById('productoPrecioDolares1').value = precioDolares ? precioDolares.toFixed(2) : '';
        this.recalcularPorcentajeGanancia(1);
        this.actualizarResumenPreciosProducto();
    },

    abrirModalPreciosProducto() {
        this.inicializarComponentesProducto();
        this._priceModal?.open()?.focusFirstField();
    },

    cerrarModalPreciosProducto() {
        this.inicializarComponentesProducto();
        this._priceActions?.setLoading('btnCerrarPreciosProducto', false);
        this._priceModal?.close();
        this.actualizarResumenPreciosProducto();
    },

    editarProducto(index) {
        this.inicializarComponentesProducto();
        const producto = window.productos[index];
        const fotosProducto = Array.isArray(producto.fotos) ? producto.fotos : (producto.foto_path ? [producto.foto_path] : []);
        const fotosProductoUrls = Array.isArray(producto.fotos_urls) ? producto.fotos_urls : [];

        this._productModal?.setTitle('Editar producto');
        document.getElementById('productoId').value = index;
        if (producto.id) {
            document.getElementById('productoId').setAttribute('data-server-id', producto.id);
        } else {
            document.getElementById('productoId').removeAttribute('data-server-id');
        }

        document.getElementById('productoCodigo').value = producto.codigo;
        document.getElementById('productoCodigo').disabled = true;
        document.getElementById('productoNombre').value = producto.nombre;
        document.getElementById('productoDescripcion').value = producto.descripcion;
        document.getElementById('productoPrecioCosto').value = producto.precio_costo || '';
        document.getElementById('productoPorcentajeGanancia1').value = this.obtenerPorcentajeGananciaProducto(producto, 1) || '';
        document.getElementById('productoPorcentajeGanancia2').value = this.obtenerPorcentajeGananciaProducto(producto, 2) || '';
        document.getElementById('productoPorcentajeGanancia3').value = this.obtenerPorcentajeGananciaProducto(producto, 3) || '';
        document.getElementById('productoPrecioDolares1').value = this.obtenerPrecioProducto(producto, 1);
        document.getElementById('productoPrecioDolares2').value = this.obtenerPrecioProducto(producto, 2);
        document.getElementById('productoPrecioDolares3').value = this.obtenerPrecioProducto(producto, 3);
        document.getElementById('productoMetodoRedondeo').value = producto.metodo_redondeo || 'none';
        this.calcularPrecioBolivares();
        document.getElementById('productoCantidad').value = producto.cantidad;
        document.getElementById('productoCategoria').value = producto.categoria;
        document.getElementById('productoTipo').value = this.normalizarTipoProducto(producto.tipo);
        document.getElementById('productoUbicacion').value = producto.ubicacion || '';
        document.getElementById('productoMarca').value = producto.marca || '';
        document.getElementById('productoModelo').value = producto.modelo || '';
        document.getElementById('productoUnidad').value = producto.unidad || '';
        this.limpiarErroresProducto();
        this.limpiarErroresPrecios();
        this._productActions?.setLoading('btnGuardarProducto', false);
        this._productModal?.setBusy(false);
        this.resetearEstadoFotoProducto(fotosProducto.map((path, photoIndex) => ({
            path,
            url: fotosProductoUrls[photoIndex] || this.construirUrlFotoProducto(path)
        })));

        this.actualizarResumenPreciosProducto();
        this._productModal?.open()?.focusFirstField();
    },

    cerrarModalProducto() {
        this.inicializarComponentesProducto();
        this.resetearEstadoFotoProducto([]);
        this.limpiarErroresProducto();
        this.limpiarErroresPrecios();
        this._productActions?.setLoading('btnGuardarProducto', false);
        this._productModal?.close();
        this.cerrarModalPreciosProducto();
    }
};

window.ProductosFeature = ProductosFeature;
