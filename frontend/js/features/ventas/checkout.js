const VentasCheckoutFeature = {
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

    obtenerSaldoFavorAplicadoVentaSeguro(totalVenta = 0) {
        if (typeof window.obtenerSaldoFavorAplicadoVenta === 'function') {
            return window.obtenerSaldoFavorAplicadoVenta(totalVenta);
        }
        return window.VentasPaymentsFeature?.obtenerSaldoFavorAplicadoVenta?.(totalVenta) || 0;
    },

    aplicarRedondeoBsSeguro(monto, metodo = 'none') {
        if (typeof window.aplicarRedondeoBs === 'function') {
            return window.aplicarRedondeoBs(monto, metodo);
        }
        return window.PricingUtils?.aplicarRedondeoBs?.(monto, metodo) ?? monto;
    },

    procesarVenta() {
        if (carrito.length === 0) {
            this.mostrarNotificacionSegura('❌ El carrito está vacío');
            return;
        }

        const totalVenta = carrito.reduce((sum, item) => sum + item.subtotal_dolares, 0);
        const totalVentaBs = carrito.reduce((sum, item) => {
            if (item.precio_bs_manual != null) {
                return sum + item.precio_bs_manual * item.cantidad;
            }
            const prodOriginal = productos[item.productoIndex];
            const metodoRedondeo = item.lista_precio === 0 ? 'none' : (prodOriginal.metodo_redondeo || 'none');
            return sum + this.aplicarRedondeoBsSeguro(item.subtotal_dolares * tasaDolar, metodoRedondeo);
        }, 0);

        const tasaEfectiva = totalVenta > 0 ? (totalVentaBs / totalVenta) : tasaDolar;

        if (pagos.length === 0 && totalVenta > 0 && !this.obtenerClienteSeleccionadoSeguro()) {
            this.mostrarNotificacionSegura('❌ Debe agregar al menos un pago o seleccionar un cliente para credito');
            return;
        }

        let deudaPendiente = totalVenta;
        let totalPagadoRealDolares = 0;
        let totalPagadoRealBs = 0;
        let totalReconocidoDolares = 0;
        let descuentoTotalGenerado = 0;
        let excedenteUSD = 0;
        let excedenteBS = 0;
        const clienteSeleccionado = this.obtenerClienteSeleccionadoSeguro();
        const saldoFavorAplicado = this.obtenerSaldoFavorAplicadoVentaSeguro(totalVenta);

        const pagosOrdenados = [...pagos].sort((a, b) => (b.esDolares ? 1 : 0) - (a.esDolares ? 1 : 0));

        const pagosProcesados = pagosOrdenados.map(p => {
            let valorReconocido = 0;
            let descuentoPago = 0;

            if (p.esDolares) {
                totalPagadoRealDolares += p.monto;

                if (porcentajeDescuentoDolares > 0 && deudaPendiente > 0.01) {
                    const factor = 1 - (porcentajeDescuentoDolares / 100);
                    const valorPotencial = p.monto / factor;

                    if (valorPotencial > deudaPendiente) {
                        const costoFisicoParaDeuda = deudaPendiente * factor;
                        const sobranteFisico = p.monto - costoFisicoParaDeuda;

                        valorReconocido = deudaPendiente + sobranteFisico;
                        descuentoPago = deudaPendiente - costoFisicoParaDeuda;
                        excedenteUSD += sobranteFisico;
                        deudaPendiente = 0;
                    } else {
                        valorReconocido = valorPotencial;
                        descuentoPago = valorReconocido - p.monto;
                        deudaPendiente -= valorReconocido;
                    }
                } else {
                    if (p.monto > deudaPendiente + 0.001) {
                        const sobrante = p.monto - deudaPendiente;
                        excedenteUSD += sobrante;
                        valorReconocido = p.monto;
                        deudaPendiente = 0;
                    } else {
                        valorReconocido = p.monto;
                        deudaPendiente = Math.max(0, deudaPendiente - valorReconocido);
                    }
                    descuentoPago = 0;
                }
            } else {
                totalPagadoRealBs += p.monto;
                const deudaBS = deudaPendiente * tasaEfectiva;

                if (p.monto > deudaBS + 0.01) {
                    const sobranteBS = p.monto - deudaBS;
                    excedenteBS += sobranteBS;
                    valorReconocido = deudaPendiente + (sobranteBS / tasaEfectiva);
                    deudaPendiente = 0;
                } else {
                    valorReconocido = p.monto / tasaEfectiva;
                    deudaPendiente = Math.max(0, deudaPendiente - valorReconocido);
                }
                descuentoPago = 0;
            }

            totalReconocidoDolares += valorReconocido;
            descuentoTotalGenerado += descuentoPago;

            return {
                medio: p.medio,
                monto: p.monto,
                moneda: p.esDolares ? 'USD' : 'BS',
                esDolares: p.esDolares,
                valor_reconocido: valorReconocido,
                descuento_aplicado: descuentoPago
            };
        });

        totalReconocidoDolares += saldoFavorAplicado;

        const saldoPendienteUsd = Math.max(0, totalVenta - totalReconocidoDolares);
        if (saldoPendienteUsd > 0.05 && !clienteSeleccionado) {
            this.mostrarNotificacionSegura('❌ Debe seleccionar un cliente para registrar credito');
            return;
        }

        const excedenteTotalUSD = Math.max(0, totalReconocidoDolares - totalVenta);

        ventaEnProgreso = {
            fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            cliente_id: clienteSeleccionado ? clienteSeleccionado.id : null,
            cliente: clienteSeleccionado ? clienteSeleccionado.nombre : 'Cliente General',
            productos: carrito.map(item => ({
                producto_id: item.producto_id,
                nombre: item.nombre,
                cantidad: item.cantidad,
                lista_precio: item.lista_precio || 1,
                precio_unitario_dolares: item.precio_dolares,
                subtotal_dolares: item.subtotal_dolares
            })),
            descuento_dolares: descuentoTotalGenerado,
            porcentaje_descuento_usd: porcentajeDescuentoDolares,
            total_dolares: totalVenta,
            total_bolivares: totalVentaBs,
            pagos: pagosProcesados,
            total_pagado_real_dolares: totalPagadoRealDolares,
            total_pagado_real_bs: totalPagadoRealBs,
            saldo_a_favor_aplicado_usd: saldoFavorAplicado,
            saldo_pendiente_usd: saldoPendienteUsd,
            tipo_venta: saldoPendienteUsd > 0.01 ? 'credito' : 'contado',
            excedenteUSD: excedenteUSD,
            excedenteBS: excedenteBS,
            excedenteTotalUSD: excedenteTotalUSD,
            excedenteReconocido: excedenteTotalUSD,
            saldo_a_favor_generado_usd: 0
        };

        if (excedenteTotalUSD > 0.01) {
            cerrarModalTotalizacion();
            if (clienteSeleccionado) {
                if (typeof window.abrirModalExcedenteTotalizacion === 'function') {
                    window.abrirModalExcedenteTotalizacion(ventaEnProgreso);
                } else {
                    window.VentasPaymentsFeature?.abrirModalExcedenteTotalizacion?.(ventaEnProgreso);
                }
            } else {
                const monedaSugerida = document.getElementById('btnProcesarVenta').getAttribute('data-moneda-sugerida') || 'USD';
                this.abrirModalGestionVuelto(ventaEnProgreso, monedaSugerida);
            }
        } else {
            this.terminarProcesoVenta(ventaEnProgreso, '');
        }
    },

    abrirModalGestionVuelto(venta, monedaSugerida = 'USD') {
        vueltosAgregados = [];

        document.getElementById('montoExcedenteVuelto').textContent = `$${venta.excedenteUSD.toFixed(2)}`;
        document.getElementById('montoExcedenteVueltoBs').textContent = `Bs ${venta.excedenteBS.toFixed(2)}`;

        document.getElementById('tasaVuelto').value = tasaVuelto;
        document.getElementById('montoEntregaVuelto').value = '';

        const radios = document.getElementsByName('monedaVuelto');
        if (monedaSugerida === 'BS') {
            radios[1].checked = true;
            this.actualizarMetodosVuelto('BS');
        } else {
            radios[0].checked = true;
            this.actualizarMetodosVuelto('USD');
        }

        this.actualizarUIGestionVuelto();
        this.sugerirMontoVuelto();
        document.getElementById('modalGestionVuelto').style.display = 'block';
        setTimeout(() => window.enfocarCampoVentas?.('montoEntregaVuelto'), 60);
    },

    volverATotalizacionDesdeGestionVuelto() {
        const modal = document.getElementById('modalGestionVuelto');
        if (modal) {
            modal.style.display = 'none';
        }

        if (ventaEnProgreso) {
            window.abrirModalTotalizacion?.();
        }
    },

    sugerirMontoVuelto() {
        if (!ventaEnProgreso) return;

        const totalEntregadoUSD = vueltosAgregados.reduce((sum, v) => sum + v.valorEnDolares, 0);
        const faltanteTotalUSD = Math.max(0, ventaEnProgreso.excedenteTotalUSD - totalEntregadoUSD);

        if (faltanteTotalUSD <= 0.001) {
            document.getElementById('montoEntregaVuelto').value = '';
            return;
        }

        const moneda = document.querySelector('input[name="monedaVuelto"]:checked').value;
        const tasa = parseFloat(document.getElementById('tasaVuelto').value) || tasaVuelto;

        if (vueltosAgregados.length === 0) {
            if (moneda === 'BS' && ventaEnProgreso.excedenteBS > 0.01) {
                document.getElementById('montoEntregaVuelto').value = ventaEnProgreso.excedenteBS.toFixed(2);
            } else if (moneda === 'USD' && ventaEnProgreso.excedenteUSD > 0.01) {
                document.getElementById('montoEntregaVuelto').value = ventaEnProgreso.excedenteUSD.toFixed(2);
            } else {
                const sugerencia = (moneda === 'USD') ? faltanteTotalUSD : (faltanteTotalUSD * tasa);
                document.getElementById('montoEntregaVuelto').value = sugerencia.toFixed(2);
            }
        } else {
            const sugerencia = (moneda === 'USD') ? faltanteTotalUSD : (faltanteTotalUSD * tasa);
            document.getElementById('montoEntregaVuelto').value = sugerencia.toFixed(2);
        }

        this.actualizarUIGestionVuelto();
    },

    actualizarMetodosVuelto(moneda) {
        const select = document.getElementById('metodoEntregaVuelto');
        const containerTasa = document.getElementById('containerTasaVuelto');
        select.innerHTML = '';

        if (moneda === 'USD') {
            select.innerHTML = '<option value="Efectivo">Efectivo 💵</option>';
            containerTasa.style.display = 'none';
        } else {
            select.innerHTML = `
                <option value="Efectivo">Efectivo 💶</option>
                <option value="Transferencia">Transferencia 🏦</option>
                <option value="Pago Móvil">Pago Móvil 📱</option>
            `;
            containerTasa.style.display = 'block';
        }
        this.sugerirMontoVuelto();
    },

    actualizarConversionesVuelto() {
        const moneda = document.querySelector('input[name="monedaVuelto"]:checked').value;
        if (moneda === 'BS') {
            this.sugerirMontoVuelto();
        } else {
            this.actualizarUIGestionVuelto();
        }
    },

    agregarVueltoALista() {
        const moneda = document.querySelector('input[name="monedaVuelto"]:checked').value;
        const metodo = document.getElementById('metodoEntregaVuelto').value;
        const monto = parseFloat(document.getElementById('montoEntregaVuelto').value);
        const tasa = parseFloat(document.getElementById('tasaVuelto').value) || tasaVuelto;

        if (isNaN(monto) || monto <= 0) {
            this.mostrarNotificacionSegura('❌ Ingrese un monto válido');
            return;
        }

        let valorEnDolares = 0;
        if (moneda === 'USD') {
            valorEnDolares = monto;
        } else {
            if (tasa <= 0) {
                this.mostrarNotificacionSegura('❌ Ingrese una tasa válida');
                return;
            }
            valorEnDolares = monto / tasa;
        }

        const excedenteTotal = ventaEnProgreso.excedenteReconocido;
        const yaEntregado = vueltosAgregados.reduce((sum, v) => sum + v.valorEnDolares, 0);
        const faltante = excedenteTotal - yaEntregado;

        if (valorEnDolares > (faltante + 0.01)) {
            if (!confirm(`El monto ingresado ($${valorEnDolares.toFixed(2)}) es mayor al faltante ($${faltante.toFixed(2)}). ¿Desea agregarlo de todas formas?`)) {
                return;
            }
        }

        vueltosAgregados.push({
            moneda: moneda,
            metodo: metodo,
            monto: monto,
            tasa: moneda === 'BS' ? tasa : null,
            valorEnDolares: valorEnDolares
        });

        document.getElementById('montoEntregaVuelto').value = '';
        this.actualizarUIGestionVuelto();
        this.sugerirMontoVuelto();
    },

    eliminarVueltoDeLista(index) {
        vueltosAgregados.splice(index, 1);
        this.actualizarUIGestionVuelto();
    },

    actualizarUIGestionVuelto() {
        const excUSD = ventaEnProgreso.excedenteUSD;
        const excBS = ventaEnProgreso.excedenteBS;
        const tasaActual = parseFloat(document.getElementById('tasaVuelto').value) || tasaVuelto;

        const totalTargetUSD = excUSD + (excBS / tasaActual);

        const totalEntregadoUSD = vueltosAgregados.reduce((sum, v) => sum + v.valorEnDolares, 0);
        const faltanteUSD = Math.max(0, totalTargetUSD - totalEntregadoUSD);

        document.getElementById('montoEntregadoVuelto').textContent = `$${totalEntregadoUSD.toFixed(2)}`;
        document.getElementById('montoEntregadoVueltoBs').textContent = `Bs ${(totalEntregadoUSD * tasaActual).toFixed(2)}`;
        document.getElementById('montoFaltanteVuelto').textContent = `$${faltanteUSD.toFixed(2)}`;
        document.getElementById('montoFaltanteVueltoBs').textContent = `Bs ${(faltanteUSD * tasaActual).toFixed(2)}`;

        const monedaActual = document.querySelector('input[name="monedaVuelto"]:checked').value;
        const montoActual = parseFloat(document.getElementById('montoEntregaVuelto').value) || 0;
        const previewDiv = document.getElementById('previewConversionVuelto');
        const previewSpan = document.getElementById('valorequivaleUSD');

        if (montoActual > 0 && monedaActual === 'BS') {
            previewDiv.style.display = 'block';
            previewSpan.textContent = `$${(montoActual / tasaActual).toFixed(2)}`;
        } else {
            previewDiv.style.display = 'none';
        }

        const lista = document.getElementById('listaVueltosAgregados');
        if (vueltosAgregados.length === 0) {
            lista.innerHTML = '<div style="text-align: center; color: #999; padding: 10px; font-size: 0.85em;">No se han agregado entregas</div>';
        } else {
            lista.innerHTML = vueltosAgregados.map((v, i) => `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: 5px; font-size: 0.85em;">
                    <div>
                        <strong>${v.moneda} ${v.monto.toFixed(2)}</strong> (${v.metodo})
                        ${v.tasa ? `<br><small style="color: #666;">Tasa: ${v.tasa}</small>` : ''}
                    </div>
                    <button onclick="eliminarVueltoDeLista(${i})" style="border: none; background: none; cursor: pointer; color: #dc3545; padding: 5px;">🗑️</button>
                </div>
            `).join('');
        }
    },

    async finalizarVentaSinVuelto() {
        const excedentePendiente = ventaEnProgreso?.excedenteTotalUSD || 0;
        if (!ventaEnProgreso?.cliente_id && excedentePendiente > 0.01) {
            this.mostrarNotificacionSegura('❌ Cliente General / Contado requiere registrar todo el vuelto antes de finalizar');
            return;
        }

        const confirmarModal = window.Utils?.confirmarModal?.bind(window.Utils)
            || ((mensaje) => Promise.resolve(confirm(mensaje)));
        const confirmado = await confirmarModal(
            '¿Está seguro de finalizar la venta sin entregar el vuelto excedente?',
            {
                titulo: 'Finalizar sin entregar vuelto',
                detalle: excedentePendiente > 0.01
                    ? `Quedara un excedente pendiente de $${excedentePendiente.toFixed(2)}.${ventaEnProgreso?.cliente_id ? ' Se registrara como saldo a favor del cliente.' : ''}`
                    : '',
                confirmarTexto: 'Finalizar venta',
                cancelarTexto: 'Seguir revisando',
                variante: 'warning'
            }
        );

        if (!confirmado) return;

        if (ventaEnProgreso?.cliente_id && ventaEnProgreso?.excedenteTotalUSD > 0.01) {
            ventaEnProgreso.saldo_a_favor_generado_usd = ventaEnProgreso.excedenteTotalUSD;
            ventaEnProgreso.excedenteTotalUSD = 0;
            ventaEnProgreso.excedenteReconocido = 0;
            ventaEnProgreso.excedenteUSD = 0;
            ventaEnProgreso.excedenteBS = 0;
        }

        document.getElementById('modalGestionVuelto').style.display = 'none';
        this.terminarProcesoVenta(ventaEnProgreso, 'Venta finalizada sin vuelto entregado');
    },

    async confirmarVuelto() {
        const totalExcedente = ventaEnProgreso.excedenteReconocido;
        const confirmarModal = window.Utils?.confirmarModal?.bind(window.Utils)
            || ((mensaje) => Promise.resolve(confirm(mensaje)));
        const totalEntregado = vueltosAgregados.reduce((sum, v) => sum + v.valorEnDolares, 0);
        const faltanteVuelto = Math.max(0, totalExcedente - totalEntregado);

        if (!ventaEnProgreso?.cliente_id && faltanteVuelto > 0.01) {
            this.mostrarNotificacionSegura(`❌ Debe entregar el vuelto completo de Cliente General / Contado. Falta $${faltanteVuelto.toFixed(2)}`);
            return;
        }

        if (vueltosAgregados.length === 0 && totalExcedente > 0.01) {
            const confirmado = await confirmarModal(
                'No ha registrado ninguna entrega de vuelto. ¿Desea finalizar la venta de todas formas?',
                {
                    titulo: 'Vuelto sin registrar',
                    detalle: `Aun queda pendiente un vuelto de $${totalExcedente.toFixed(2)} en esta venta.`,
                    confirmarTexto: 'Finalizar de todas formas',
                    cancelarTexto: 'Volver',
                    variante: 'warning'
                }
            );

            if (!confirmado) {
                return;
            }
        }

        vueltosAgregados.forEach(v => {
            ventaEnProgreso.pagos.push({
                medio: `Vuelto (${v.metodo})`,
                monto: -v.monto,
                moneda: v.moneda,
                esDolares: v.moneda === 'USD',
                valor_reconocido: -v.valorEnDolares,
                descuento_aplicado: 0
            });

            if (v.moneda === 'USD') {
                ventaEnProgreso.total_pagado_real_dolares -= v.monto;
            } else {
                ventaEnProgreso.total_pagado_real_bs -= v.monto;
            }
        });

        let mensaje = '';
        if (vueltosAgregados.length > 0) {
            mensaje = 'Vuelto entregado en: ' + vueltosAgregados.map(v => `${v.moneda} ${v.monto.toFixed(2)}`).join(', ');
        }

        document.getElementById('modalGestionVuelto').style.display = 'none';
        this.terminarProcesoVenta(ventaEnProgreso, mensaje);
    },

    async terminarProcesoVenta(venta, mensajeVuelto) {
        try {
            const payload = {
                ...venta,
                vueltos_entregados: vueltosAgregados
            };
            const apiBase = (typeof API !== 'undefined' && API?.baseUrl) ? API.baseUrl : 'http://localhost:5000/api';
            const authHeaders = (typeof API !== 'undefined' && typeof API.getAuthHeaders === 'function') ? API.getAuthHeaders() : {};
            const res = await fetch(`${apiBase}/ventas/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const ventaGuardada = await res.json();
                cerrarModalExcedenteTotalizacion();
                cerrarModalTotalizacion();
                document.getElementById('modalGestionVuelto').style.display = 'none';
                this.mostrarNotificacionSegura('✅ Venta guardada en servidor');
                await window.cargarProductos?.();
                await window.cargarDatosVentas?.();
                await window.cargarClientes?.();
                await window.cargarCuentasPorCobrar?.();
                ultimaVentaProcesada = {
                    ...venta,
                    productos: (venta.productos || []).map(item => ({ ...item, lista_precio: item.lista_precio || 1 })),
                    id: ventaGuardada.id,
                    numero_venta: ventaGuardada.numero_venta,
                    tipo_venta: ventaGuardada.tipo_venta || venta.tipo_venta,
                    saldo_pendiente_usd: ventaGuardada.saldo_pendiente_usd ?? venta.saldo_pendiente_usd,
                    saldo_a_favor_generado_usd: ventaGuardada.saldo_a_favor_generado_usd ?? venta.saldo_a_favor_generado_usd,
                    vueltos_entregados: vueltosAgregados
                };
                ultimoNumeroVenta = ventaGuardada.numero_venta || ventas[0]?.numero_venta || ventaGuardada.id;
            } else {
                this.mostrarNotificacionSegura('⚠️ No se pudo guardar la venta en el servidor');
                return;
            }
        } catch (e) {
            this.mostrarNotificacionSegura('⚠️ No se pudo guardar la venta en el servidor');
            return;
        }

        const infoVuelto = document.getElementById('vueltoInfo');
        if (infoVuelto) {
            let contenido = `
                <div style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 5px solid #28a745; margin-bottom: 20px; font-size: 0.95em;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Total Lista:</span>
                        <strong>$${venta.total_dolares.toFixed(2)}</strong>
                    </div>
                    ${venta.descuento_dolares > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #28a745;">
                        <span>Ahorro aplicado:</span>
                        <strong>-$${venta.descuento_dolares.toFixed(2)}</strong>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; border-top: 1px solid #ddd; padding-top: 5px;">
                        <span>Pagado USD:</span>
                        <strong>$${venta.total_pagado_real_dolares.toFixed(2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Pagado Bs:</span>
                        <strong>Bs ${venta.total_pagado_real_bs.toFixed(2)}</strong>
                    </div>
                    ${mensajeVuelto ? `
                    <div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; border: 1px solid #ffeeba;">
                        ${mensajeVuelto}
                    </div>
                    ` : ''}
                </div>
            `;
            infoVuelto.innerHTML = contenido;
            document.getElementById('modalVuelto').style.display = 'block';
            window.VentasPostventaFeature?.enfocarAccionPrincipalVentaProcesada?.();
        }

        this.reiniciarVenta();
        window.mostrarVentas?.();
        ventaEnProgreso = null;
    },

    reiniciarVenta() {
        carrito = [];
        pagos = [];
        descuentoTotal = 0;
        indiceSeleccionado = -1;
        indiceCarritoSeleccionado = -1;

        const elCliente = document.getElementById('cliente');
        if (elCliente) elCliente.value = 'Cliente General / Contado';
        const elClienteId = document.getElementById('clienteId');
        if (elClienteId) elClienteId.value = '';
        const elUsarSaldo = document.getElementById('usarSaldoFavorVenta');
        if (elUsarSaldo) elUsarSaldo.checked = false;
        const elMontoSaldo = document.getElementById('montoSaldoFavorVenta');
        if (elMontoSaldo) elMontoSaldo.value = '0';

        const elBusqueda = document.getElementById('buscarProducto');
        if (elBusqueda) elBusqueda.value = '';

        const elSugerencias = document.getElementById('sugerenciasProductos');
        if (elSugerencias) {
            elSugerencias.innerHTML = '';
            elSugerencias.style.display = 'none';
        }

        const elMontoPago = document.getElementById('montoPago');
        if (elMontoPago) elMontoPago.value = '';

        const elMedioPago = document.getElementById('medioPago');
        if (elMedioPago) elMedioPago.selectedIndex = 0;

        const elAhorro = document.getElementById('ahorroVentaRealTime');
        if (elAhorro) elAhorro.textContent = '-$0.00';

        const elTotalReal = document.getElementById('totalAPagarRealTime');
        if (elTotalReal) elTotalReal.textContent = '$0.00';

        const elVueltoBs = document.getElementById('montoCalculadoBs');
        if (elVueltoBs) elVueltoBs.textContent = 'Bs 0.00';

        window.actualizarInfoClienteSeleccionado?.();
        window.actualizarCarrito?.();
        window.actualizarListaPagos?.();

        if (typeof window.mostrarVentas === 'function') window.mostrarVentas();

        if (elBusqueda) elBusqueda.focus();
    }
};

window.VentasCheckoutFeature = VentasCheckoutFeature;
