const VentasDataFeature = {
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

    async cargarDatosVentas(options = {}) {
        const paginacionActual = this.obtenerPaginacion('ventas');
        const page = options.page || paginacionActual.page || 1;
        const pageSize = options.pageSize || paginacionActual.page_size || 10;
        const response = await window.ApiService.cargarVentas({
            page,
            pageSize,
            search: options.search || '',
            filters: options.filters || {}
        });
        window.AppState.ventas = response.items;
        window.AppState.ventasResumen = response.summary || null;
        this.actualizarPaginacion('ventas', response.pagination);
        window.ventas = window.AppState.ventas;
        if (typeof window.InformesService !== 'undefined' && typeof window.InformesService.actualizarOpcionesUsuarios === 'function') {
            window.InformesService.actualizarOpcionesUsuarios();
        }
    }
};

window.VentasDataFeature = VentasDataFeature;
