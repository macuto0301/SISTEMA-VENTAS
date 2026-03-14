const MediaUtils = {
    construirUrl(fotoUrl, apiOrigin) {
        if (!fotoUrl) return '';

        try {
            return new URL(fotoUrl, `${apiOrigin}/`).href;
        } catch (e) {
            return fotoUrl;
        }
    },

    obtenerIniciales(nombre = '', fallback = 'CL') {
        return String(nombre || '')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(parte => parte.charAt(0).toUpperCase())
            .join('') || fallback;
    },

    construirUrlsFotosProducto(fotos = [], apiOrigin = '') {
        return (Array.isArray(fotos) ? fotos : [])
            .map(foto => this.construirUrl(foto, apiOrigin))
            .filter(Boolean);
    },

    obtenerUrlsGaleriaProducto(producto = {}, apiOrigin = '') {
        const fotos = producto.fotos_urls?.length ? producto.fotos_urls : producto.fotos;
        return this.construirUrlsFotosProducto(fotos, apiOrigin);
    }
};

window.MediaUtils = MediaUtils;
