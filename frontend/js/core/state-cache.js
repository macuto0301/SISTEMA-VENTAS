const StateCacheCore = {
    obtenerPaginacion(nombre) {
        return window.AppState.paginacion[nombre] || { page: 1, page_size: 10, total: 0, total_pages: 0, has_next: false, has_prev: false };
    },

    actualizarPaginacion(nombre, pagination = {}) {
        window.AppState.paginacion[nombre] = {
            ...this.obtenerPaginacion(nombre),
            ...pagination
        };
    },

    mezclarProductosEnCache(items = []) {
        const mapa = new Map();
        (window.AppState.productos || []).forEach(item => {
            if (item?.id != null) mapa.set(item.id, item);
        });
        items.forEach(item => {
            if (item?.id != null) mapa.set(item.id, item);
        });

        window.AppState.productos = Array.from(mapa.values());
        window.productos = window.AppState.productos;
    },

    actualizarConsultaProductos(search = '', filters = {}) {
        window.AppState.productosQuery = {
            search,
            filters: { ...filters }
        };
    }
};

window.StateCacheCore = StateCacheCore;
