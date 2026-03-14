// ============================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ============================================

const AppState = {
    // Productos
    productos: [],
    
    // Ventas
    ventas: [],
    
    // Carrito
    carrito: [],
    
    // Pagos
    pagos: [],
    
    // Proveedores
    proveedores: [],
    
    // Compras
    compras: [],
    
    // Configuración
    tasaDolar: 36.5,
    tasaVuelto: 36.5,
    porcentajeGananciaDefecto: 30,
    porcentajeDescuentoDolares: 0,
    metodoRedondeoBs: 'none',
    
    // Datos de la empresa
    nombreEmpresa: '',
    rifEmpresa: '',
    direccionEmpresa: '',
    
    // UI State
    indiceSeleccionado: -1,
    resultadosBusqueda: [],
    ventaEnProgreso: null,
    devolucionActiva: null,
    reintegrosDevolucion: [],
    vueltosAgregados: [],
    ultimaVentaProcesada: null,
    ultimoNumeroVenta: 0,
    usuarioLogueado: null,
    configServidor: {},

    // Getters
    getProductoByCodigo(codigo) {
        return this.productos.find(p => p.codigo === codigo);
    },

    getProductoIndex(codigo) {
        return this.productos.findIndex(p => p.codigo === codigo);
    },

    getVentaIndex(id) {
        return this.ventas.findIndex(v => v.id === id);
    },

    // Setters
    setTasaDolar(valor) {
        this.tasaDolar = parseFloat(valor) || 36.5;
        this.tasaVuelto = this.tasaVuelto || this.tasaDolar;
    },

    setTasaVuelto(valor) {
        this.tasaVuelto = parseFloat(valor) || this.tasaDolar;
    },

    // Calculados
    getTotalCarrito() {
        return this.carrito.reduce((sum, item) => sum + item.subtotal_dolares, 0);
    },

    getTotalCarritoBs() {
        return this.carrito.reduce((sum, item) => {
            const precioBs = Utils.aplicarRedondeoBs(item.precio_dolares * this.tasaDolar, item.metodo_redondeo);
            return sum + (precioBs * item.cantidad);
        }, 0);
    },

    getTotalPagos() {
        return this.pagos.reduce((sum, p) => {
            if (p.moneda === 'USD') return sum + p.valor_reconocido_usd;
            return sum + (p.monto / this.tasaDolar);
        }, 0);
    },

    getTotalPagosBs() {
        return this.pagos.reduce((sum, p) => {
            if (p.moneda === 'BS') return sum + p.monto;
            return sum + (p.monto * this.tasaDolar);
        }, 0);
    },

    // Reset
    limpiarCarrito() {
        this.carrito = [];
        this.pagos = [];
    },

    reiniciar() {
        this.carrito = [];
        this.pagos = [];
        this.ventaEnProgreso = null;
        this.vueltosAgregados = [];
    }
};

// Referencias directas para compatibilidad
var productos = AppState.productos;
var ventas = AppState.ventas;
var tasaDolar = AppState.tasaDolar;
var tasaVuelto = AppState.tasaVuelto;
var tasaVuelto = AppState.tasaVuelto;
var porcentajeDescuentoDolares = AppState.porcentajeDescuentoDolares;
var porcentajeGananciaDefecto = AppState.porcentajeGananciaDefecto;
var metodoRedondeoBs = AppState.metodoRedondeoBs;
var carrito = AppState.carrito;
var pagos = AppState.pagos;
var proveedores = AppState.proveedores;
var compras = AppState.compras;
var ventaEnProgreso = AppState.ventaEnProgreso;
var devolucionActiva = AppState.devolucionActiva;
var reintegrosDevolucion = AppState.reintegrosDevolucion;
var vueltosAgregados = AppState.vueltosAgregados;
var ultimaVentaProcesada = AppState.ultimaVentaProcesada;
var ultimoNumeroVenta = AppState.ultimoNumeroVenta;
var usuarioLogueado = AppState.usuarioLogueado;
var configServidor = AppState.configServidor;
var resultadosBusqueda = [];
var indiceSeleccionado = -1;
var descuentoTotal = 0;
