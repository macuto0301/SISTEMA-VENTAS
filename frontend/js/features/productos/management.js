const ProductosFeature = {
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
        if (typeof window.construirUrlFotoProducto === 'function') {
            return window.construirUrlFotoProducto(fotoUrl);
        }
        return window.MediaUtils?.construirUrl?.(fotoUrl, this.getApiBase().replace(/\/api$/, '')) || '';
    },

    obtenerUrlsGaleriaProducto(producto) {
        if (typeof window.obtenerUrlsGaleriaProducto === 'function') {
            return window.obtenerUrlsGaleriaProducto(producto);
        }
        return window.MediaUtils?.obtenerUrlsGaleriaProducto?.(producto, this.getApiBase().replace(/\/api$/, '')) || [];
    },

    resetearEstadoFotoProducto(currentPhotos = []) {
        if (typeof window.resetearEstadoFotoProducto === 'function') {
            return window.resetearEstadoFotoProducto(currentPhotos);
        }
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
            const sesion = JSON.parse(localStorage.getItem('sesion_ventas') || 'null');
            if (sesion?.username) {
                return { 'X-Auth-Username': sesion.username };
            }
        } catch (error) {
            console.warn('No se pudo leer la sesion local', error);
        }
        return {};
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

    async guardarProducto(e) {
        if (e) e.preventDefault();
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
        const metodoRedondeo = document.getElementById('productoMetodoRedondeo').value;
        const fotos = (window.ProductosMediaFeature?.productoFotosSeleccionadas || []).map(item => item.file);
        const removePhoto = document.getElementById('productoFotoEliminar').value === 'true';

        const formData = new FormData();
        formData.append('codigo', codigo);
        formData.append('nombre', nombre);
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
        formData.append('metodo_redondeo', metodoRedondeo);
        formData.append('remove_photo', removePhoto ? 'true' : 'false');

        formData.append('fotos_existentes', JSON.stringify((window.ProductosMediaFeature?.productoFotosExistentes || []).map(foto => foto.path)));

        fotos.forEach(foto => {
            formData.append('fotos', foto);
        });

        try {
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
            const error = await res.json().catch(() => null);
            window.mostrarNotificacion(`⚠️ ${error?.error || 'No se pudo guardar el producto en el servidor'}`);
        } catch (error) {
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
        const grid = document.getElementById('productosGrid');
        if (!grid) return;
        const lista = productosAMostrar || window.AppState.productosVista || window.productos;
        const paginacion = this.obtenerPaginacion('productos');
        const busquedaActiva = Boolean(document.getElementById('buscarProductoGestion')?.value.trim());

        if (lista.length === 0) {
            const mensaje = window.productos.length === 0
                ? '📦 No hay productos registrados'
                : `🔍 No se encontraron coincidencias${paginacion.has_next ? '. Carga mas productos para seguir buscando.' : ''}`;
            grid.innerHTML = '<div class="mensaje-vacio" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">' +
                mensaje +
                (paginacion.has_next ? '<div style="margin-top: 16px;"><button class="btn-secondary" onclick="cargarMasProductos()">Cargar mas productos</button></div>' : '') +
                '</div>';
            return;
        }

        const cards = lista.map((producto) => {
            const originalIndex = window.productos.findIndex(p => p.codigo === producto.codigo);
            const precioPrincipal = this.obtenerPrecioProducto(producto, 1);
            const precioSecundario = this.obtenerPrecioProducto(producto, 2);
            const precioTerciario = this.obtenerPrecioProducto(producto, 3);
            const precioBsDinamico = this.aplicarRedondeoBs(precioPrincipal * window.tasaDolar, producto.metodo_redondeo || 'none');
            const fotosProductoUrls = this.obtenerUrlsGaleriaProducto(producto);
            const fotoPrincipalUrl = fotosProductoUrls[0] || this.construirUrlFotoProducto(producto.foto_url);

            let htmlPromo = '';
            if (window.porcentajeDescuentoDolares > 0) {
                const precioPromo = precioPrincipal * (1 - (window.porcentajeDescuentoDolares / 100));
                htmlPromo = `
                    <div class="precio-promo" style="color: #28a745; font-weight: bold; font-size: 0.95em; margin-top: 5px; background: #e8f5e9; padding: 4px 8px; border-radius: 4px; display: inline-block;">
                        🏷️ Promo $: $${precioPromo.toFixed(2)}
                    </div>
                `;
            }

            return `
                <div class="producto-card">
                    <button
                        type="button"
                        class="producto-card-media producto-card-media-button${fotoPrincipalUrl ? '' : ' producto-card-media-empty'}"
                        ${fotoPrincipalUrl ? `onclick="abrirGaleriaProductoPorIndice(${originalIndex}, 0)"` : 'disabled'}
                    >
                        ${fotoPrincipalUrl
                            ? `<img src="${fotoPrincipalUrl}" alt="${producto.nombre}" loading="lazy">`
                            : '<span>Sin foto</span>'}
                        ${fotosProductoUrls.length > 1 ? `<span class="producto-card-media-count">${fotosProductoUrls.length} fotos</span>` : ''}
                    </button>
                    <div class="producto-header">
                        <h3>${producto.nombre}</h3>
                        <span class="producto-codigo">${producto.codigo}</span>
                    </div>
                    <div class="producto-descripcion">${producto.descripcion}</div>
                    <div class="producto-precios">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span class="precio-dolar">💵 P1: $${precioPrincipal.toFixed(2)}</span>
                            <span class="precio-dolar">💵 P2: $${precioSecundario.toFixed(2)}</span>
                            <span class="precio-dolar">💵 P3: $${precioTerciario.toFixed(2)}</span>
                            <span class="precio-bolivar">💶 Bs ${precioBsDinamico.toFixed(2)}</span>
                            ${htmlPromo}
                        </div>
                    </div>
                    <div class="producto-stock">
                        <span>📦 Stock: ${producto.cantidad}</span>
                        ${producto.cantidad < 5 ? '<span class="stock-bajo">⚠️ Stock bajo</span>' : ''}
                    </div>
                    <div class="producto-categoria">📂 ${producto.categoria}</div>
                    <div class="producto-acciones">
                        <button class="btn-agregar-carrito" onclick="agregarAlCarrito(${originalIndex})">
                            🛒 Agregar al carrito
                        </button>
                        <button class="btn-editar" onclick="editarProducto(${originalIndex})">
                            ✏️ Editar
                        </button>
                        <button class="btn-eliminar" onclick="eliminarProducto(${originalIndex})">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const resumen = `
            <div class="mensaje-vacio" style="grid-column: 1/-1; text-align: center; padding: 8px 0 0; color: #666;">
                Mostrando ${lista.length}${busquedaActiva ? ' coincidencias cargadas' : ' productos cargados'} de ${paginacion.total || lista.length}
            </div>
        `;

        const loadMore = paginacion.has_next ? `
            <div style="grid-column: 1/-1; display: flex; justify-content: center; padding: 10px 0 24px;">
                <button class="btn-secondary" onclick="cargarMasProductos()">Cargar mas productos</button>
            </div>
        ` : '';

        grid.innerHTML = `${cards}${resumen}${loadMore}`;
    },

    filtrarProductosGestion() {
        const termino = document.getElementById('buscarProductoGestion').value.toLowerCase();

        if (!termino) {
            this.cargarProductos({ page: 1, search: '', filters: {} });
            return;
        }

        this.cargarProductos({ page: 1, search: termino, filters: {} });
    },

    mostrarFormularioProducto() {
        document.getElementById('modalTitulo').textContent = 'Nuevo Producto';
        document.getElementById('formProducto').reset();
        document.getElementById('productoId').value = '-1';
        document.getElementById('productoId').removeAttribute('data-server-id');
        document.getElementById('productoPorcentajeGanancia1').value = window.porcentajeGananciaDefecto;
        document.getElementById('productoPorcentajeGanancia2').value = window.porcentajeGananciaDefecto;
        document.getElementById('productoPorcentajeGanancia3').value = window.porcentajeGananciaDefecto;
        document.getElementById('productoPrecioDolares1').value = '';
        document.getElementById('productoPrecioDolares2').value = '';
        document.getElementById('productoPrecioDolares3').value = '';
        document.getElementById('productoMetodoRedondeo').value = 'none';
        document.getElementById('productoCantidad').value = 0;
        document.getElementById('productoCodigo').disabled = false;
        document.getElementById('productoPrecioBolivares').value = '';
        this.resetearEstadoFotoProducto([]);
        document.getElementById('modalProducto').style.display = 'block';
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
    },

    recalcularPorcentajeGanancia(lista = 1) {
        const costo = parseFloat(document.getElementById('productoPrecioCosto').value) || 0;
        const precioVenta = parseFloat(document.getElementById(`productoPrecioDolares${lista}`).value) || 0;

        if (costo > 0 && precioVenta > 0) {
            const porcentaje = ((precioVenta / costo) - 1) * 100;
            document.getElementById(`productoPorcentajeGanancia${lista}`).value = porcentaje.toFixed(4);
        }
    },

    calcularPrecioDolares() {
        const precioBs = parseFloat(document.getElementById('productoPrecioBolivares').value) || 0;
        const precioDolares = precioBs / window.tasaDolar;
        document.getElementById('productoPrecioDolares1').value = precioDolares ? precioDolares.toFixed(2) : '';
        this.recalcularPorcentajeGanancia(1);
    },

    editarProducto(index) {
        const producto = window.productos[index];
        const fotosProducto = Array.isArray(producto.fotos) ? producto.fotos : (producto.foto_path ? [producto.foto_path] : []);
        const fotosProductoUrls = Array.isArray(producto.fotos_urls) ? producto.fotos_urls : [];

        document.getElementById('modalTitulo').textContent = 'Editar Producto';
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
        this.resetearEstadoFotoProducto(fotosProducto.map((path, photoIndex) => ({
            path,
            url: fotosProductoUrls[photoIndex] || this.construirUrlFotoProducto(path)
        })));

        document.getElementById('modalProducto').style.display = 'block';
    },

    cerrarModalProducto() {
        this.resetearEstadoFotoProducto([]);
        document.getElementById('modalProducto').style.display = 'none';
    }
};

window.ProductosFeature = ProductosFeature;
