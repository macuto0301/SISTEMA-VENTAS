const AuthCore = {
    logoutConfirmacionActiva: false,

    obtenerSesionPersistida() {
        return localStorage.getItem('sesion_ventas') || sessionStorage.getItem('sesion_ventas');
    },

    guardarSesionPersistida(usuario) {
        const valor = JSON.stringify(usuario || null);
        try {
            localStorage.setItem('sesion_ventas', valor);
        } catch (error) {
            console.warn('No se pudo guardar sesion en localStorage, usando sessionStorage.', error);
        }
        sessionStorage.setItem('sesion_ventas', valor);
    },

    limpiarSesionPersistida() {
        localStorage.removeItem('sesion_ventas');
        sessionStorage.removeItem('sesion_ventas');
    },

    obtenerTabsPermitidos() {
        return window.usuarioLogueado?.rol === 'cajero'
            ? ['ventas']
            : ['productos', 'ventas', 'clientes', 'cuentas', 'proveedores', 'compras', 'informes'];
    },

    actualizarModoInterfazPorRol() {
        document.body.classList.toggle('modo-cajero', window.usuarioLogueado?.rol === 'cajero');

        if (window.usuarioLogueado?.rol === 'cajero') {
            window.aplicarEstadoSidebar?.(true);
            return;
        }

        window.aplicarEstadoSidebar?.(localStorage.getItem('sidebar_collapsed') === 'true');
    },

    aplicarPermisosUsuario() {
        const nombreUsuario = document.getElementById('nombreUsuarioDisplay');
        const rolUsuario = document.getElementById('rolUsuarioDisplay');
        const btnConfiguracion = document.getElementById('btnConfiguracion');
        const tabsPermitidos = this.obtenerTabsPermitidos();

        this.actualizarModoInterfazPorRol();

        if (nombreUsuario && window.usuarioLogueado?.username) {
            nombreUsuario.textContent = window.usuarioLogueado.username;
        }

        if (rolUsuario) {
            rolUsuario.textContent = window.usuarioLogueado?.rol ? `(${window.usuarioLogueado.rol})` : '';
        }

        document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
            btn.style.display = tabsPermitidos.includes(btn.dataset.tab) ? 'inline-flex' : 'none';
        });

        if (btnConfiguracion) {
            btnConfiguracion.style.display = window.usuarioLogueado?.rol === 'cajero' ? 'none' : 'inline-flex';
        }
    },

    asegurarVistaInicialPorRol() {
        const tabsPermitidos = this.obtenerTabsPermitidos();
        const tabHash = window.obtenerTabDesdeHash?.() || '';

        if (tabHash && tabsPermitidos.includes(tabHash)) {
            window.cambiarTab?.(tabHash, false);
            return;
        }

        const tabPorDefecto = window.usuarioLogueado?.rol === 'cajero' ? 'ventas' : 'productos';
        window.cambiarTab?.(tabPorDefecto);
    },

    verificarSesion() {
        const sesion = this.obtenerSesionPersistida();
        document.body.classList.toggle('login-active', !sesion);

        if (sesion) {
            try {
                window.usuarioLogueado = JSON.parse(sesion);
            } catch (error) {
                console.warn('Sesion local invalida, se limpiara el acceso guardado.', error);
                this.limpiarSesionPersistida();
                window.usuarioLogueado = null;
                window.AppState.usuarioLogueado = null;
                document.getElementById('panelLogin').style.display = 'flex';
                document.getElementById('panelPrincipal').style.display = 'none';
                return;
            }
            window.AppState.usuarioLogueado = window.usuarioLogueado;
            document.getElementById('panelLogin').style.display = 'none';
            document.getElementById('panelPrincipal').style.display = 'block';
            this.aplicarPermisosUsuario();
            this.asegurarVistaInicialPorRol();
        } else {
            document.getElementById('panelLogin').style.display = 'flex';
            document.getElementById('panelPrincipal').style.display = 'none';
        }
    },

    async manejarLogin(event) {
        const submitEvent = event || window.event;
        submitEvent?.preventDefault?.();

        const form = submitEvent?.target?.closest?.('form') || document.getElementById('formLogin');
        const username = document.getElementById('loginUser').value.trim();
        const password = document.getElementById('loginPass').value;
        const btn = form?.querySelector('button[type="submit"], button');
        const feedback = document.getElementById('loginFeedback');
        const label = btn?.querySelector('.btn-login-label');

        if (!btn) {
            console.warn('No se encontro el boton de login para procesar el acceso.');
            return;
        }

        if (feedback) {
            feedback.textContent = '';
            feedback.dataset.state = '';
        }

        try {
            btn.disabled = true;
            if (label) {
                label.textContent = 'Ingresando...';
            } else {
                btn.textContent = 'Ingresando...';
            }

            const baseUrl = typeof API_URL !== 'undefined' ? API_URL : (window.API?.baseUrl || 'http://localhost:5000/api');
            const res = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            let data = {};
            try {
                data = await res.json();
            } catch (parseError) {
                data = { message: 'Respuesta invalida del servidor.' };
            }

            if (res.ok && data.success) {
                window.usuarioLogueado = data.user;
                if (window.AppState) {
                    window.AppState.usuarioLogueado = window.usuarioLogueado;
                }
                this.guardarSesionPersistida(window.usuarioLogueado);

                if (feedback) {
                    feedback.textContent = `Acceso aprobado para ${window.usuarioLogueado.username}`;
                    feedback.dataset.state = 'success';
                }

                this.verificarSesion();
                await Promise.allSettled([
                    window.cargarConfiguracion?.(),
                    window.cargarProductos?.(),
                    window.cargarDatosVentas?.(),
                    window.cargarClientes?.(),
                    window.cargarCuentasPorCobrar?.()
                ]);
                window.mostrarVentas?.();
                this.asegurarVistaInicialPorRol();
                window.mostrarNotificacion?.('✅ Bienvenid@ al sistema');
            } else if (feedback) {
                feedback.textContent = data.message || 'No se pudo validar el acceso.';
                feedback.dataset.state = 'error';
            }
        } catch (e) {
            console.error('Error en flujo de login:', e);
            if (feedback) {
                feedback.textContent = 'No se pudo completar el inicio de sesion.';
                feedback.dataset.state = 'error';
            }
        } finally {
            btn.disabled = false;
            if (label) {
                label.textContent = 'Entrar al sistema';
            } else {
                btn.textContent = 'Entrar al sistema';
            }
        }
    },

    abrirModalCerrarSesion() {
        const modal = document.getElementById('modalCerrarSesion');

        if (!modal) {
            this.cerrarSesionConfirmada();
            return;
        }

        const usuario = document.getElementById('modalCerrarSesionUsuario');
        this.logoutConfirmacionActiva = true;
        if (usuario) {
            usuario.textContent = window.usuarioLogueado?.username || 'este usuario';
        }
        modal.style.display = 'block';
        document.body.classList.add('modal-open');

        const btnConfirmar = document.getElementById('btnConfirmarCerrarSesion');
        btnConfirmar?.focus();
    },

    cerrarModalCerrarSesion() {
        const modal = document.getElementById('modalCerrarSesion');

        if (!modal) {
            return;
        }

        this.logoutConfirmacionActiva = false;
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    },

    cerrarSesionConfirmada() {
        this.cerrarModalCerrarSesion();
        this.limpiarSesionPersistida();
        window.usuarioLogueado = null;
        window.AppState.usuarioLogueado = null;
        window.location.reload();
    },

    cerrarSesion() {
        this.abrirModalCerrarSesion();
    }
};

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && AuthCore.logoutConfirmacionActiva) {
        AuthCore.cerrarModalCerrarSesion();
    }
});

window.AuthCore = AuthCore;
