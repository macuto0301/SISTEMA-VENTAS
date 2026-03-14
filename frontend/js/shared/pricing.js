const PricingUtils = {
    aplicarRedondeoBs(monto, metodo = 'none') {
        if (metodo === 'none') return monto;

        switch (metodo) {
            case 'no_decimals':
                return Math.round(monto);
            case 'five_cents':
                return Math.round(monto / 0.05) * 0.05;
            case 'unit_up':
                return Math.ceil(monto);
            case 'five_units':
                return Math.ceil(monto / 5) * 5;
            case 'ten_up':
                return Math.ceil(monto / 10) * 10;
            case 'hundred_up':
                return Math.ceil(monto / 100) * 100;
            default:
                return monto;
        }
    },

    normalizarProductoPrecios(producto = {}) {
        const precio1 = parseFloat(producto.precio_1_dolares ?? producto.precio_dolares) || 0;
        const precio2 = parseFloat(producto.precio_2_dolares ?? precio1) || 0;
        const precio3 = parseFloat(producto.precio_3_dolares ?? precio1) || 0;
        const porcentajeBase = parseFloat(producto.porcentaje_ganancia) || 0;
        const porcentaje1 = parseFloat(producto.porcentaje_ganancia_1 ?? porcentajeBase) || 0;
        const porcentaje2 = parseFloat(producto.porcentaje_ganancia_2 ?? porcentaje1) || 0;
        const porcentaje3 = parseFloat(producto.porcentaje_ganancia_3 ?? porcentaje1) || 0;

        return {
            ...producto,
            precio_dolares: precio1,
            precio_1_dolares: precio1,
            precio_2_dolares: precio2,
            precio_3_dolares: precio3,
            porcentaje_ganancia: porcentaje1,
            porcentaje_ganancia_1: porcentaje1,
            porcentaje_ganancia_2: porcentaje2,
            porcentaje_ganancia_3: porcentaje3,
            precios: [
                { lista: 1, precio_dolares: precio1, porcentaje_ganancia: porcentaje1 },
                { lista: 2, precio_dolares: precio2, porcentaje_ganancia: porcentaje2 },
                { lista: 3, precio_dolares: precio3, porcentaje_ganancia: porcentaje3 }
            ]
        };
    },

    obtenerPrecioProducto(producto, lista = 1) {
        const productoNormalizado = this.normalizarProductoPrecios(producto);
        return parseFloat(productoNormalizado[`precio_${lista}_dolares`]) || 0;
    },

    obtenerPorcentajeGananciaProducto(producto, lista = 1) {
        const productoNormalizado = this.normalizarProductoPrecios(producto);
        return parseFloat(productoNormalizado[`porcentaje_ganancia_${lista}`]) || 0;
    },

    obtenerEtiquetaListaPrecio(lista = 1) {
        if (Number(lista) === 0) {
            return 'Precio libre';
        }
        return `Precio ${lista}`;
    },

    obtenerCostoProducto(producto) {
        return this.roundAmount(parseFloat(producto?.precio_costo) || 0);
    },

    roundAmount(value) {
        return Math.round((parseFloat(value || '0') || 0) * 100) / 100;
    }
};

window.PricingUtils = PricingUtils;
