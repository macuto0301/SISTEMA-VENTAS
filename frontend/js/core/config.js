const ConfigCore = {
    obtenerModalConfiguracion() {
        if (!window.SVModal) {
            return null;
        }

        if (!this._settingsModal) {
            this._settingsModal = window.SVModal.enhance('modalConfiguracion', {
                dismissible: true,
                backdropDismissible: true,
                escapeDismissible: true
            });
        }

        return this._settingsModal;
    },

    async cargarConfiguracion() {
        const config = await window.ApiService.cargarConfiguracion();

        if (config) {
            window.AppState.tasaDolar = config.tasaDolar;
            window.AppState.tasaVuelto = config.tasaVuelto;
            window.AppState.porcentajeGananciaDefecto = config.porcentajeGananciaDefecto;
            window.AppState.porcentajeDescuentoDolares = config.porcentajeDescuentoDolares;
            window.AppState.metodoRedondeoBs = config.metodoRedondeoBs;
            window.AppState.precioVentaLibre = Boolean(config.precioVentaLibre);
            window.AppState.nombreEmpresa = config.nombreEmpresa || '';
            window.AppState.rifEmpresa = config.rifEmpresa || '';
            window.AppState.direccionEmpresa = config.direccionEmpresa || '';
            window.AppState.telefonoEmpresa = config.telefonoEmpresa || '';
            window.AppState.correoEmpresa = config.correoEmpresa || '';

            window.tasaDolar = window.AppState.tasaDolar;
            window.tasaVuelto = window.AppState.tasaVuelto;
            window.porcentajeGananciaDefecto = window.AppState.porcentajeGananciaDefecto;
            window.porcentajeDescuentoDolares = window.AppState.porcentajeDescuentoDolares;
            window.metodoRedondeoBs = window.AppState.metodoRedondeoBs;
            window.precioVentaLibre = window.AppState.precioVentaLibre;
        }

        this.actualizarInfoTasaHeader();
        this.actualizarEmpresaDisplay();
    },

    actualizarInfoTasaHeader() {
        const info = document.getElementById('infoTasa');
        if (info) {
            info.innerHTML = `Venta: <strong>Bs ${window.tasaDolar.toFixed(2)}</strong> | Vuelto: <strong>Bs ${window.tasaVuelto.toFixed(2)}</strong> | G: <strong>${parseFloat(window.porcentajeGananciaDefecto).toFixed(4)}%</strong> | Bono: <strong>${window.porcentajeDescuentoDolares}%</strong>`;
        }
    },

    abrirModalConfiguracion() {
        if (window.usuarioLogueado?.rol === 'cajero') {
            window.mostrarNotificacion?.('🔒 Solo el administrador puede cambiar la configuracion');
            return;
        }

        document.getElementById('configTasaDolar').value = window.tasaDolar;
        document.getElementById('configTasaVueltoGeneral').value = window.tasaVuelto;
        document.getElementById('configPorcentajeDescuentoModal').value = window.porcentajeDescuentoDolares;
        document.getElementById('configPorcentajeGananciaDefecto').value = window.porcentajeGananciaDefecto;
        document.getElementById('configPrecioVentaLibre').checked = Boolean(window.AppState.precioVentaLibre);

        document.getElementById('configNombreEmpresa').value = window.AppState.nombreEmpresa || '';
        document.getElementById('configRifEmpresa').value = window.AppState.rifEmpresa || '';
        document.getElementById('configDireccionEmpresa').value = window.AppState.direccionEmpresa || '';
        document.getElementById('configTelefonoEmpresa').value = window.AppState.telefonoEmpresa || '';
        document.getElementById('configCorreoEmpresa').value = window.AppState.correoEmpresa || '';

        const modal = this.obtenerModalConfiguracion();
        if (modal) {
            modal.open().focusFirstField();
            return;
        }

        document.getElementById('modalConfiguracion').style.display = 'block';
    },

    cerrarModalConfiguracion() {
        const modal = this.obtenerModalConfiguracion();
        if (modal) {
            modal.close();
            return;
        }

        document.getElementById('modalConfiguracion').style.display = 'none';
    },

    async guardarConfiguracion() {
        const nuevaTasa = parseFloat(document.getElementById('configTasaDolar').value);
        const nuevaTasaVuelto = parseFloat(document.getElementById('configTasaVueltoGeneral').value);
        const nuevoDesc = parseFloat(document.getElementById('configPorcentajeDescuentoModal').value) || 0;
        const nuevaGanancia = parseFloat(document.getElementById('configPorcentajeGananciaDefecto').value);
        const nuevoPrecioVentaLibre = document.getElementById('configPrecioVentaLibre').checked;

        const nombreEmpresa = document.getElementById('configNombreEmpresa').value;
        const rifEmpresa = document.getElementById('configRifEmpresa').value;
        const direccionEmpresa = document.getElementById('configDireccionEmpresa').value;
        const telefonoEmpresa = document.getElementById('configTelefonoEmpresa').value;
        const correoEmpresa = document.getElementById('configCorreoEmpresa').value;

        const nuevaConfig = {
            tasaDolar: nuevaTasa,
            tasaVuelto: nuevaTasaVuelto,
            porcentajeGananciaDefecto: nuevaGanancia,
            porcentajeDescuentoDolares: Math.min(100, Math.max(0, nuevoDesc)),
            precioVentaLibre: nuevoPrecioVentaLibre,
            nombreEmpresa,
            rifEmpresa,
            direccionEmpresa,
            telefonoEmpresa,
            correoEmpresa
        };

        const guardado = await window.ApiService.guardarConfiguracion(nuevaConfig);
        if (!guardado) {
            window.mostrarNotificacion?.('⚠️ No se pudo guardar en el servidor');
            return;
        }

        window.tasaDolar = nuevaConfig.tasaDolar;
        window.tasaVuelto = nuevaConfig.tasaVuelto;
        window.porcentajeGananciaDefecto = nuevaConfig.porcentajeGananciaDefecto;
        window.porcentajeDescuentoDolares = nuevaConfig.porcentajeDescuentoDolares;
        window.metodoRedondeoBs = nuevaConfig.metodoRedondeoBs || 'none';
        window.precioVentaLibre = Boolean(nuevaConfig.precioVentaLibre);

        window.AppState.tasaDolar = nuevaConfig.tasaDolar;
        window.AppState.tasaVuelto = nuevaConfig.tasaVuelto;
        window.AppState.porcentajeGananciaDefecto = nuevaConfig.porcentajeGananciaDefecto;
        window.AppState.porcentajeDescuentoDolares = nuevaConfig.porcentajeDescuentoDolares;
        window.AppState.metodoRedondeoBs = window.metodoRedondeoBs;
        window.AppState.precioVentaLibre = window.precioVentaLibre;

        window.AppState.nombreEmpresa = nombreEmpresa;
        window.AppState.rifEmpresa = rifEmpresa;
        window.AppState.direccionEmpresa = direccionEmpresa;
        window.AppState.telefonoEmpresa = telefonoEmpresa;
        window.AppState.correoEmpresa = correoEmpresa;

        this.actualizarInfoTasaHeader();
        this.actualizarEmpresaDisplay();
        window.actualizarCarrito?.();
        window.actualizarListaPagos?.();
        window.mostrarProductos?.();

        this.cerrarModalConfiguracion();
        window.mostrarNotificacion?.('⚙️ Configuración actualizada');
    },

    actualizarEmpresaDisplay() {
        const nombre = window.AppState.nombreEmpresa || 'Mi Empresa';
        const rif = window.AppState.rifEmpresa || '';

        const nombreEl = document.getElementById('nombreEmpresaDisplay');
        const rifEl = document.getElementById('rifEmpresaDisplay');

        if (nombreEl) nombreEl.textContent = nombre;
        if (rifEl) rifEl.textContent = rif ? `RIF: ${rif}` : '';
    },

    puedeEditarPrecioVenta() {
        return Boolean(window.AppState.precioVentaLibre) && ['admin', 'cajero'].includes(window.usuarioLogueado?.rol);
    },

    async actualizarTasaBCV(event) {
        const btn = event?.currentTarget;
        if (!btn) return;
        const originalText = btn.innerHTML;

        try {
            btn.innerHTML = '⌛...';
            btn.disabled = true;

            let response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');

            if (!response.ok) {
                console.warn('API principal fallo, intentando respaldo en backend...');
                response = await fetch('http://localhost:5000/api/config/tasa-bcv');
            }

            if (!response.ok) throw new Error('Ambos servicios de tasa fallaron');

            const data = await response.json();
            const tasaOficial = parseFloat(data.promedio);

            if (tasaOficial > 0) {
                document.getElementById('configTasaDolar').value = tasaOficial.toFixed(2);
                window.mostrarNotificacion?.(`✅ Tasa BCV obtenida (${data.fuente || 'API'}): Bs ${tasaOficial.toFixed(2)}`);
            }
        } catch (error) {
            console.error('Error BCV:', error);
            window.mostrarNotificacion?.('❌ Error: No se pudo obtener la tasa oficial del BCV');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    actualizarFecha() {
        const fecha = new Date();
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('fechaActual').textContent = fecha.toLocaleDateString('es-ES', opciones);
    }
};

window.ConfigCore = ConfigCore;
