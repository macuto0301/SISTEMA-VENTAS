const VentasSearchFeature = {
    _eventsBound: false,

    inicializarEventosBusqueda() {
        if (this._eventsBound) return;

        document.getElementById('sugerenciasProductos')?.addEventListener('click', event => {
            const item = event.target.closest('[data-product-index]');
            if (!item) return;
            const index = Number(item.dataset.productIndex);
            if (Number.isInteger(index) && index >= 0) {
                this.seleccionarProducto(index);
            }
        });

        this._eventsBound = true;
    },

    async buscarProductosRemotosSeguros(termino, filters = {}, pageSize = 20) {
        if (typeof window.buscarProductosRemotos === 'function') {
            return window.buscarProductosRemotos(termino, filters, pageSize);
        }
        return window.ProductosFeature?.buscarProductosRemotos?.(termino, filters, pageSize) || [];
    },

    obtenerListaPrecioVentaSeleccionadaSegura() {
        if (typeof window.obtenerListaPrecioVentaSeleccionada === 'function') {
            return window.obtenerListaPrecioVentaSeleccionada();
        }
        return window.VentasPaymentsFeature?.obtenerListaPrecioVentaSeleccionada?.() || 1;
    },

    obtenerEtiquetaListaPrecioSegura(listaPrecio) {
        if (typeof window.obtenerEtiquetaListaPrecio === 'function') {
            return window.obtenerEtiquetaListaPrecio(listaPrecio);
        }
        return window.VentasPaymentsFeature?.obtenerEtiquetaListaPrecio?.(listaPrecio) || `P${listaPrecio}`;
    },

    obtenerPrecioProductoSeguro(producto, listaPrecio) {
        if (typeof window.obtenerPrecioProducto === 'function') {
            return window.obtenerPrecioProducto(producto, listaPrecio);
        }
        return window.PricingUtils?.obtenerPrecioProducto?.(producto, listaPrecio) || 0;
    },

    agregarAlCarritoSeguro(index) {
        if (typeof window.agregarAlCarrito === 'function') {
            return window.agregarAlCarrito(index);
        }
        return window.VentasCartFeature?.agregarAlCarrito?.(index);
    },

    mostrarNotificacionSegura(mensaje) {
        if (typeof window.mostrarNotificacion === 'function') {
            return window.mostrarNotificacion(mensaje);
        }
        console.warn(mensaje);
    },

    manejarTecladoBusqueda(e) {
        if (e.key === 'Tab') {
            const movioFoco = window.VentasCartFeature?.enfocarCantidadItemSeleccionado?.();
            if (movioFoco) {
                e.preventDefault();
            }
            return;
        }

        if (resultadosBusqueda.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (indiceSeleccionado < resultadosBusqueda.length - 1) {
                indiceSeleccionado++;
                this.actualizarSeleccionVisual();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (indiceSeleccionado > 0) {
                indiceSeleccionado--;
                this.actualizarSeleccionVisual();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (indiceSeleccionado !== -1) {
                this.seleccionarProducto(resultadosBusqueda[indiceSeleccionado].index);
            } else {
                this.agregarProductoPorEnter();
            }
        }
    },

    actualizarSeleccionVisual() {
        const items = document.querySelectorAll('.sugerencia-item');
        items.forEach((item, index) => {
            if (index === indiceSeleccionado) {
                item.classList.add('seleccionado');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('seleccionado');
            }
        });
    },

    async filtrarProductos(e) {
        this.inicializarEventosBusqueda();
        const texto = e.target.value.toLowerCase();
        const sugerencias = document.getElementById('sugerenciasProductos');

        indiceSeleccionado = -1;

        if (texto.length === 0) {
            sugerencias.style.display = 'none';
            resultadosBusqueda = [];
            return;
        }

        resultadosBusqueda = await this.buscarProductosRemotosSeguros(texto, {}, 20);

        if (resultadosBusqueda.length > 0) {
            const listaPrecio = this.obtenerListaPrecioVentaSeleccionadaSegura();
            sugerencias.innerHTML = resultadosBusqueda.map((item, i) => `
                <div class="sugerencia-item" data-index="${i}" data-product-index="${item.index}">
                    <strong>${item.producto.nombre}</strong> <small>(${item.producto.codigo})</small>
                    <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                        <span style="color: #28a745;">${this.obtenerEtiquetaListaPrecioSegura(listaPrecio)}: $${this.obtenerPrecioProductoSeguro(item.producto, listaPrecio).toFixed(2)}</span>
                        <span style="color: ${item.producto.cantidad > 0 ? '#6c757d' : '#c05621'};">${item.producto.cantidad > 0 ? `Stock: ${item.producto.cantidad}` : 'Sin stock'}</span>
                    </div>
                </div>
            `).join('');
            sugerencias.style.display = 'block';
        } else {
            sugerencias.innerHTML = '<div class="sugerencia-item" style="cursor: default;">No se encontraron productos</div>';
            sugerencias.style.display = 'block';
            resultadosBusqueda = [];
        }
    },

    seleccionarProducto(index) {
        this.agregarAlCarritoSeguro(index);
        document.getElementById('buscarProducto').value = '';
        document.getElementById('sugerenciasProductos').style.display = 'none';
        document.getElementById('buscarProducto').focus();
    },

    agregarProductoPorEnter() {
        const input = document.getElementById('buscarProducto');
        const texto = input.value.trim().toLowerCase();

        if (texto === '') return;

        const indexPorCodigo = productos.findIndex(p => String(p.codigo || '').toLowerCase() === texto);

        if (indexPorCodigo !== -1) {
            this.seleccionarProducto(indexPorCodigo);
            return;
        }

        this.mostrarNotificacionSegura('❌ Presione Enter solo para un codigo exacto o seleccione un producto de la lista');
    }
};

window.VentasSearchFeature = VentasSearchFeature;
