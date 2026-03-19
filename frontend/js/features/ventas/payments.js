const VentasPaymentsFeature = {
    mostrarNotificacionSegura(mensaje) {
        if (typeof window.mostrarNotificacion === 'function') {
            return window.mostrarNotificacion(mensaje);
        }
        console.warn(mensaje);
    },

    obtenerClienteSeleccionadoSeguro() {
        if (typeof window.obtenerClienteSeleccionado === 'function') {
            return window.obtenerClienteSeleccionado();
        }
        return window.ClientesFeature?.obtenerClienteSeleccionado?.() || null;
    },

    aplicarRedondeoBsSeguro(monto, metodo = 'none') {
        if (typeof window.aplicarRedondeoBs === 'function') {
            return window.aplicarRedondeoBs(monto, metodo);
        }
        return window.PricingUtils?.aplicarRedondeoBs?.(monto, metodo) ?? monto;
    },

    abrirModalTotalizacion() {
        if (!carrito.length) {
            this.mostrarNotificacionSegura('❌ El carrito está vacío');
            return;
        }

        const modal = document.getElementById('modalTotalizacionVenta');
        if (!modal) return;

        modal.style.display = 'block';
        this.actualizarListaPagos();
        setTimeout(() => this.enfocarCampoVentas('medioPago'), 60);
    },

    cerrarModalTotalizacion() {
        const modal = document.getElementById('modalTotalizacionVenta');
        if (!modal) return;
        modal.style.display = 'none';
    },

    abrirModalExcedenteTotalizacion(venta) {
        const modal = document.getElementById('modalExcedenteTotalizacion');
        const monto = document.getElementById('modalExcedenteTotalizacionMonto');
        if (!modal || !monto || !venta) return;

        monto.textContent = `$${venta.excedenteTotalUSD.toFixed(2)}`;
        modal.style.display = 'block';
    },

    cerrarModalExcedenteTotalizacion() {
        const modal = document.getElementById('modalExcedenteTotalizacion');
        if (!modal) return;
        modal.style.display = 'none';
    },

    volverATotalizacionDesdeExcedente() {
        this.cerrarModalExcedenteTotalizacion();
        if (ventaEnProgreso) {
            this.abrirModalTotalizacion();
        }
    },

    aceptarExcedenteComoSaldoFavor() {
        if (!ventaEnProgreso) return;

        ventaEnProgreso.saldo_a_favor_generado_usd = ventaEnProgreso.excedenteTotalUSD;
        ventaEnProgreso.excedenteUSD = 0;
        ventaEnProgreso.excedenteBS = 0;
        ventaEnProgreso.excedenteTotalUSD = 0;
        ventaEnProgreso.excedenteReconocido = 0;

        this.cerrarModalExcedenteTotalizacion();
        this.cerrarModalTotalizacion();
        if (typeof window.terminarProcesoVenta === 'function') {
            window.terminarProcesoVenta(ventaEnProgreso, '');
        } else {
            window.VentasCheckoutFeature?.terminarProcesoVenta?.(ventaEnProgreso, '');
        }
    },

    gestionarExcedenteComoVuelto() {
        if (!ventaEnProgreso) return;

        this.cerrarModalExcedenteTotalizacion();
        const monedaSugerida = document.getElementById('btnProcesarVenta').getAttribute('data-moneda-sugerida') || 'USD';
        if (typeof window.abrirModalGestionVuelto === 'function') {
            window.abrirModalGestionVuelto(ventaEnProgreso, monedaSugerida);
        } else {
            window.VentasCheckoutFeature?.abrirModalGestionVuelto?.(ventaEnProgreso, monedaSugerida);
        }
    },

    enfocarCampoVentas(idCampo, posicion = null) {
        const campo = document.getElementById(idCampo);
        if (!campo) return;
        campo.focus();

        if (typeof campo.select === 'function' && (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA')) {
            campo.select();
        }

        if (typeof posicion === 'number' && typeof campo.setSelectionRange === 'function') {
            campo.setSelectionRange(posicion, posicion);
        }
    },

    agregarPago() {
        const medioPago = document.getElementById('medioPago').value;
        const monto = parseFloat(document.getElementById('montoPago').value);

        if (!medioPago) {
            alert('❌ Seleccione un medio de pago');
            return;
        }

        if (isNaN(monto) || monto <= 0) {
            alert('❌ Ingrese un monto válido');
            return;
        }

        const esDolares = medioPago.includes('Dólares');

        const pago = {
            medio: medioPago,
            monto: monto,
            esDolares: esDolares,
            fecha: new Date().toLocaleTimeString()
        };

        pagos.push(pago);
        this.actualizarListaPagos();

        document.getElementById('medioPago').value = '';
        document.getElementById('montoPago').value = '';

        this.mostrarNotificacionSegura(`✅ Pago de ${esDolares ? '$' : 'Bs'} ${monto.toFixed(2)} agregado`);
    },

    obtenerSaldoFavorAplicadoVenta(totalVenta = 0) {
        const cliente = this.obtenerClienteSeleccionadoSeguro();
        const usarSaldo = document.getElementById('usarSaldoFavorVenta')?.checked;
        const input = document.getElementById('montoSaldoFavorVenta');
        const saldoCliente = parseFloat(cliente?.saldo_a_favor_usd || 0) || 0;
        const montoSolicitado = parseFloat(input?.value || '0') || 0;

        if (!usarSaldo || !cliente || saldoCliente <= 0) {
            return 0;
        }

        const montoAplicable = Math.max(0, Math.min(montoSolicitado, saldoCliente, totalVenta));
        if (input && Math.abs(montoAplicable - montoSolicitado) > 0.001) {
            input.value = montoAplicable.toFixed(2);
        }

        return montoAplicable;
    },

    actualizarListaPagos() {
        const listaPagos = document.getElementById('listaPagos');

        const totalVenta = carrito.reduce((sum, item) => sum + item.subtotal_dolares, 0);
        const totalVentaBs = carrito.reduce((sum, item) => {
            const prodOriginal = productos[item.productoIndex];
            const metodoRedondeo = item.lista_precio === 0 ? 'none' : (prodOriginal.metodo_redondeo || 'none');
            return sum + this.aplicarRedondeoBsSeguro(item.subtotal_dolares * tasaDolar, metodoRedondeo);
        }, 0);

        const tasaEfectiva = totalVenta > 0 ? (totalVentaBs / totalVenta) : tasaDolar;

        let deudaPendiente = totalVenta;
        let totalReconocidoDolares = 0;
        let descuentoAcumulado = 0;
        let ultimaMonedaCompletoDeuda = 'USD';
        const saldoFavorAplicado = this.obtenerSaldoFavorAplicadoVenta(totalVenta);

        const pagosOrdenados = [...pagos].sort((a, b) => (b.esDolares ? 1 : 0) - (a.esDolares ? 1 : 0));

        pagosOrdenados.forEach(pago => {
            let valorReconocido = 0;
            let descuentoEstePago = 0;

            const deudaAntesDeEstePago = deudaPendiente;

            if (pago.esDolares) {
                if (porcentajeDescuentoDolares > 0 && deudaPendiente > 0.01) {
                    const factor = 1 - (porcentajeDescuentoDolares / 100);
                    const valorPotencial = pago.monto / factor;

                    if (valorPotencial > deudaPendiente) {
                        const costoFisicoParaDeuda = deudaPendiente * factor;
                        const sobranteFisico = pago.monto - costoFisicoParaDeuda;

                        valorReconocido = deudaPendiente + sobranteFisico;
                        descuentoEstePago = deudaPendiente - costoFisicoParaDeuda;

                        deudaPendiente = 0;
                    } else {
                        valorReconocido = valorPotencial;
                        descuentoEstePago = valorReconocido - pago.monto;
                        deudaPendiente -= valorReconocido;
                    }
                } else {
                    valorReconocido = pago.monto;
                    descuentoEstePago = 0;
                    deudaPendiente = Math.max(0, deudaPendiente - valorReconocido);
                }
            } else {
                valorReconocido = pago.monto / tasaEfectiva;
                descuentoEstePago = 0;
                deudaPendiente = Math.max(0, deudaPendiente - valorReconocido);
            }

            pago.valorReconocido = valorReconocido;
            pago.descuentoAplicado = descuentoEstePago;

            if (deudaAntesDeEstePago > 0.01 && valorReconocido >= deudaAntesDeEstePago - 0.01) {
                ultimaMonedaCompletoDeuda = pago.esDolares ? 'USD' : 'BS';
            }

            totalReconocidoDolares += valorReconocido;
            descuentoAcumulado += descuentoEstePago;
        });

        descuentoTotal = descuentoAcumulado;

        totalReconocidoDolares += saldoFavorAplicado;

        const pendienteDolares = Math.max(0, totalVenta - totalReconocidoDolares);
        const pendienteBs = pendienteDolares * tasaEfectiva;
        const saldoFavorGenerado = Math.max(0, totalReconocidoDolares - totalVenta);

        if (pagos.length === 0) {
            listaPagos.innerHTML = '<div class="mensaje-vacio" style="text-align: center; padding: 15px;">No hay pagos registrados</div>';
        } else {
            listaPagos.innerHTML = pagos.map((pago, index) => {
                let detalleDescuento = '';
                if (pago.esDolares && pago.descuentoAplicado > 0.001) {
                    detalleDescuento = `<div style="font-size: 0.8em; color: #28a745;">
                        + Bono ${(porcentajeDescuentoDolares)}%: $${pago.descuentoAplicado.toFixed(2)}
                        <br>(Cubre: $${pago.valorReconocido.toFixed(2)})
                    </div>`;
                } else if (pago.esDolares && porcentajeDescuentoDolares > 0) {
                    detalleDescuento = `<div style="font-size: 0.8em; color: #666;">(Sin bono aplicable al excedente)</div>`;
                }

                return `
                <div class="pago-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; margin-bottom: 8px; border-radius: 8px; border-left: 4px solid ${pago.esDolares ? '#28a745' : '#007bff'};">
                    <div>
                        <strong>${pago.medio}</strong><br>
                        <small>${pago.fecha}</small>
                        ${detalleDescuento}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: bold; font-size: 1.1em;">
                            ${pago.esDolares ? '$' : 'Bs'} ${pago.monto.toFixed(2)}
                        </div>
                    </div>
                    <button class="btn-eliminar-item" onclick="eliminarPago(${index})" style="padding: 5px 10px; margin-left: 10px;">🗑️</button>
                </div>
                `;
            }).join('');
        }

        const elementoPendienteDolares = document.getElementById('pendienteDolares');
        if (elementoPendienteDolares) elementoPendienteDolares.textContent = `$${pendienteDolares.toFixed(2)}`;

        const elementoPendienteBs = document.getElementById('pendienteBs');
        if (elementoPendienteBs) elementoPendienteBs.textContent = `Bs ${pendienteBs.toFixed(2)}`;

        const totalPagadoDolaresDisplay = pagos.filter(p => p.esDolares).reduce((sum, p) => sum + p.monto, 0);
        const totalPagadoBsDisplay = pagos.filter(p => !p.esDolares).reduce((sum, p) => sum + p.monto, 0);

        const elPagadoUSD = document.getElementById('totalPagadoDolares');
        if (elPagadoUSD) elPagadoUSD.textContent = `$${totalPagadoDolaresDisplay.toFixed(2)}`;

        const elPagadoBS = document.getElementById('totalPagadoBs');
        if (elPagadoBS) elPagadoBS.textContent = `Bs ${totalPagadoBsDisplay.toFixed(2)}`;

        const containerAhorro = document.getElementById('containerAhorroRealTime');
        const containerTotalReal = document.getElementById('containerTotalAPagarRealTime');

        if (descuentoAcumulado > 0.001) {
            if (containerAhorro) containerAhorro.style.display = 'flex';
            if (containerTotalReal) containerTotalReal.style.display = 'flex';
            const elAhorro = document.getElementById('ahorroVentaRealTime');
            if (elAhorro) elAhorro.textContent = `-$${descuentoAcumulado.toFixed(2)}`;
            const elTotalReal = document.getElementById('totalAPagarRealTime');
            if (elTotalReal) elTotalReal.textContent = `$${(totalVenta - descuentoAcumulado).toFixed(2)}`;
        } else {
            if (containerAhorro) containerAhorro.style.display = 'none';
            if (containerTotalReal) containerTotalReal.style.display = 'none';
        }

        const btnProcesar = document.getElementById('btnProcesarVenta');
        const clienteSeleccionado = this.obtenerClienteSeleccionadoSeguro();
        if (pendienteDolares <= 0.01 || (pendienteDolares > 0.01 && clienteSeleccionado)) {
            btnProcesar.disabled = false;
            btnProcesar.classList.add('btn-success');
            btnProcesar.classList.remove('btn-disabled');
            btnProcesar.setAttribute('data-moneda-sugerida', ultimaMonedaCompletoDeuda);
        } else {
            btnProcesar.disabled = true;
            btnProcesar.classList.remove('btn-success');
            btnProcesar.classList.add('btn-disabled');
            btnProcesar.removeAttribute('data-moneda-sugerida');
        }

        const tipoVentaPreview = document.getElementById('tipoVentaPreview');
        if (tipoVentaPreview) tipoVentaPreview.textContent = pendienteDolares > 0.01 ? 'Credito' : 'Contado';

        const saldoPendientePreview = document.getElementById('saldoPendienteCreditoPreview');
        if (saldoPendientePreview) saldoPendientePreview.textContent = `$${pendienteDolares.toFixed(2)}`;

        const saldoFavorGeneradoPreview = document.getElementById('saldoFavorGeneradoPreview');
        if (saldoFavorGeneradoPreview) saldoFavorGeneradoPreview.textContent = `$${saldoFavorGenerado.toFixed(2)}`;

        const mostrarPanelesCliente = Boolean(this.obtenerClienteSeleccionadoSeguro());
        const panelSaldoFavor = document.getElementById('panelSaldoFavorCliente');
        const panelCredito = document.getElementById('panelCreditoCliente');
        if (panelSaldoFavor) panelSaldoFavor.style.display = mostrarPanelesCliente ? 'block' : 'none';
        if (panelCredito) panelCredito.style.display = mostrarPanelesCliente ? 'block' : 'none';
    },

    eliminarPago(index) {
        pagos.splice(index, 1);
        this.actualizarListaPagos();
    },

    actualizarResumenPagos(totalDolares, totalBs) {
        document.getElementById('totalVentaDolares').textContent = `$${totalDolares.toFixed(2)}`;
        document.getElementById('totalVentaBs').textContent = `Bs ${totalBs.toFixed(2)}`;
        this.actualizarListaPagos();
    }
};

window.VentasPaymentsFeature = VentasPaymentsFeature;
