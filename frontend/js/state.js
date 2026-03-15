// ============================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ============================================

const AppState = {
    // Productos
    productos: [],
    productosVista: [],
    productosQuery: {
        search: '',
        filters: {}
    },
    
    // Ventas
    ventas: [],

    // Clientes
    clientes: [],
    clientesCxcBusqueda: [],

    // Cuentas por cobrar
    cuentasPorCobrar: [],
    estadoCuentaClienteActual: null,
    
    // Carrito
    carrito: [],
    
    // Pagos
    pagos: [],
    
    // Proveedores
    proveedores: [],
    
    // Compras
    compras: [],

    // Paginacion remota
    paginacion: {
        productos: { page: 1, page_size: 20, total: 0, total_pages: 0, has_next: false, has_prev: false },
        ventas: { page: 1, page_size: 10, total: 0, total_pages: 0, has_next: false, has_prev: false },
        clientes: { page: 1, page_size: 10, total: 0, total_pages: 0, has_next: false, has_prev: false },
        cuentasPorCobrar: { page: 1, page_size: 10, total: 0, total_pages: 0, has_next: false, has_prev: false },
        proveedores: { page: 1, page_size: 10, total: 0, total_pages: 0, has_next: false, has_prev: false },
        compras: { page: 1, page_size: 10, total: 0, total_pages: 0, has_next: false, has_prev: false }
    },
    
    // Configuración
    tasaDolar: 36.5,
    tasaVuelto: 36.5,
    porcentajeGananciaDefecto: 30,
    porcentajeDescuentoDolares: 0,
    metodoRedondeoBs: 'none',
    precioVentaLibre: false,
    
    // Datos de la empresa
    nombreEmpresa: '',
    rifEmpresa: '',
    direccionEmpresa: '',
    telefonoEmpresa: '',
    correoEmpresa: '',
    
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

window.AppState = AppState;

// Referencias directas para compatibilidad
var productos = AppState.productos;
var ventas = AppState.ventas;
var clientes = AppState.clientes;
var cuentasPorCobrar = AppState.cuentasPorCobrar;
var tasaDolar = AppState.tasaDolar;
var tasaVuelto = AppState.tasaVuelto;
var tasaVuelto = AppState.tasaVuelto;
var porcentajeDescuentoDolares = AppState.porcentajeDescuentoDolares;
var porcentajeGananciaDefecto = AppState.porcentajeGananciaDefecto;
var metodoRedondeoBs = AppState.metodoRedondeoBs;
var precioVentaLibre = AppState.precioVentaLibre;
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
