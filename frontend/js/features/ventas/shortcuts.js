const VentasShortcutsFeature = {
    esPanelVentasActivo() {
        return document.getElementById('panelVentas')?.classList.contains('active');
    },

    esCampoEditable(elemento) {
        if (!elemento) return false;
        const tag = (elemento.tagName || '').toLowerCase();
        return elemento.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    },

    obtenerModalAbierto() {
        return Array.from(document.querySelectorAll('.modal')).reverse().find(modal => window.getComputedStyle(modal).display !== 'none') || null;
    },

    togglePanelAtajosVentas(forzarEstado) {
        const panel = document.getElementById('panelAtajosVentas');
        if (!panel) return;

        const visible = window.getComputedStyle(panel).display !== 'none';
        const mostrar = typeof forzarEstado === 'boolean' ? forzarEstado : !visible;
        panel.style.display = mostrar ? 'block' : 'none';
    },

    cerrarOverlayVentasActual() {
        const modalAbierto = this.obtenerModalAbierto();
        if (modalAbierto) {
            const cierres = {
                modalProducto: () => cerrarModalProducto(),
                modalGaleriaProducto: () => ProductoGaleria.cerrar(),
                modalCliente: () => cerrarModalCliente(),
                modalEstadoCuentaCliente: () => cerrarModalEstadoCuentaCliente(),
                modalAbonoCuenta: () => cerrarModalAbonoCuenta(),
                modalBuscarClienteCxc: () => cerrarModalBuscarClienteCxc(),
                modalVuelto: () => cerrarModalVuelto(),
                modalTotalizacionVenta: () => cerrarModalTotalizacion(),
                modalExcedenteTotalizacion: () => cerrarModalExcedenteTotalizacion(),
                modalConfiguracion: () => cerrarModalConfiguracion(),
                modalGestionVuelto: () => {
                    modalAbierto.style.display = 'none';
                },
                modalDevolucion: () => cerrarModalDevolucion(),
                modalSelectorPrecioCarrito: () => cerrarSelectorPrecioCarrito()
            };

            const cerrar = cierres[modalAbierto.id];
            if (cerrar) {
                cerrar();
                return true;
            }
        }

        const sugerencias = document.getElementById('sugerenciasProductos');
        if (sugerencias && window.getComputedStyle(sugerencias).display !== 'none') {
            sugerencias.style.display = 'none';
            indiceSeleccionado = -1;
            return true;
        }

        const panelAtajos = document.getElementById('panelAtajosVentas');
        if (panelAtajos && window.getComputedStyle(panelAtajos).display !== 'none') {
            this.togglePanelAtajosVentas(false);
            return true;
        }

        return false;
    },

    manejarAtajosVentas(event) {
        if (!this.esPanelVentasActivo()) return;

        const tecla = event.key;
        const activo = document.activeElement;
        const modalAbierto = this.obtenerModalAbierto();
        const editable = this.esCampoEditable(activo);
        const focoEnBusqueda = activo?.id === 'buscarProducto';
        const focoEnPago = activo?.id === 'medioPago' || activo?.id === 'montoPago';

        if (tecla === 'Escape') {
            event.preventDefault();
            this.cerrarOverlayVentasActual();
            return;
        }

        if (tecla === 'F1') {
            event.preventDefault();
            this.togglePanelAtajosVentas();
            return;
        }

        if (modalAbierto) return;

        if (tecla === 'F2') {
            event.preventDefault();
            enfocarCampoVentas('buscarProducto');
            return;
        }

        if (tecla === 'F3') {
            event.preventDefault();
            enfocarCampoVentas('cliente');
            return;
        }

        if (tecla === 'F4') {
            event.preventDefault();
            enfocarCampoVentas('medioPago');
            return;
        }

        if (tecla === 'F8') {
            event.preventDefault();
            enfocarCampoVentas('montoPago');
            return;
        }

        if (tecla === 'F9') {
            event.preventDefault();
            agregarPago();
            return;
        }

        if (tecla === 'F10' || (event.ctrlKey && tecla === 'Enter')) {
            event.preventDefault();
            abrirModalTotalizacion();
            return;
        }

        if ((tecla === 'Enter' || tecla === 'NumpadEnter') && focoEnPago) {
            event.preventDefault();
            agregarPago();
            return;
        }

        if (focoEnBusqueda || editable) return;

        if (event.ctrlKey && tecla === 'Delete') {
            event.preventDefault();
            limpiarCarrito();
            return;
        }

        if (tecla === 'ArrowDown') {
            event.preventDefault();
            moverSeleccionCarrito(1);
            return;
        }

        if (tecla === 'ArrowUp') {
            event.preventDefault();
            moverSeleccionCarrito(-1);
            return;
        }

        if (tecla === 'Delete') {
            if (indiceCarritoSeleccionado >= 0 && carrito[indiceCarritoSeleccionado]) {
                event.preventDefault();
                eliminarDelCarrito(indiceCarritoSeleccionado);
            }
            return;
        }

        if (tecla === '+' || tecla === '=' || tecla === 'Add') {
            event.preventDefault();
            ajustarCantidadItemSeleccionado(1);
            return;
        }

        if (tecla === '-' || tecla === 'Subtract') {
            event.preventDefault();
            ajustarCantidadItemSeleccionado(-1);
        }
    }
};

window.VentasShortcutsFeature = VentasShortcutsFeature;
