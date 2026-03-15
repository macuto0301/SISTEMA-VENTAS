// Sistema de Ventas con Pagos Múltiples
// Este archivo ahora usa módulos separados en js/
const API_URL = (window.API?.baseUrl || (() => {
    const origin = window.location?.origin || '';
    if (typeof origin === 'string' && /^https?:\/\//.test(origin) && origin !== 'null') {
        return `${origin}/api`;
    }
    return 'http://localhost:5000/api';
})()).replace(/\/$/, '');
const API_ORIGIN = API_URL.replace(/\/api$/, '');
const MAX_PRODUCT_IMAGES = 5;
const PRICE_LIST_NUMBERS = [1, 2, 3];
window.API_URL = API_URL;
window.API_ORIGIN = API_ORIGIN;
window.PRICE_LIST_NUMBERS = PRICE_LIST_NUMBERS;

function obtenerPaginacion(nombre) {
    return window.StateCacheCore?.obtenerPaginacion(nombre);
}

function actualizarPaginacion(nombre, pagination) {
    return window.StateCacheCore?.actualizarPaginacion(nombre, pagination);
}

function mezclarProductosEnCache(items = []) {
    return window.StateCacheCore?.mezclarProductosEnCache(items);
}

function actualizarConsultaProductos(search = '', filters = {}) {
    return window.StateCacheCore?.actualizarConsultaProductos(search, filters);
}

function construirUrlFotoProducto(fotoUrl) {
    return window.MediaUtils?.construirUrl(fotoUrl, API_ORIGIN) || '';
}

function construirUrlFotoCliente(fotoUrl) {
    return window.MediaUtils?.construirUrl(fotoUrl, API_ORIGIN) || '';
}

function obtenerInicialesCliente(nombre = '') {
    return window.MediaUtils?.obtenerIniciales(nombre, 'CL') || 'CL';
}

function liberarObjectUrlCliente(tipo) {
    return window.ClientesMediaFeature?.liberarObjectUrlCliente(tipo);
}

function actualizarPreviewFotoCliente(tipo) {
    return window.ClientesMediaFeature?.actualizarPreviewFotoCliente(tipo);
}

function resetearFotosCliente(cliente = null) {
    return window.ClientesMediaFeature?.resetearFotosCliente(cliente);
}

function manejarCambioFotoCliente(tipo, event) {
    return window.ClientesMediaFeature?.manejarCambioFotoCliente(tipo, event);
}

function limpiarFotoCliente(tipo) {
    return window.ClientesMediaFeature?.limpiarFotoCliente(tipo);
}

function renderAvatarCliente(cliente, className = 'cliente-card-avatar') {
    return window.ClientesMediaFeature?.renderAvatarCliente(cliente, className) || '';
}

function construirUrlsFotosProducto(fotos = []) {
    return window.MediaUtils?.construirUrlsFotosProducto(fotos, API_ORIGIN) || [];
}

function obtenerUrlsGaleriaProducto(producto) {
    return window.MediaUtils?.obtenerUrlsGaleriaProducto(producto, API_ORIGIN) || [];
}

function liberarObjectUrlFotoProducto() {
    return window.ProductosMediaFeature?.liberarObjectUrlFotoProducto();
}

function obtenerFotosProductoParaPreview() {
    return window.ProductosMediaFeature?.obtenerFotosProductoParaPreview() || [];
}

function actualizarPreviewFotoProducto() {
    return window.ProductosMediaFeature?.actualizarPreviewFotoProducto();
}

function sincronizarInputFotosProducto() {
    return window.ProductosMediaFeature?.sincronizarInputFotosProducto();
}

function resetearEstadoFotoProducto(currentPhotos = []) {
    return window.ProductosMediaFeature?.resetearEstadoFotoProducto(currentPhotos);
}

function manejarCambioFotoProducto(event) {
    return window.ProductosMediaFeature?.manejarCambioFotoProducto(event);
}

function limpiarFotoProductoSeleccionada() {
    return window.ProductosMediaFeature?.limpiarFotoProductoSeleccionada();
}

function quitarFotoProducto(tipo, index) {
    return window.ProductosMediaFeature?.quitarFotoProducto(tipo, index);
}

let indiceCarritoSeleccionado = -1;

function aplicarEstadoSidebar(colapsado) {
    return window.NavigationCore?.aplicarEstadoSidebar(colapsado);
}

function toggleSidebar() {
    return window.NavigationCore?.toggleSidebar();
}

function obtenerTabsDisponibles() {
    return window.NavigationCore?.obtenerTabsDisponibles() || [];
}

function obtenerTabDesdeHash() {
    return window.NavigationCore?.obtenerTabDesdeHash() || '';
}

function sincronizarTabConHash() {
    return window.NavigationCore?.sincronizarTabConHash();
}

// El arranque principal se movio a js/core/bootstrap.js (migracion conservadora).

// Funciones de Configuración
async function cargarConfiguracion() {
    return window.ConfigCore?.cargarConfiguracion();
}

function actualizarInfoTasaHeader() {
    return window.ConfigCore?.actualizarInfoTasaHeader();
}

function abrirModalConfiguracion() {
    return window.ConfigCore?.abrirModalConfiguracion();
}

function cerrarModalConfiguracion() {
    return window.ConfigCore?.cerrarModalConfiguracion();
}

function cerrarModalVuelto() {
    return window.VentasPostventaFeature?.cerrarModalVuelto();
}

// FUNCIONES DE AUTENTICACION
function obtenerTabsPermitidos() {
    return window.AuthCore?.obtenerTabsPermitidos() || [];
}

function actualizarModoInterfazPorRol() {
    return window.AuthCore?.actualizarModoInterfazPorRol();
}

function aplicarPermisosUsuario() {
    return window.AuthCore?.aplicarPermisosUsuario();
}

function asegurarVistaInicialPorRol() {
    return window.AuthCore?.asegurarVistaInicialPorRol();
}

function verificarSesion() {
    return window.AuthCore?.verificarSesion();
}

async function manejarLogin(e) {
    return window.AuthCore?.manejarLogin(e);
}

function cerrarSesion() {
    return window.AuthCore?.cerrarSesion();
}

async function guardarConfiguracion() {
    return window.ConfigCore?.guardarConfiguracion();
}

function actualizarEmpresaDisplay() {
    return window.ConfigCore?.actualizarEmpresaDisplay();
}

function puedeEditarPrecioVenta() {
    return window.ConfigCore?.puedeEditarPrecioVenta() || false;
}



async function actualizarTasaBCV(eventParam) {
    return window.ConfigCore?.actualizarTasaBCV(eventParam || window.event);
}

function actualizarFecha() {
    return window.ConfigCore?.actualizarFecha();
}

function aplicarRedondeoBs(monto, metodo = 'none') {
    return window.PricingUtils?.aplicarRedondeoBs(monto, metodo) ?? monto;
}

function normalizarProductoPrecios(producto = {}) {
    return window.PricingUtils?.normalizarProductoPrecios(producto) || producto;
}

function obtenerPrecioProducto(producto, lista = 1) {
    return window.PricingUtils?.obtenerPrecioProducto(producto, lista) || 0;
}

function obtenerPorcentajeGananciaProducto(producto, lista = 1) {
    return window.PricingUtils?.obtenerPorcentajeGananciaProducto(producto, lista) || 0;
}

function obtenerListaPrecioVentaSeleccionada() {
    return window.VentasCartFeature?.obtenerListaPrecioVentaSeleccionada() || 1;
}

function obtenerEtiquetaListaPrecio(lista = 1) {
    return window.PricingUtils?.obtenerEtiquetaListaPrecio(lista) || `Precio ${lista}`;
}

function obtenerPrecioCarritoDesdeProducto(producto, lista = 1) {
    return window.VentasCartFeature?.obtenerPrecioCarritoDesdeProducto(producto, lista) || 0;
}

function obtenerCostoProducto(producto) {
    return window.PricingUtils?.obtenerCostoProducto(producto) || 0;
}

function obtenerOpcionesListaPrecioProducto(producto) {
    return window.VentasCartFeature?.obtenerOpcionesListaPrecioProducto(producto) || [];
}

function aplicarListaPrecioEnCarrito(index, listaPrecio) {
    return window.VentasCartFeature?.aplicarListaPrecioEnCarrito(index, listaPrecio);
}

function aplicarPrecioLibreEnCarrito(index, precioLibre) {
    return window.VentasCartFeature?.aplicarPrecioLibreEnCarrito(index, precioLibre) || false;
}

function abrirSelectorPrecioCarrito(index) {
    return window.VentasCartFeature?.abrirSelectorPrecioCarrito(index);
}

function seleccionarPrecioCarrito(index, listaPrecio) {
    return window.VentasCartFeature?.seleccionarPrecioCarrito(index, listaPrecio);
}

function confirmarPrecioLibreCarrito(index) {
    return window.VentasCartFeature?.confirmarPrecioLibreCarrito(index);
}

function cerrarSelectorPrecioCarrito() {
    return window.VentasCartFeature?.cerrarSelectorPrecioCarrito();
}

// Funciones de Productos
async function cargarProductos(options = {}) {
    return window.ProductosFeature?.cargarProductos(options);
}

async function cargarMasProductos() {
    return window.ProductosFeature?.cargarMasProductos();
}

async function buscarProductosRemotos(termino, filters = {}, pageSize = 20) {
    return window.ProductosFeature?.buscarProductosRemotos(termino, filters, pageSize) || [];
}

async function guardarProducto(e) {
    return window.ProductosFeature?.guardarProducto(e);
}

async function eliminarProducto(index) {
    return window.ProductosFeature?.eliminarProducto(index);
}

async function cargarDatosVentas(options = {}) {
    return window.VentasDataFeature?.cargarDatosVentas(options);
}

async function cargarClientes(options = {}) {
    return window.ClientesFeature?.cargarClientes(options);
}

async function cargarCuentasPorCobrar(options = {}) {
    return window.CxcFeature?.cargarCuentasPorCobrar(options);
}

function renderSelectClientesVenta() {
    return window.ClientesFeature?.renderSelectClientesVenta();
}

function obtenerClienteSeleccionado() {
    return window.ClientesFeature?.obtenerClienteSeleccionado() || null;
}

function manejarCambioClienteVenta() {
    return window.ClientesFeature?.manejarCambioClienteVenta();
}

function actualizarInfoClienteSeleccionado() {
    return window.ClientesFeature?.actualizarInfoClienteSeleccionado();
}

function abrirModalResumenVenta() {
    return window.VentasSummaryModalComponent?.open?.();
}

function cerrarModalResumenVenta() {
    return window.VentasSummaryModalComponent?.close?.();
}

async function abrirModalBuscarClienteVenta() {
    return window.ClientesFeature?.abrirModalBuscarClienteVenta();
}

function cerrarModalBuscarClienteVenta() {
    return window.ClientesFeature?.cerrarModalBuscarClienteVenta();
}

function renderListaBusquedaClienteVenta() {
    return window.ClientesFeature?.renderListaBusquedaClienteVenta();
}

function seleccionarClienteVenta(clienteId) {
    return window.ClientesFeature?.seleccionarClienteVenta(clienteId);
}

function limpiarClienteVenta() {
    return window.ClientesFeature?.limpiarClienteVenta();
}

function renderClientes() {
    return window.ClientesFeature?.renderClientes();
}

async function cargarEstadoCuentaClienteSeleccionado(clienteId = null) {
    return window.CxcFeature?.cargarEstadoCuentaClienteSeleccionado(clienteId);
}

function obtenerClientesConCuentaCorriente() {
    return window.CxcFeature?.obtenerClientesConCuentaCorriente() || [];
}

async function abrirModalBuscarClienteCxc() {
    return window.CxcFeature?.abrirModalBuscarClienteCxc();
}

function cerrarModalBuscarClienteCxc() {
    return window.CxcFeature?.cerrarModalBuscarClienteCxc();
}

function renderListaBusquedaClienteCxc() {
    return window.CxcFeature?.renderListaBusquedaClienteCxc();
}

async function seleccionarClienteCxc(clienteId) {
    return window.CxcFeature?.seleccionarClienteCxc(clienteId);
}

function limpiarClienteCxc() {
    return window.CxcFeature?.limpiarClienteCxc();
}

function renderDetalleCuentaCliente(mensaje = '') {
    return window.CxcFeature?.renderDetalleCuentaCliente(mensaje);
}



function mostrarProductos(productosAMostrar = null) {
    return window.ProductosFeature?.mostrarProductos(productosAMostrar);
}

function filtrarProductosGestion() {
    return window.ProductosFeature?.filtrarProductosGestion();
}

function mostrarFormularioProducto() {
    return window.ProductosFeature?.mostrarFormularioProducto();
}

function calcularPrecioVenta(lista = 1) {
    return window.ProductosFeature?.calcularPrecioVenta(lista);
}

function recalcularPreciosProducto() {
    return window.ProductosFeature?.recalcularPreciosProducto();
}

function calcularPrecioBolivares() {
    return window.ProductosFeature?.calcularPrecioBolivares();
}

function recalcularPorcentajeGanancia(lista = 1) {
    return window.ProductosFeature?.recalcularPorcentajeGanancia(lista);
}

function calcularPrecioDolares() {
    return window.ProductosFeature?.calcularPrecioDolares();
}

function editarProducto(index) {
    return window.ProductosFeature?.editarProducto(index);
}



function cerrarModalProducto() {
    return window.ProductosFeature?.cerrarModalProducto();
}

function abrirGaleriaProductoPorIndice(index, imageIndex = 0) {
    return window.ProductosGalleryFeature?.abrirGaleriaProductoPorIndice(index, imageIndex);
}

function manejarTecladoGaleriaProducto(event) {
    return window.ProductosGalleryFeature?.manejarTecladoGaleriaProducto(event);
}

function manejarWheelGaleriaProducto(event) {
    return window.ProductosGalleryFeature?.manejarWheelGaleriaProducto(event);
}

function iniciarArrastreGaleriaProducto(event) {
    return window.ProductosGalleryFeature?.iniciarArrastreGaleriaProducto(event);
}

function moverArrastreGaleriaProducto(event) {
    return window.ProductosGalleryFeature?.moverArrastreGaleriaProducto(event);
}

function terminarArrastreGaleriaProducto() {
    return window.ProductosGalleryFeature?.terminarArrastreGaleriaProducto();
}

function esPanelVentasActivo() {
    return window.VentasShortcutsFeature?.esPanelVentasActivo();
}

function esCampoEditable(elemento) {
    return window.VentasShortcutsFeature?.esCampoEditable(elemento) || false;
}

function obtenerModalAbierto() {
    return window.VentasShortcutsFeature?.obtenerModalAbierto() || null;
}

function togglePanelAtajosVentas(forzarEstado) {
    return window.VentasShortcutsFeature?.togglePanelAtajosVentas(forzarEstado);
}

function abrirModalTotalizacion() {
    return window.VentasPaymentsFeature?.abrirModalTotalizacion();
}

function cerrarModalTotalizacion() {
    return window.VentasPaymentsFeature?.cerrarModalTotalizacion();
}

function abrirModalExcedenteTotalizacion(venta) {
    return window.VentasPaymentsFeature?.abrirModalExcedenteTotalizacion(venta);
}

function cerrarModalExcedenteTotalizacion() {
    return window.VentasPaymentsFeature?.cerrarModalExcedenteTotalizacion();
}

function volverATotalizacionDesdeExcedente() {
    return window.VentasPaymentsFeature?.volverATotalizacionDesdeExcedente();
}

function aceptarExcedenteComoSaldoFavor() {
    return window.VentasPaymentsFeature?.aceptarExcedenteComoSaldoFavor();
}

function gestionarExcedenteComoVuelto() {
    return window.VentasPaymentsFeature?.gestionarExcedenteComoVuelto();
}

function enfocarCampoVentas(idCampo, posicion = null) {
    return window.VentasPaymentsFeature?.enfocarCampoVentas(idCampo, posicion);
}

function cerrarOverlayVentasActual() {
    return window.VentasShortcutsFeature?.cerrarOverlayVentasActual() || false;
}

function normalizarIndiceCarrito() {
    return window.VentasCartFeature?.normalizarIndiceCarrito();
}

function seleccionarFilaCarrito(index) {
    return window.VentasCartFeature?.seleccionarFilaCarrito(index);
}

function moverSeleccionCarrito(direccion) {
    return window.VentasCartFeature?.moverSeleccionCarrito(direccion);
}

function actualizarSeleccionCarritoVisual() {
    return window.VentasCartFeature?.actualizarSeleccionCarritoVisual();
}

function ajustarCantidadItemSeleccionado(delta) {
    return window.VentasCartFeature?.ajustarCantidadItemSeleccionado(delta);
}

function manejarAtajosVentas(event) {
    return window.VentasShortcutsFeature?.manejarAtajosVentas(event);
}

// Funciones del Carrito
function agregarAlCarrito(productoIndex) {
    return window.VentasCartFeature?.agregarAlCarrito(productoIndex);
}

function manejarTecladoBusqueda(e) {
    return window.VentasSearchFeature?.manejarTecladoBusqueda(e);
}

function actualizarSeleccionVisual() {
    return window.VentasSearchFeature?.actualizarSeleccionVisual();
}

async function filtrarProductos(e) {
    return window.VentasSearchFeature?.filtrarProductos(e);
}

function seleccionarProducto(index) {
    return window.VentasSearchFeature?.seleccionarProducto(index);
}

function actualizarCarrito() {
    return window.VentasCartFeature?.actualizarCarrito();
}

function actualizarCantidadCarrito(index, cantidad) {
    return window.VentasCartFeature?.actualizarCantidadCarrito(index, cantidad);
}

function actualizarPrecioCarrito(index, precio) {
    return window.VentasCartFeature?.actualizarPrecioCarrito(index, precio);
}

function eliminarDelCarrito(index) {
    return window.VentasCartFeature?.eliminarDelCarrito(index);
}

function limpiarCarrito() {
    return window.VentasCartFeature?.limpiarCarrito();
}

// ============================================
// FUNCIONES DE PAGOS MÚLTIPLES
// ============================================

function agregarPago() {
    return window.VentasPaymentsFeature?.agregarPago();
}

function obtenerSaldoFavorAplicadoVenta(totalVenta = 0) {
    return window.VentasPaymentsFeature?.obtenerSaldoFavorAplicadoVenta(totalVenta) || 0;
}

function actualizarListaPagos() {
    return window.VentasPaymentsFeature?.actualizarListaPagos();
}

function eliminarPago(index) {
    return window.VentasPaymentsFeature?.eliminarPago(index);
}

// Eliminar aplicarDescuento ya no se usa

function actualizarResumenPagos(totalDolares, totalBs) {
    return window.VentasPaymentsFeature?.actualizarResumenPagos(totalDolares, totalBs);
}

// ============================================
// PROCESAR VENTA CON PAGOS MÚLTIPLES
// ============================================

function procesarVenta() {
    return window.VentasCheckoutFeature?.procesarVenta();
}

// --- Soporte para Gestión de Vuelto Multimoneda ---

function abrirModalGestionVuelto(venta, monedaSugerida = 'USD') {
    return window.VentasCheckoutFeature?.abrirModalGestionVuelto(venta, monedaSugerida);
}

function volverATotalizacionDesdeGestionVuelto() {
    return window.VentasCheckoutFeature?.volverATotalizacionDesdeGestionVuelto();
}

function sugerirMontoVuelto() {
    return window.VentasCheckoutFeature?.sugerirMontoVuelto();
}

function actualizarMetodosVuelto(moneda) {
    return window.VentasCheckoutFeature?.actualizarMetodosVuelto(moneda);
}

function actualizarConversionesVuelto() {
    return window.VentasCheckoutFeature?.actualizarConversionesVuelto();
}

function agregarVueltoALista() {
    return window.VentasCheckoutFeature?.agregarVueltoALista();
}

function eliminarVueltoDeLista(index) {
    return window.VentasCheckoutFeature?.eliminarVueltoDeLista(index);
}

function actualizarUIGestionVuelto() {
    return window.VentasCheckoutFeature?.actualizarUIGestionVuelto();
}

function finalizarVentaSinVuelto() {
    return window.VentasCheckoutFeature?.finalizarVentaSinVuelto();
}

function confirmarVuelto() {
    return window.VentasCheckoutFeature?.confirmarVuelto();
}

async function terminarProcesoVenta(venta, mensajeVuelto) {
    return window.VentasCheckoutFeature?.terminarProcesoVenta(venta, mensajeVuelto);
}

function reiniciarVenta() {
    return window.VentasCheckoutFeature?.reiniciarVenta();
}

function generarRecibo(venta, vuelto) {
    return window.VentasPostventaFeature?.generarRecibo(venta, vuelto);
}

// ============================================
// HISTORIAL DE VENTAS
// ============================================

function mostrarHistorialVentas() {
    return window.VentasPostventaFeature?.mostrarHistorialVentas();
}

function mostrarVentas() {
    return window.VentasPostventaFeature?.mostrarVentas();
}

// ============================================
// UTILIDADES
// ============================================

function mostrarNotificacion(mensaje) {
    return window.Utils?.mostrarNotificacion(mensaje, 'info');
}

// ============================================
// NAVEGACIÓN DE TABS
// ============================================

function cambiarTab(tabName, actualizarHash = true) {
    return window.NavigationCore?.cambiarTab(tabName, actualizarHash);
}

// ============================================
// FUNCIONES DE INFORMES (delegadas al módulo InformesService)
// ============================================

async function cargarVentasDelDia() {
    return window.InformesService?.cargarVentasDelDia();
}

async function cargarTodasLasVentas() {
    return window.InformesService?.cargarTodasLasVentas();
}

async function filtrarInformesPorFecha() {
    return window.InformesService?.filtrarPorFecha();
}

async function limpiarFiltrosFecha() {
    return window.InformesService?.limpiarFiltros();
}

function mostrarInformes(ventasFiltradas, titulo) {
    return window.InformesService?.mostrar(ventasFiltradas, titulo);
}

function obtenerTimestampFecha(venta) {
    return window.Utils?.obtenerTimestampFecha(venta?.fecha || '') || 0;
}

function obtenerVentaPorId(ventaId) {
    return window.VentasPostventaFeature?.obtenerVentaPorId(ventaId);
}

function escaparAtributoHtml(valor) {
    return window.VentasPostventaFeature?.escaparAtributoHtml(valor) || '';
}

function obtenerResumenDevolucionVenta(venta) {
    return window.VentasPostventaFeature?.obtenerResumenDevolucionVenta(venta) || '';
}

function renderProductosVentaInforme(venta) {
    return window.VentasPostventaFeature?.renderProductosVentaInforme(venta) || 'Sin productos';
}

function renderAccionesVentaInforme(venta, numeroVenta) {
    return window.VentasPostventaFeature?.renderAccionesVentaInforme(venta, numeroVenta) || '';
}

function verDetallesPago(venta, numeroVenta) {
    return window.VentasPostventaFeature?.verDetallesPago(venta, numeroVenta);
}

function cerrarDetallePago() {
    return window.VentasPostventaFeature?.cerrarDetallePago();
}

function abrirModalDevolucion(ventaId) {
    return window.VentasPostventaFeature?.abrirModalDevolucion(ventaId);
}

function cerrarModalDevolucion() {
    return window.VentasPostventaFeature?.cerrarModalDevolucion();
}

function sincronizarFormularioReintegro() {
    return window.VentasPostventaFeature?.sincronizarFormularioReintegro();
}

function actualizarVistaFormularioReintegro() {
    return window.VentasPostventaFeature?.actualizarVistaFormularioReintegro();
}

function agregarReintegroDevolucion() {
    return window.VentasPostventaFeature?.agregarReintegroDevolucion();
}

function eliminarReintegroDevolucion(index) {
    return window.VentasPostventaFeature?.eliminarReintegroDevolucion(index);
}

function renderListaReintegrosDevolucion() {
    return window.VentasPostventaFeature?.renderListaReintegrosDevolucion();
}

function roundAmount(value) {
    return window.PricingUtils?.roundAmount(value) ?? 0;
}

function obtenerItemsDevolucionSeleccionados() {
    return window.VentasPostventaFeature?.obtenerItemsDevolucionSeleccionados() || [];
}

function actualizarResumenDevolucion() {
    return window.VentasPostventaFeature?.actualizarResumenDevolucion();
}

async function guardarDevolucionVenta() {
    return window.VentasPostventaFeature?.guardarDevolucionVenta();
}

function verTicketDevolucion(devolucion, venta) {
    return window.VentasPostventaFeature?.verTicketDevolucion(devolucion, venta);
}

function abrirVentanaImpresionTicket(ticketHtml, titulo) {
    return window.VentasPostventaFeature?.abrirVentanaImpresionTicket(ticketHtml, titulo);
}

// ============================================
// VER RECIBO COMPLETO
// ============================================

function verReciboCompleto(venta, numeroVenta) {
    return window.VentasPostventaFeature?.verReciboCompleto(venta, numeroVenta);
}

function cerrarReciboCompleto() {
    return window.VentasPostventaFeature?.cerrarReciboCompleto();
}

function imprimirTicket() {
    return window.VentasPostventaFeature?.imprimirTicket();
}

// Función para agregar producto con Enter
function agregarProductoPorEnter() {
    return window.VentasSearchFeature?.agregarProductoPorEnter();
}

function abrirModalCliente(clienteId = null, seleccionarDespues = false) {
    return window.ClientesFeature?.abrirModalCliente(clienteId, seleccionarDespues);
}

function cerrarModalCliente() {
    return window.ClientesFeature?.cerrarModalCliente();
}

function crearClienteRapidoDesdeVenta(seleccionarDespues = true) {
    return window.ClientesFeature?.crearClienteRapidoDesdeVenta(seleccionarDespues);
}

async function guardarClienteDesdeModal() {
    return window.ClientesFeature?.guardarClienteDesdeModal();
}

function editarCliente(clienteId) {
    return window.ClientesFeature?.editarCliente(clienteId);
}

function construirBloqueFotosCliente(cliente) {
    return window.ClientesFeature?.construirBloqueFotosCliente(cliente) || '';
}

async function verEstadoCuentaCliente(clienteId) {
    return window.ClientesFeature?.verEstadoCuentaCliente(clienteId);
}

function cerrarModalEstadoCuentaCliente() {
    return window.ClientesFeature?.cerrarModalEstadoCuentaCliente();
}

function registrarAbonoCuentaPrompt(cuentaId) {
    return window.CxcFeature?.registrarAbonoCuentaPrompt(cuentaId);
}

function cerrarModalAbonoCuenta() {
    return window.CxcFeature?.cerrarModalAbonoCuenta();
}

function obtenerCuentaAbonoActual() {
    return window.CxcFeature?.obtenerCuentaAbonoActual() || null;
}

function toggleModoAbonoCuenta() {
    return window.CxcFeature?.toggleModoAbonoCuenta();
}

function toggleMonedaAbonoCuenta() {
    return window.CxcFeature?.toggleMonedaAbonoCuenta();
}

function toggleTasaAbonoCuenta() {
    return window.CxcFeature?.toggleTasaAbonoCuenta();
}

function actualizarResumenAbonoCuenta() {
    return window.CxcFeature?.actualizarResumenAbonoCuenta();
}

async function guardarAbonoCuentaDesdeModal() {
    return window.CxcFeature?.guardarAbonoCuentaDesdeModal();
}
