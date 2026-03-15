const AuthCore = {
    logoutConfirmacionActiva: false,

    decodificarPayloadJwt(token) {
        if (!token || typeof token !== 'string') {
            return null;
        }

        const partes = token.split('.');
        if (partes.length !== 3) {
            return null;
        }

        try {
            const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
            const padding = '='.repeat((4 - (base64.length % 4)) % 4);
            const json = atob(base64 + padding);
            return JSON.parse(json);
        } catch (error) {
            console.warn('No se pudo decodificar el token local.', error);
            return null;
        }
    },

    obtenerSesionActual() {
        const sesion = this.obtenerSesionPersistida();
        if (!sesion) {
            return null;
        }

        try {
            return JSON.parse(sesion);
        } catch (error) {
            console.warn('Sesion local invalida, se limpiara el acceso guardado.', error);
            this.limpiarSesionPersistida();
            return null;
        }
    },

    sesionEstaExpirada(sesion) {
        const exp = Number(sesion?.exp || 0);
        if (!exp) {
            return true;
        }
        return Math.floor(Date.now() / 1000) >= exp;
    },

    tieneSesionActiva() {
        const sesion = this.obtenerSesionActual();
        if (!sesion?.token || !sesion?.user?.username) {
            return false;
        }

        if (this.sesionEstaExpirada(sesion)) {
            this.limpiarSesionPersistida();
            return false;
        }

        return true;
    },

    obtenerModalCerrarSesion() {
        if (!window.SVModal) {
            return null;
        }

        if (!this._logoutModal) {
            this._logoutModal = window.SVModal.enhance('modalCerrarSesion', {
                dismissible: true,
                backdropDismissible: true,
                escapeDismissible: true,
                onOpen: () => {
                    this.logoutConfirmacionActiva = true;
                },
                onClose: () => {
                    this.logoutConfirmacionActiva = false;
                }
            });
        }

        return this._logoutModal;
    },

    obtenerCamposLogin() {
        if (!window.SVField) {
            return { usuario: null, contrasena: null };
        }

        return {
            usuario: window.SVField.get('loginUser') || null,
            contrasena: window.SVField.get('loginPass') || null
        };
    },

    obtenerSesionPersistida() {
        return localStorage.getItem('sesion_ventas') || sessionStorage.getItem('sesion_ventas');
    },

    guardarSesionPersistida(sesion) {
        const valor = JSON.stringify(sesion || null);
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
        const sesion = this.obtenerSesionActual();
        const sesionActiva = this.tieneSesionActiva();
        document.body.classList.toggle('login-active', !sesionActiva);

        if (sesionActiva && sesion) {
            window.usuarioLogueado = sesion.user;
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

    manejarSesionExpirada(notificar = true) {
        const habiaSesion = Boolean(this.obtenerSesionPersistida());
        this.limpiarSesionPersistida();
        window.usuarioLogueado = null;
        if (window.AppState) {
            window.AppState.usuarioLogueado = null;
        }

        if (habiaSesion && notificar) {
            window.mostrarNotificacion?.('⚠️ Tu sesion vencio. Ingresa nuevamente');
        }

        this.verificarSesion();
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
        const campos = this.obtenerCamposLogin();

        campos.usuario?.clearError();
        campos.contrasena?.clearError();

        if (!btn) {
            console.warn('No se encontro el boton de login para procesar el acceso.');
            return;
        }

        if (!username) {
            campos.usuario?.setError('Ingresa tu usuario para continuar.');
        }

        if (!password) {
            campos.contrasena?.setError('Ingresa tu contrasena para continuar.');
        }

        if (!username || !password) {
            if (feedback) {
                feedback.textContent = 'Completa tus credenciales para iniciar sesion.';
                feedback.dataset.state = 'error';
            }
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
                const payloadToken = this.decodificarPayloadJwt(data.access_token);
                const sesion = {
                    token: data.access_token,
                    tokenType: data.token_type || 'Bearer',
                    user: data.user,
                    exp: Number(payloadToken?.exp || 0),
                    expiresAt: data.expires_at || null
                };

                if (!sesion.token || !sesion.user?.username || !sesion.exp) {
                    throw new Error('El servidor no devolvio una sesion valida.');
                }

                window.usuarioLogueado = data.user;
                if (window.AppState) {
                    window.AppState.usuarioLogueado = window.usuarioLogueado;
                }
                this.guardarSesionPersistida(sesion);

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
            } else {
                if (feedback) {
                    feedback.textContent = data.message || 'No se pudo validar el acceso.';
                    feedback.dataset.state = 'error';
                }
                campos.contrasena?.setError('Verifica tu usuario y contrasena.');
            }
        } catch (e) {
            console.error('Error en flujo de login:', e);
            if (feedback) {
                feedback.textContent = 'No se pudo completar el inicio de sesion.';
                feedback.dataset.state = 'error';
            }
            campos.contrasena?.setError('Ocurrio un problema al validar el acceso.');
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
        const modalApi = this.obtenerModalCerrarSesion();

        if (!modal) {
            this.cerrarSesionConfirmada();
            return;
        }

        const usuario = document.getElementById('modalCerrarSesionUsuario');
        if (usuario) {
            usuario.textContent = window.usuarioLogueado?.username || 'este usuario';
        }
        modalApi?.open() || (modal.style.display = 'block');

        const btnConfirmar = document.getElementById('btnConfirmarCerrarSesion');
        btnConfirmar?.focus();
    },

    cerrarModalCerrarSesion() {
        const modal = document.getElementById('modalCerrarSesion');
        const modalApi = this.obtenerModalCerrarSesion();

        if (!modal) {
            return;
        }

        if (modalApi) {
            modalApi.close();
            return;
        }

        this.logoutConfirmacionActiva = false;
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    },

    cerrarSesionConfirmada() {
        this.cerrarModalCerrarSesion();
        this.manejarSesionExpirada(false);
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
