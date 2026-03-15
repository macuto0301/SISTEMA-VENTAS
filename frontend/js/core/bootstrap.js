// ============================================
// ARRANQUE DE LA APLICACION (MIGRACION CONSERVADORA)
// ============================================

function obtenerFuncionGlobal(nombre) {
    if (typeof window[nombre] === 'function') {
        return window[nombre];
    }

    const accesosDirectos = {
        aplicarEstadoSidebar: () => window.NavigationCore?.aplicarEstadoSidebar?.bind(window.NavigationCore),
        sincronizarTabConHash: () => window.NavigationCore?.sincronizarTabConHash?.bind(window.NavigationCore),
        verificarSesion: () => window.AuthCore?.verificarSesion?.bind(window.AuthCore),
        manejarLogin: () => window.AuthCore?.manejarLogin?.bind(window.AuthCore),
        cargarConfiguracion: () => window.ConfigCore?.cargarConfiguracion?.bind(window.ConfigCore),
        actualizarFecha: () => window.ConfigCore?.actualizarFecha?.bind(window.ConfigCore),
        cargarProductos: () => window.ProductosFeature?.cargarProductos?.bind(window.ProductosFeature),
        guardarProducto: () => window.ProductosFeature?.guardarProducto?.bind(window.ProductosFeature),
        actualizarResumenPreciosProducto: () => window.ProductosFeature?.actualizarResumenPreciosProducto?.bind(window.ProductosFeature),
        recalcularPreciosProducto: () => window.ProductosFeature?.recalcularPreciosProducto?.bind(window.ProductosFeature),
        calcularPrecioVenta: () => window.ProductosFeature?.calcularPrecioVenta?.bind(window.ProductosFeature),
        calcularPrecioBolivares: () => window.ProductosFeature?.calcularPrecioBolivares?.bind(window.ProductosFeature),
        recalcularPorcentajeGanancia: () => window.ProductosFeature?.recalcularPorcentajeGanancia?.bind(window.ProductosFeature),
        calcularPrecioDolares: () => window.ProductosFeature?.calcularPrecioDolares?.bind(window.ProductosFeature),
        abrirModalPreciosProducto: () => window.ProductosFeature?.abrirModalPreciosProducto?.bind(window.ProductosFeature),
        cerrarModalPreciosProducto: () => window.ProductosFeature?.cerrarModalPreciosProducto?.bind(window.ProductosFeature),
        cargarDatosVentas: () => window.VentasDataFeature?.cargarDatosVentas?.bind(window.VentasDataFeature),
        mostrarVentas: () => window.VentasPostventaFeature?.mostrarVentas?.bind(window.VentasPostventaFeature),
        cargarClientes: () => window.ClientesFeature?.cargarClientes?.bind(window.ClientesFeature),
        cargarCuentasPorCobrar: () => window.CxcFeature?.cargarCuentasPorCobrar?.bind(window.CxcFeature),
        manejarCambioFotoProducto: () => window.ProductosMediaFeature?.manejarCambioFotoProducto?.bind(window.ProductosMediaFeature),
        manejarCambioFotoCliente: () => window.ClientesMediaFeature?.manejarCambioFotoCliente?.bind(window.ClientesMediaFeature),
        filtrarProductos: () => window.VentasSearchFeature?.filtrarProductos?.bind(window.VentasSearchFeature),
        manejarTecladoBusqueda: () => window.VentasSearchFeature?.manejarTecladoBusqueda?.bind(window.VentasSearchFeature),
        agregarPago: () => window.VentasPaymentsFeature?.agregarPago?.bind(window.VentasPaymentsFeature),
        manejarAtajosVentas: () => window.VentasShortcutsFeature?.manejarAtajosVentas?.bind(window.VentasShortcutsFeature),
        manejarTecladoGaleriaProducto: () => window.ProductosGalleryFeature?.manejarTecladoGaleriaProducto?.bind(window.ProductosGalleryFeature),
        manejarWheelGaleriaProducto: () => window.ProductosGalleryFeature?.manejarWheelGaleriaProducto?.bind(window.ProductosGalleryFeature),
        iniciarArrastreGaleriaProducto: () => window.ProductosGalleryFeature?.iniciarArrastreGaleriaProducto?.bind(window.ProductosGalleryFeature),
        moverArrastreGaleriaProducto: () => window.ProductosGalleryFeature?.moverArrastreGaleriaProducto?.bind(window.ProductosGalleryFeature),
        terminarArrastreGaleriaProducto: () => window.ProductosGalleryFeature?.terminarArrastreGaleriaProducto?.bind(window.ProductosGalleryFeature)
    };

    const resolver = accesosDirectos[nombre];
    if (typeof resolver === 'function') {
        const handler = resolver();
        if (typeof handler === 'function') {
            return handler;
        }
    }

    return null;
}

function registrarEventoElemento(id, tipoEvento, handler) {
    const elemento = document.getElementById(id);
    if (!elemento || typeof handler !== 'function') return;
    elemento.addEventListener(tipoEvento, handler);
}

function registrarEventosGeneralesApp() {
    registrarEventoElemento('btnCerrarSesionHeader', 'click', () => window.AuthCore?.cerrarSesion?.());
    registrarEventoElemento('productoPrecioCosto', 'input', obtenerFuncionGlobal('recalcularPreciosProducto'));
    registrarEventoElemento('productoPrecioCosto', 'input', obtenerFuncionGlobal('actualizarResumenPreciosProducto'));
    registrarEventoElemento('productoPorcentajeGanancia1', 'input', () => obtenerFuncionGlobal('calcularPrecioVenta')?.(1));
    registrarEventoElemento('productoPorcentajeGanancia2', 'input', () => obtenerFuncionGlobal('calcularPrecioVenta')?.(2));
    registrarEventoElemento('productoPorcentajeGanancia3', 'input', () => obtenerFuncionGlobal('calcularPrecioVenta')?.(3));

    registrarEventoElemento('productoPrecioDolares1', 'input', () => {
        obtenerFuncionGlobal('calcularPrecioBolivares')?.();
        obtenerFuncionGlobal('recalcularPorcentajeGanancia')?.(1);
    });
    registrarEventoElemento('productoPrecioDolares2', 'input', () => obtenerFuncionGlobal('recalcularPorcentajeGanancia')?.(2));
    registrarEventoElemento('productoPrecioDolares3', 'input', () => obtenerFuncionGlobal('recalcularPorcentajeGanancia')?.(3));
    registrarEventoElemento('productoMetodoRedondeo', 'change', () => {
        obtenerFuncionGlobal('calcularPrecioBolivares')?.();
        obtenerFuncionGlobal('actualizarResumenPreciosProducto')?.();
    });

    registrarEventoElemento('productoPrecioBolivares', 'input', () => {
        obtenerFuncionGlobal('calcularPrecioDolares')?.();
        obtenerFuncionGlobal('recalcularPorcentajeGanancia')?.(1);
    });

    registrarEventoElemento('productoFoto', 'change', obtenerFuncionGlobal('manejarCambioFotoProducto'));
    registrarEventoElemento('clienteFotoPerfilModal', 'change', event => obtenerFuncionGlobal('manejarCambioFotoCliente')?.('perfil', event));
    registrarEventoElemento('clienteFotoCedulaModal', 'change', event => obtenerFuncionGlobal('manejarCambioFotoCliente')?.('cedula', event));
    registrarEventoElemento('formProducto', 'submit', obtenerFuncionGlobal('guardarProducto'));
    registrarEventoElemento('formLogin', 'submit', event => {
        event.preventDefault();
        obtenerFuncionGlobal('manejarLogin')?.(event);
    });
    registrarEventoElemento('buscarProducto', 'input', obtenerFuncionGlobal('filtrarProductos'));
    registrarEventoElemento('buscarProducto', 'keydown', obtenerFuncionGlobal('manejarTecladoBusqueda'));
    registrarEventoElemento('btnAgregarPago', 'click', obtenerFuncionGlobal('agregarPago'));

    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            if (!tabName) return;
            window.NavigationCore?.cambiarTab?.(tabName);
        });
    });

    registrarEventoElemento('btnConfiguracion', 'click', () => window.ConfigCore?.abrirModalConfiguracion?.());
    registrarEventoElemento('btnCerrarModalCerrarSesion', 'click', () => window.AuthCore?.cerrarModalCerrarSesion?.());
    registrarEventoElemento('btnCancelarCerrarSesion', 'click', () => window.AuthCore?.cerrarModalCerrarSesion?.());
    registrarEventoElemento('btnConfirmarCerrarSesion', 'click', () => window.AuthCore?.cerrarSesionConfirmada?.());
    registrarEventoElemento('btnToggleSidebar', 'click', () => window.NavigationCore?.toggleSidebar?.());
    registrarEventoElemento('btnCerrarModalConfiguracion', 'click', () => window.ConfigCore?.cerrarModalConfiguracion?.());
    registrarEventoElemento('btnConfigCancelar', 'click', () => window.ConfigCore?.cerrarModalConfiguracion?.());
    registrarEventoElemento('btnConfigGuardar', 'click', () => window.ConfigCore?.guardarConfiguracion?.());
    registrarEventoElemento('btnConfigActualizarBcv', 'click', event => window.ConfigCore?.actualizarTasaBCV?.(event));
    registrarEventoElemento('btnListaPrecios', 'click', () => window.ProductosFeature?.abrirModalListaPrecios?.());
    registrarEventoElemento('btnNuevoProducto', 'click', () => window.ProductosFeature?.mostrarFormularioProducto?.());
    registrarEventoElemento('btnCerrarModalProducto', 'click', () => window.ProductosFeature?.cerrarModalProducto?.());
    registrarEventoElemento('btnCancelarProducto', 'click', () => window.ProductosFeature?.cerrarModalProducto?.());
    registrarEventoElemento('btnAbrirPreciosProducto', 'click', () => window.ProductosFeature?.abrirModalPreciosProducto?.());
    registrarEventoElemento('btnCerrarModalPreciosProducto', 'click', () => window.ProductosFeature?.cerrarModalPreciosProducto?.());
    registrarEventoElemento('btnCerrarPreciosProducto', 'click', () => window.ProductosFeature?.cerrarModalPreciosProducto?.());
    registrarEventoElemento('btnCerrarModalListaPrecios', 'click', () => window.ProductosFeature?.cerrarModalListaPrecios?.());
    registrarEventoElemento('btnCancelarListaPrecios', 'click', () => window.ProductosFeature?.cerrarModalListaPrecios?.());
    registrarEventoElemento('formListaPrecios', 'submit', event => window.ProductosFeature?.generarListaPrecios?.(event));
    registrarEventoElemento('btnLimpiarFotosProducto', 'click', () => window.ProductosMediaFeature?.limpiarFotoProductoSeleccionada?.());
    registrarEventoElemento('buscarProductoGestion', 'input', () => window.ProductosFeature?.filtrarProductosGestion?.());
    registrarEventoElemento('buscarCliente', 'input', () => window.ClientesFeature?.cargarClientes?.());
    registrarEventoElemento('btnNuevoCliente', 'click', () => window.ClientesFeature?.abrirModalCliente?.());
    registrarEventoElemento('btnCerrarModalCliente', 'click', () => window.ClientesFeature?.cerrarModalCliente?.());
    registrarEventoElemento('btnCancelarCliente', 'click', () => window.ClientesFeature?.cerrarModalCliente?.());
    registrarEventoElemento('btnGuardarCliente', 'click', () => window.ClientesFeature?.guardarClienteDesdeModal?.());
    registrarEventoElemento('btnLimpiarFotoClientePerfil', 'click', () => window.ClientesMediaFeature?.limpiarFotoCliente?.('perfil'));
    registrarEventoElemento('btnLimpiarFotoClienteCedula', 'click', () => window.ClientesMediaFeature?.limpiarFotoCliente?.('cedula'));
    registrarEventoElemento('btnBuscarClienteVenta', 'click', () => window.ClientesFeature?.abrirModalBuscarClienteVenta?.());
    registrarEventoElemento('btnLimpiarClienteVenta', 'click', () => window.ClientesFeature?.limpiarClienteVenta?.());
    registrarEventoElemento('btnNuevoClienteVenta', 'click', () => window.ClientesFeature?.crearClienteRapidoDesdeVenta?.());
    registrarEventoElemento('cliente', 'click', () => window.ClientesFeature?.abrirModalBuscarClienteVenta?.());
    registrarEventoElemento('buscarClienteVentaModal', 'input', () => window.ClientesFeature?.renderListaBusquedaClienteVenta?.());
    registrarEventoElemento('btnBuscarClienteCxc', 'click', () => window.CxcFeature?.abrirModalBuscarClienteCxc?.());
    registrarEventoElemento('btnLimpiarClienteCxc', 'click', () => window.CxcFeature?.limpiarClienteCxc?.());
    registrarEventoElemento('buscarClienteCxcModal', 'input', () => window.CxcFeature?.renderListaBusquedaClienteCxc?.());
    registrarEventoElemento('btnToggleResumenVenta', 'click', () => window.VentasSummaryModalComponent?.open?.());
    registrarEventoElemento('btnAbrirTotalizacionVenta', 'click', () => window.VentasPaymentsFeature?.abrirModalTotalizacion?.());
    registrarEventoElemento('btnCerrarModalTotalizacion', 'click', () => window.VentasPaymentsFeature?.cerrarModalTotalizacion?.());
    registrarEventoElemento('usarSaldoFavorVenta', 'change', () => window.VentasPaymentsFeature?.actualizarListaPagos?.());
    registrarEventoElemento('montoSaldoFavorVenta', 'input', () => window.VentasPaymentsFeature?.actualizarListaPagos?.());
    registrarEventoElemento('btnProcesarVenta', 'click', () => window.VentasCheckoutFeature?.procesarVenta?.());
    registrarEventoElemento('btnLimpiarVenta', 'click', () => obtenerFuncionGlobal('limpiarCarrito')?.());
    registrarEventoElemento('btnAgregarVueltoLista', 'click', () => window.VentasCheckoutFeature?.agregarVueltoALista?.());
    registrarEventoElemento('btnFinalizarVentaSinVuelto', 'click', () => window.VentasCheckoutFeature?.finalizarVentaSinVuelto?.());
    registrarEventoElemento('btnConfirmarVuelto', 'click', () => window.VentasCheckoutFeature?.confirmarVuelto?.());
    registrarEventoElemento('btnCerrarModalVuelto', 'click', () => window.VentasPostventaFeature?.cerrarModalVuelto?.());
    registrarEventoElemento('btnAceptarModalVuelto', 'click', () => window.VentasPostventaFeature?.cerrarModalVuelto?.());
    registrarEventoElemento('btnCerrarModalExcedenteTotalizacion', 'click', () => window.VentasPaymentsFeature?.cerrarModalExcedenteTotalizacion?.());
    registrarEventoElemento('btnAceptarExcedenteSaldoFavor', 'click', () => window.VentasPaymentsFeature?.aceptarExcedenteComoSaldoFavor?.());
    registrarEventoElemento('btnGestionarExcedenteVuelto', 'click', () => window.VentasPaymentsFeature?.gestionarExcedenteComoVuelto?.());
    registrarEventoElemento('btnFiltrarInformes', 'click', () => window.InformesService?.filtrarPorFecha?.());
    registrarEventoElemento('btnLimpiarInformes', 'click', () => window.InformesService?.limpiarFiltros?.());
    registrarEventoElemento('btnVentasHoy', 'click', () => window.InformesService?.cargarVentasDelDia?.());
    registrarEventoElemento('btnVentasTodas', 'click', () => window.InformesService?.cargarTodasLasVentas?.());
    registrarEventoElemento('btnCerrarModalAbonoCuenta', 'click', () => window.CxcFeature?.cerrarModalAbonoCuenta?.());
    registrarEventoElemento('btnCancelarAbonoCuenta', 'click', () => window.CxcFeature?.cerrarModalAbonoCuenta?.());
    registrarEventoElemento('btnGuardarAbonoCuenta', 'click', () => window.CxcFeature?.guardarAbonoCuentaDesdeModal?.());

    const manejarAtajosVentas = obtenerFuncionGlobal('manejarAtajosVentas');
    if (manejarAtajosVentas) document.addEventListener('keydown', manejarAtajosVentas);

    const manejarTecladoGaleriaProducto = obtenerFuncionGlobal('manejarTecladoGaleriaProducto');
    if (manejarTecladoGaleriaProducto) document.addEventListener('keydown', manejarTecladoGaleriaProducto);

    const galeriaImagen = document.getElementById('galeriaProductoImagen');
    const manejarWheelGaleriaProducto = obtenerFuncionGlobal('manejarWheelGaleriaProducto');
    if (galeriaImagen && manejarWheelGaleriaProducto) {
        galeriaImagen.addEventListener('wheel', manejarWheelGaleriaProducto, { passive: false });
    }

    const galeriaStage = document.querySelector('.galeria-stage');
    const iniciarArrastreGaleriaProducto = obtenerFuncionGlobal('iniciarArrastreGaleriaProducto');
    if (galeriaStage && iniciarArrastreGaleriaProducto) {
        galeriaStage.addEventListener('pointerdown', iniciarArrastreGaleriaProducto);
    }

    const moverArrastreGaleriaProducto = obtenerFuncionGlobal('moverArrastreGaleriaProducto');
    if (moverArrastreGaleriaProducto) document.addEventListener('pointermove', moverArrastreGaleriaProducto);

    const terminarArrastreGaleriaProducto = obtenerFuncionGlobal('terminarArrastreGaleriaProducto');
    if (terminarArrastreGaleriaProducto) {
        document.addEventListener('pointerup', terminarArrastreGaleriaProducto);
        document.addEventListener('pointercancel', terminarArrastreGaleriaProducto);
    }

    document.addEventListener('click', function (event) {
        if (event.target.closest('.seleccion-productos')) return;
        const sugerencias = document.getElementById('sugerenciasProductos');
        if (sugerencias) {
            sugerencias.style.display = 'none';
        }
    });
}

function inicializarCalendariosApp() {
    if (!window.SVDatePicker) return;

    [
        'fechaInicioInforme',
        'fechaFinInforme',
        'fechaInicioCompraFiltro',
        'fechaFinCompraFiltro',
        'compraFecha',
        'compraFechaLibro'
    ].forEach(id => window.SVDatePicker.enhance(id));
}

async function inicializarDatosApp() {
    obtenerFuncionGlobal('aplicarEstadoSidebar')?.(localStorage.getItem('sidebar_collapsed') === 'true');
    obtenerFuncionGlobal('verificarSesion')?.();

    if (!window.AuthCore?.tieneSesionActiva?.()) {
        obtenerFuncionGlobal('actualizarFecha')?.();
        setInterval(() => obtenerFuncionGlobal('actualizarFecha')?.(), 60000);
        return;
    }

    const cargasIniciales = [
        ['configuracion', obtenerFuncionGlobal('cargarConfiguracion')],
        ['productos', obtenerFuncionGlobal('cargarProductos')],
        ['ventas', obtenerFuncionGlobal('cargarDatosVentas')],
        ['clientes', obtenerFuncionGlobal('cargarClientes')],
        ['cuentas_por_cobrar', obtenerFuncionGlobal('cargarCuentasPorCobrar')]
    ];

    await Promise.allSettled(cargasIniciales.map(([nombre, fn]) => {
        if (typeof fn !== 'function') {
            return Promise.resolve();
        }

        try {
            return Promise.resolve(fn());
        } catch (error) {
            console.error(`Error iniciando carga de ${nombre}:`, error);
            return Promise.reject(error);
        }
    }));

    obtenerFuncionGlobal('mostrarVentas')?.();
    obtenerFuncionGlobal('actualizarFecha')?.();
    setInterval(() => obtenerFuncionGlobal('actualizarFecha')?.(), 60000);
}

document.addEventListener('DOMContentLoaded', async function () {
    window.LoginScreenComponent?.render?.();
    window.ProviderModalComponent?.ensureRendered?.();
    window.PurchaseModalComponent?.ensureRendered?.();
    window.PurchasePricesModalComponent?.ensureRendered?.();
    window.PurchaseDetailModalComponent?.ensureRendered?.();
    window.ChangeManagementModalComponent?.ensureRendered?.();
    window.SaleSuccessModalComponent?.ensureRendered?.();
    window.SalesCheckoutModalComponent?.ensureRendered?.();
    window.ReturnModalComponent?.ensureRendered?.();
    window.VentasSummaryModalComponent?.ensureRendered?.();
    window.VentasPostventaFeature?.inicializarComponentesPostventa?.();
    registrarEventosGeneralesApp();
    inicializarCalendariosApp();

    const sincronizarTabConHash = obtenerFuncionGlobal('sincronizarTabConHash');
    if (sincronizarTabConHash) {
        window.addEventListener('hashchange', sincronizarTabConHash);
    }

    await inicializarDatosApp();
});
