const NavigationCore = {
    obtenerTabsPermitidosUsuario() {
        if (typeof window.obtenerTabsPermitidos === 'function') {
            return window.obtenerTabsPermitidos();
        }
        if (window.AuthCore?.obtenerTabsPermitidos) {
            return window.AuthCore.obtenerTabsPermitidos();
        }
        return this.obtenerTabsDisponibles();
    },

    aplicarEstadoSidebar(colapsado) {
        const contenedor = document.getElementById('panelPrincipal');
        const boton = document.getElementById('btnToggleSidebar');
        const icono = boton?.querySelector('.sidebar-toggle-icon');

        if (!contenedor || !boton) return;

        const oculto = Boolean(colapsado);
        contenedor.classList.toggle('sidebar-collapsed', oculto);
        boton.setAttribute('aria-expanded', String(!oculto));
        boton.setAttribute('title', oculto ? 'Mostrar menu' : 'Ocultar menu');
        if (icono) {
            icono.textContent = oculto ? '▶' : '◀';
        }
    },

    toggleSidebar() {
        const contenedor = document.getElementById('panelPrincipal');
        if (!contenedor) return;

        const colapsado = !contenedor.classList.contains('sidebar-collapsed');
        this.aplicarEstadoSidebar(colapsado);
        localStorage.setItem('sidebar_collapsed', colapsado ? 'true' : 'false');
    },

    obtenerTabsDisponibles() {
        return ['productos', 'ventas', 'clientes', 'cuentas', 'proveedores', 'compras', 'informes'];
    },

    obtenerTabDesdeHash() {
        const tab = window.location.hash.replace(/^#/, '').trim().toLowerCase();
        return this.obtenerTabsDisponibles().includes(tab) ? tab : '';
    },

    sincronizarTabConHash() {
        if (!window.AuthCore?.tieneSesionActiva?.()) return;
        const tab = this.obtenerTabDesdeHash();
        if (!tab) return;
        if (typeof window.cambiarTab === 'function') {
            window.cambiarTab(tab, false);
        }
    },

    cambiarTab(tabName, actualizarHash = true) {
        if (!window.AuthCore?.tieneSesionActiva?.()) {
            document.body.classList.add('login-active');
            return;
        }

        const tabsPermitidos = this.obtenerTabsPermitidosUsuario();
        if (window.usuarioLogueado && !tabsPermitidos.includes(tabName)) {
            window.mostrarNotificacion('🔒 Este usuario solo puede usar el POS de ventas');
            return;
        }

        if (!this.obtenerTabsDisponibles().includes(tabName)) {
            return;
        }

        if (actualizarHash && window.location.hash !== `#${tabName}`) {
            window.location.hash = tabName;
        }

        const panels = document.querySelectorAll('.tab-panel');
        panels.forEach(panel => {
            panel.classList.remove('active');
            panel.style.display = 'none';
        });

        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
        });

        let panelId = '';
        switch (tabName) {
            case 'productos':
                panelId = 'panelProductos';
                break;
            case 'ventas':
                panelId = 'panelVentas';
                break;
            case 'clientes':
                panelId = 'panelClientes';
                setTimeout(() => {
                    if (typeof window.cargarClientes === 'function') {
                        window.cargarClientes();
                        return;
                    }
                    window.ClientesFeature?.cargarClientes?.();
                }, 100);
                break;
            case 'cuentas':
                panelId = 'panelCuentas';
                setTimeout(() => {
                    if (typeof window.cargarCuentasPorCobrar === 'function') {
                        window.cargarCuentasPorCobrar();
                        return;
                    }
                    window.CxcFeature?.cargarCuentasPorCobrar?.();
                }, 100);
                break;
            case 'proveedores':
                panelId = 'panelProveedores';
                if (typeof ProveedoresModule !== 'undefined') {
                    setTimeout(() => ProveedoresModule.init(), 100);
                }
                break;
            case 'compras':
                panelId = 'panelCompras';
                if (typeof ComprasModule !== 'undefined') {
                    setTimeout(() => {
                        ComprasModule.init();
                    }, 100);
                }
                break;
            case 'informes':
                panelId = 'panelInformes';
                setTimeout(() => {
                    if (typeof window.cargarTodasLasVentas === 'function') {
                        window.cargarTodasLasVentas();
                        return;
                    }
                    window.InformesService?.cargarTodasLasVentas?.();
                }, 100);
                break;
        }

        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.style.display = 'none';
            panel.classList.remove('active');
        });

        const panel = document.getElementById(panelId);
        if (panel) {
            panel.style.display = 'block';
            panel.classList.add('active');
            if (tabName === 'ventas') {
                setTimeout(() => {
                    if (typeof window.enfocarCampoVentas === 'function') {
                        window.enfocarCampoVentas('buscarProducto');
                        return;
                    }
                    window.VentasPaymentsFeature?.enfocarCampoVentas?.('buscarProducto');
                }, 80);
            }
        }

        const activeButton = Array.from(buttons).find(btn => btn.dataset.tab === tabName);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
};

window.NavigationCore = NavigationCore;
