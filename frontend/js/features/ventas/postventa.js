const VentasPostventaFeature = {
    _modalDevolucion: null,

    cerrarModalVuelto() {
        document.getElementById('modalVuelto').style.display = 'none';
        const info = document.getElementById('vueltoInfo');
        if (info) info.innerHTML = '';

        if (ultimaVentaProcesada) {
            this.verReciboCompleto(ultimaVentaProcesada, ultimoNumeroVenta);
            ultimaVentaProcesada = null;
        }
    },

    enfocarAccionPrincipalVentaProcesada() {
        const boton = document.querySelector('#modalVuelto .btn-primary');
        boton?.focus();
    },

    obtenerVentaPorId(ventaId) {
        return ventas.find(v => v.id === ventaId);
    },

    obtenerModalDevolucion() {
        if (this._modalDevolucion) return this._modalDevolucion;
        if (!window.SVModal?.enhance) return null;

        this._modalDevolucion = window.SVModal.enhance('modalDevolucion');
        return this._modalDevolucion;
    },

    escaparAtributoHtml(valor) {
        return String(valor || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    obtenerResumenDevolucionVenta(venta) {
        const devoluciones = venta.devoluciones || [];
        if (devoluciones.length === 0) return '';

        return `
            <div style="margin-top: 6px; padding: 6px 8px; background: #fff4e8; border: 1px solid #ffd8a8; border-radius: 6px; color: #9a3412; font-size: 0.82em;">
                ↩️ ${devoluciones.length} devolución(es) | Reintegrado: $${(venta.total_devuelto_dolares || 0).toFixed(2)}
            </div>
        `;
    },

    renderProductosVentaInforme(venta) {
        return (venta.productos || []).map(p => {
            const devuelto = p.cantidad_devuelta || 0;
            const disponible = p.cantidad_disponible_devolucion || 0;
            return `
                <div style="margin-bottom: 6px;">
                    <div>${p.cantidad}x ${p.nombre}</div>
                    ${devuelto > 0 ? `<small style="color: #b45309;">Devuelto: ${devuelto} | Disponible para devolución: ${disponible}</small>` : ''}
                </div>
            `;
        }).join('') || 'Sin productos';
    },

    renderAccionesVentaInforme(venta, numeroVenta) {
        const tieneDisponible = (venta.productos || []).some(p => (p.cantidad_disponible_devolucion || 0) > 0);
        return `
            <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                <button onclick='verDetallesPago(${JSON.stringify(venta)}, ${numeroVenta})' class="btn-small" style="padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">
                    💳 Ver Pagos
                </button>
                <button onclick='verReciboCompleto(${JSON.stringify(venta)}, ${numeroVenta})' class="btn-small" style="padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">
                    🧾 Ver Recibo
                </button>
                <button onclick="abrirModalDevolucion(${venta.id})" class="btn-small" ${tieneDisponible ? '' : 'disabled'} style="padding: 5px 10px; background: ${tieneDisponible ? '#f59e0b' : '#cbd5e1'}; color: white; border: none; border-radius: 5px; cursor: ${tieneDisponible ? 'pointer' : 'not-allowed'}; font-size: 0.85em;">
                    ↩️ Devolución
                </button>
            </div>
        `;
    },

    mostrarHistorialVentas() {
        const historialDiv = document.getElementById('historialVentas');
        const totalVentasDolares = ventas.reduce((sum, v) => sum + (v.total_dolares || 0), 0);
        const totalVentasBs = ventas.reduce((sum, v) => sum + (v.total_bolivares || 0), 0);

        if (ventas.length === 0) {
            historialDiv.innerHTML = '<div class="mensaje-vacio">No hay ventas registradas</div>';
            return;
        }

        historialDiv.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="margin-bottom: 10px;">Resumen General</h3>
                <div style="display: flex; gap: 15px;">
                    <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; flex: 1;">
                        <small>Total Ventas</small><br>
                        <strong style="font-size: 1.2em;">$${totalVentasDolares.toFixed(2)}</strong><br>
                        <small>Bs ${totalVentasBs.toFixed(2)}</small>
                    </div>
                    <div style="background: #fff3e0; padding: 15px; border-radius: 8px; flex: 1;">
                        <small>Promedio Venta</small><br>
                        <strong style="font-size: 1.2em;">$${(totalVentasDolares / ventas.length).toFixed(2)}</strong><br>
                        <small>Bs ${(totalVentasBs / ventas.length).toFixed(2)}</small>
                    </div>
                </div>
            </div>
            
            <h3 style="margin-bottom: 10px;">Detalle de Ventas</h3>
            ${ventas.map((venta, index) => `
                <div class="venta-item" style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #28a745;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div>
                            <strong>Venta #${venta.numero_venta || venta.id || (index + 1)}</strong><br>
                            <small>${venta.fecha}</small>
                        </div>
                        <div style="text-align: right;">
                            <strong style="font-size: 1.1em;">$${venta.total_dolares.toFixed(2)}</strong><br>
                            <small>Bs ${venta.total_bolivares.toFixed(2)}</small>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <small><strong>Cliente:</strong> ${venta.cliente}</small>
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <small><strong>Productos:</strong></small><br>
                        ${(venta.productos || []).map(p => `
                            <div style="margin-left: 15px; font-size: 0.9em;">
                                ${p.cantidad} x ${p.nombre} [${obtenerEtiquetaListaPrecio(p.lista_precio || 1)}] = $${(p.subtotal_dolares || 0).toFixed(2)}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <small><strong>Pagos:</strong></small><br>
                        ${(venta.pagos || []).map(p => `
                            <div style="margin-left: 15px; font-size: 0.9em;">
                                ${p.medio}: ${p.moneda} ${(p.monto || 0).toFixed(2)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        `;
    },

    mostrarVentas() {
        const ventasDiv = document.getElementById('ventasRecientes');
        if (!ventasDiv) return;

        if (ventas.length === 0) {
            ventasDiv.innerHTML = '<div class="mensaje-vacio">No hay ventas registradas</div>';
            return;
        }

        const ventasRecientes = ventas.slice(-5).reverse();
        ventasDiv.innerHTML = ventasRecientes.map(venta => `
            <div class="venta-card" style="background: white; padding: 12px; margin-bottom: 8px; border-radius: 8px; border-left: 3px solid #28a745;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${venta.cliente || 'Consumidor Final'}</strong><br>
                        <small>${venta.fecha || (venta.id && venta.id > 1000000000 ? new Date(venta.id).toLocaleDateString() : 'S/F')}</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: #28a745;">$${(venta.total_dolares || 0).toFixed(2)}</strong><br>
                        <small>Bs ${(venta.total_bolivares || 0).toFixed(2)}</small>
                    </div>
                </div>
            </div>
        `).join('');
    },

    generarRecibo(venta, vuelto) {
        const fecha = new Date().toLocaleString();
        const productosHTML = venta.productos.map(p => `
            <tr>
                <td>${p.nombre}</td>
                <td style="text-align: center;">${p.cantidad}</td>
                <td style="text-align: center;">${obtenerEtiquetaListaPrecio(p.lista_precio || 1)}</td>
                <td style="text-align: right;">$${p.precio_unitario_dolares.toFixed(2)}</td>
                <td style="text-align: right;">$${p.subtotal_dolares.toFixed(2)}</td>
            </tr>
        `).join('');

        const pagosHTML = venta.pagos.map(p => `
            <tr>
                <td>${p.medio}</td>
                <td style="text-align: right;">${p.moneda} ${p.monto.toFixed(2)}</td>
            </tr>
        `).join('');

        const totalBs = venta.total_dolares * tasaDolar;

        const reciboHTML = `
            <div style="font-family: Arial, sans-serif; width: 300px; border: 2px solid #000; padding: 15px; background: white;">
                <h3 style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px;">
                    RECIBO DE VENTA
                </h3>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Cliente:</strong> ${venta.cliente}</p>
                <p><strong>Tipo:</strong> ${(venta.tipo_venta || 'contado').toUpperCase()}</p>
                
                <h4 style="margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Productos:</h4>
                <table style="width: 100%; font-size: 0.9em;">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th style="text-align: center;">Cant.</th>
                            <th style="text-align: center;">Lista</th>
                            <th style="text-align: right;">P. Unit.</th>
                            <th style="text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productosHTML}
                    </tbody>
                </table>
                
                <h4 style="margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Pagos:</h4>
                <table style="width: 100%; font-size: 0.9em;">
                    <thead>
                        <tr>
                            <th>Medio</th>
                            <th style="text-align: right;">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagosHTML}
                    </tbody>
                </table>
                
                <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #000;">
                    <p><strong>Total Venta:</strong> $${venta.total_dolares.toFixed(2)} / Bs ${totalBs.toFixed(2)}</p>
                    ${(venta.saldo_pendiente_usd || 0) > 0.001 ? `<p><strong>Saldo pendiente:</strong> $${(venta.saldo_pendiente_usd || 0).toFixed(2)}</p>` : ''}
                    ${(venta.saldo_a_favor_generado_usd || 0) > 0.001 ? `<p><strong>Saldo a favor generado:</strong> $${(venta.saldo_a_favor_generado_usd || 0).toFixed(2)}</p>` : ''}
                    ${vuelto ? `<p style="color: green; font-weight: bold;">${vuelto}</p>` : ''}
                </div>
                
                <p style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #666;">
                    ¡Gracias por su compra!<br>
                    Fecha: ${fecha}
                </p>
            </div>
        `;

        const ventanaRecibo = window.open('', '_blank');
        ventanaRecibo.document.write(reciboHTML);
        ventanaRecibo.document.close();
        ventanaRecibo.focus();

        setTimeout(() => {
            ventanaRecibo.print();
        }, 1000);
    },

    verDetallesPago(venta, numeroVenta) {
        if (typeof venta === 'string') {
            venta = JSON.parse(venta);
        }

        const numeroDocumento = venta.numero_venta || numeroVenta || venta.id || 'S/N';

        const detalleHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px; max-width: 500px;">
                <h3 style="margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                    Detalles de Pago - Venta #${numeroDocumento}
                </h3>
                <p><strong>Cliente:</strong> ${venta.cliente || 'Consumidor Final'}</p>
                <p><strong>Fecha:</strong> ${venta.fecha || (venta.id && venta.id > 1000000000 ? new Date(venta.id).toLocaleDateString('es-ES') : 'S/F')}</p>
                <p><strong>Total:</strong> $${(venta.total_dolares || 0).toFixed(2)} / Bs ${(venta.total_bolivares || 0).toFixed(2)}</p>
                
                <h4 style="margin-top: 20px; color: #667eea;">Medios de Pago:</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Medio</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(venta.pagos || []).map(p => `
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.medio}</td>
                                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">
                                    ${p.moneda} ${p.monto.toFixed(2)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; text-align: right;">
                    <button onclick="cerrarDetallePago()" class="btn-primary" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.id = 'modalDetallePago';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        modal.innerHTML = detalleHTML;
        modal.onclick = e => {
            if (e.target === modal) this.cerrarDetallePago();
        };

        document.body.appendChild(modal);
    },

    cerrarDetallePago() {
        const modal = document.getElementById('modalDetallePago');
        if (modal) {
            document.body.removeChild(modal);
        }
    },

    abrirModalDevolucion(ventaId) {
        const venta = this.obtenerVentaPorId(ventaId);
        if (!venta) {
            mostrarNotificacion('⚠️ No se encontró la venta');
            return;
        }

        const productosDisponibles = (venta.productos || []).filter(p => (p.cantidad_disponible_devolucion || 0) > 0);
        if (productosDisponibles.length === 0) {
            mostrarNotificacion('⚠️ Esta venta no tiene productos disponibles para devolver');
            return;
        }

        devolucionActiva = venta;
        reintegrosDevolucion = [];
        document.getElementById('devolucionMetodoReintegro').value = 'Efectivo';
        document.getElementById('devolucionMonedaReintegro').value = 'USD';
        document.getElementById('devolucionTasaReintegro').value = tasaDolar.toFixed(2);
        document.getElementById('devolucionMontoReintegro').value = '';
        document.getElementById('devolucionMotivo').value = '';

        document.getElementById('devolucionVentaInfo').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px;">
                <div><strong>Nro. venta:</strong><br>${venta.numero_venta || venta.id}</div>
                <div><strong>Fecha:</strong><br>${venta.fecha || 'S/F'}</div>
                <div><strong>Cliente:</strong><br>${venta.cliente || 'Consumidor Final'}</div>
                <div><strong>Total venta:</strong><br>$${(venta.total_dolares || 0).toFixed(2)}</div>
            </div>
        `;

        document.getElementById('devolucionProductosLista').innerHTML = productosDisponibles.map(producto => `
            <div style="display: grid; grid-template-columns: minmax(180px, 1fr) 110px 120px 120px; gap: 10px; align-items: center; padding: 10px; border-bottom: 1px solid #f1f5f9;">
                <div>
                    <strong>${producto.nombre}</strong><br>
                    <small>Vendidos: ${producto.cantidad} | Devueltos: ${producto.cantidad_devuelta || 0}</small>
                </div>
                <div>
                    <small>Disponible</small><br>
                    <strong>${producto.cantidad_disponible_devolucion}</strong>
                </div>
                <div>
                    <small>Precio unit.</small><br>
                    <strong>$${(producto.precio_unitario_dolares || 0).toFixed(2)}</strong>
                </div>
                <div>
                    <label style="font-size: 0.8em; display: block; margin-bottom: 4px;">A devolver</label>
                    <input
                        type="number"
                        min="0"
                        max="${producto.cantidad_disponible_devolucion}"
                        value="0"
                        class="form-control input-devolucion-cantidad"
                        data-detalle-id="${producto.detalle_venta_id || producto.id}"
                        data-producto-id="${producto.producto_id || ''}"
                        data-nombre="${this.escaparAtributoHtml(producto.nombre)}"
                        data-precio="${producto.precio_unitario_dolares || 0}"
                        oninput="actualizarResumenDevolucion()"
                    >
                </div>
            </div>
        `).join('');

        this.renderListaReintegrosDevolucion();
        this.sincronizarFormularioReintegro();
        this.actualizarResumenDevolucion();
        const modalElement = document.getElementById('modalDevolucion');
        const modalContent = modalElement?.querySelector('.modal-content');
        if (modalElement) modalElement.scrollTop = 0;
        if (modalContent) modalContent.scrollTop = 0;

        const modal = this.obtenerModalDevolucion();
        modal?.open() || (modalElement.style.display = 'block');
    },

    cerrarModalDevolucion() {
        const modal = this.obtenerModalDevolucion();
        const modalElement = document.getElementById('modalDevolucion');
        modal?.close() || (modalElement.style.display = 'none');
        devolucionActiva = null;
        reintegrosDevolucion = [];
    },

    sincronizarFormularioReintegro() {
        const moneda = document.getElementById('devolucionMonedaReintegro').value;
        const inputTasa = document.getElementById('devolucionTasaReintegro');
        if (moneda === 'USD') {
            inputTasa.value = tasaDolar.toFixed(2);
        } else if (!parseFloat(inputTasa.value || '0')) {
            inputTasa.value = tasaDolar.toFixed(2);
        }
        this.actualizarVistaFormularioReintegro();
    },

    actualizarVistaFormularioReintegro() {
        const moneda = document.getElementById('devolucionMonedaReintegro').value;
        const monto = parseFloat(document.getElementById('devolucionMontoReintegro').value || '0') || 0;
        const tasa = parseFloat(document.getElementById('devolucionTasaReintegro').value || '0') || 0;
        const equivalenteUSD = moneda === 'BS' ? (tasa > 0 ? monto / tasa : 0) : monto;
        document.getElementById('devolucionVistaFormulario').textContent = `${moneda} ${monto.toFixed(2)} equivalen a $${equivalenteUSD.toFixed(2)}`;
    },

    agregarReintegroDevolucion() {
        const metodo = document.getElementById('devolucionMetodoReintegro').value;
        const moneda = document.getElementById('devolucionMonedaReintegro').value;
        const monto = parseFloat(document.getElementById('devolucionMontoReintegro').value || '0') || 0;
        const tasa = parseFloat(document.getElementById('devolucionTasaReintegro').value || '0') || 0;

        if (monto <= 0) {
            mostrarNotificacion('❌ Ingrese un monto de reintegro válido');
            return;
        }
        if (moneda === 'BS' && tasa <= 0) {
            mostrarNotificacion('❌ Ingrese una tasa válida para el reintegro en bolívares');
            return;
        }

        const equivalenteUSD = moneda === 'BS' ? monto / tasa : monto;
        const totalUSD = roundAmount(this.obtenerItemsDevolucionSeleccionados().reduce((sum, item) => sum + item.subtotal, 0));
        const entregadoUSD = roundAmount(reintegrosDevolucion.reduce((sum, item) => sum + (item.equivalente_usd || 0), 0));
        const faltanteUSD = roundAmount(totalUSD - entregadoUSD);

        if (totalUSD > 0 && equivalenteUSD - faltanteUSD > 0.05) {
            mostrarNotificacion(`❌ El reintegro no puede superar el faltante de $${faltanteUSD.toFixed(2)}`);
            return;
        }

        reintegrosDevolucion.push({
            metodo,
            moneda,
            monto: roundAmount(monto),
            tasa: moneda === 'BS' ? roundAmount(tasa) : 0,
            equivalente_usd: roundAmount(equivalenteUSD)
        });

        document.getElementById('devolucionMontoReintegro').value = '';
        this.renderListaReintegrosDevolucion();
        this.actualizarVistaFormularioReintegro();
        this.actualizarResumenDevolucion();
    },

    eliminarReintegroDevolucion(index) {
        reintegrosDevolucion.splice(index, 1);
        this.renderListaReintegrosDevolucion();
        this.actualizarResumenDevolucion();
    },

    renderListaReintegrosDevolucion() {
        const contenedor = document.getElementById('devolucionListaReintegros');
        if (!contenedor) return;

        if (!reintegrosDevolucion.length) {
            contenedor.innerHTML = '<div style="padding: 10px; color: #64748b; background: white; border-radius: 6px; border: 1px dashed #cbd5e1;">No hay entregas agregadas todavía.</div>';
            return;
        }

        contenedor.innerHTML = reintegrosDevolucion.map((item, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 8px;">
                <div>
                    <strong>${item.metodo}</strong><br>
                    <small>${item.moneda} ${item.monto.toFixed(2)}${item.moneda === 'BS' ? ` | Tasa ${item.tasa.toFixed(2)}` : ''} | Equiv. $${item.equivalente_usd.toFixed(2)}</small>
                </div>
                <button type="button" class="btn-secondary" onclick="eliminarReintegroDevolucion(${index})">🗑️</button>
            </div>
        `).join('');
    },

    obtenerItemsDevolucionSeleccionados() {
        const inputs = Array.from(document.querySelectorAll('.input-devolucion-cantidad'));
        return inputs.map(input => {
            const cantidad = Math.max(0, parseInt(input.value || '0', 10) || 0);
            const maximo = parseInt(input.getAttribute('max') || '0', 10);
            const cantidadFinal = Math.min(cantidad, maximo);
            input.value = cantidadFinal;
            return {
                detalle_venta_id: parseInt(input.dataset.detalleId, 10),
                producto_id: input.dataset.productoId ? parseInt(input.dataset.productoId, 10) : null,
                nombre: input.dataset.nombre,
                precio: parseFloat(input.dataset.precio || '0'),
                cantidad: cantidadFinal,
                subtotal: cantidadFinal * parseFloat(input.dataset.precio || '0')
            };
        }).filter(item => item.cantidad > 0);
    },

    actualizarResumenDevolucion() {
        const items = this.obtenerItemsDevolucionSeleccionados();
        const totalUSD = roundAmount(items.reduce((sum, item) => sum + item.subtotal, 0));
        const entregadoUSD = roundAmount(reintegrosDevolucion.reduce((sum, item) => sum + (item.equivalente_usd || 0), 0));
        const entregadoBS = roundAmount(reintegrosDevolucion.filter(item => item.moneda === 'BS').reduce((sum, item) => sum + item.monto, 0));
        const diferenciaUSD = roundAmount(totalUSD - entregadoUSD);

        document.getElementById('devolucionTotalUSD').textContent = `$${totalUSD.toFixed(2)}`;
        document.getElementById('devolucionEntregadoUSD').textContent = `$${entregadoUSD.toFixed(2)}`;
        document.getElementById('devolucionEntregadoBS').textContent = `Bs ${entregadoBS.toFixed(2)}`;
        document.getElementById('devolucionFaltanteUSD').textContent = `${diferenciaUSD >= 0 ? '$' : '-$'}${Math.abs(diferenciaUSD).toFixed(2)}`;
        document.getElementById('btnGuardarDevolucion').disabled = items.length === 0 || reintegrosDevolucion.length === 0 || Math.abs(diferenciaUSD) > 0.05;
    },

    async guardarDevolucionVenta() {
        if (!devolucionActiva) return;

        const items = this.obtenerItemsDevolucionSeleccionados();
        if (items.length === 0) {
            mostrarNotificacion('❌ Seleccione al menos un producto para devolver');
            return;
        }

        if (reintegrosDevolucion.length === 0) {
            mostrarNotificacion('❌ Debe agregar al menos una entrega de reintegro');
            return;
        }

        const totalUSD = roundAmount(items.reduce((sum, item) => sum + item.subtotal, 0));
        const entregadoUSD = roundAmount(reintegrosDevolucion.reduce((sum, item) => sum + (item.equivalente_usd || 0), 0));
        if (Math.abs(totalUSD - entregadoUSD) > 0.05) {
            mostrarNotificacion('❌ El total de reintegro no coincide con la devolución');
            return;
        }

        const payload = {
            motivo: document.getElementById('devolucionMotivo').value.trim(),
            reintegros: reintegrosDevolucion.map(item => ({
                metodo: item.metodo,
                moneda: item.moneda,
                monto: item.monto,
                tasa: item.tasa
            })),
            items: items.map(item => ({
                detalle_venta_id: item.detalle_venta_id,
                producto_id: item.producto_id,
                cantidad: item.cantidad
            }))
        };

        const btnGuardar = document.getElementById('btnGuardarDevolucion');
        const textoOriginal = btnGuardar.textContent;

        try {
            btnGuardar.disabled = true;
            btnGuardar.textContent = '⌛ Registrando...';

            const respuesta = await ApiService.registrarDevolucionVenta(devolucionActiva.id, payload);
            const ventaId = devolucionActiva.id;

            this.cerrarModalDevolucion();
            await cargarProductos();
            await cargarDatosVentas();
            mostrarVentas();
            cargarTodasLasVentas();

            const ventaActualizada = this.obtenerVentaPorId(ventaId) || devolucionActiva;
            mostrarNotificacion('✅ Devolución registrada con reintegro');
            this.verTicketDevolucion(respuesta.devolucion, ventaActualizada);
        } catch (e) {
            mostrarNotificacion(`❌ No se pudo registrar la devolución: ${e.message || 'Error inesperado'}`);
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = textoOriginal;
        }
    },

    verTicketDevolucion(devolucion, venta) {
        const numeroVenta = (venta && (venta.numero_venta || venta.id)) || devolucion.venta_numero_venta || devolucion.venta_id;
        const detalles = (devolucion.detalles || []).map(detalle => `
            <div style="margin-bottom: 8px; font-size: 0.85em;">
                <div style="display: flex; justify-content: space-between;">
                    <span>${detalle.producto_nombre}</span>
                    <span>${detalle.cantidad} x $${(detalle.precio_unitario_dolares || 0).toFixed(2)}</span>
                </div>
                <div style="color:#64748b; text-align:right;">${obtenerEtiquetaListaPrecio(detalle.lista_precio || 1)}</div>
                <div style="text-align: right; font-weight: bold;">$${(detalle.subtotal_dolares || 0).toFixed(2)}</div>
            </div>
        `).join('');

        const reintegrosHtml = (devolucion.reintegros_entregados || []).map(reintegro => `
            <div style="margin-bottom: 6px; font-size: 0.85em; display: flex; justify-content: space-between; gap: 8px;">
                <span>${reintegro.metodo}</span>
                <span>${reintegro.moneda} ${Number(reintegro.monto || 0).toFixed(2)}</span>
            </div>
        `).join('');

        const motivo = devolucion.motivo ? `<div style="margin-top: 10px;"><strong>Motivo:</strong> ${devolucion.motivo}</div>` : '';
        const html = `
            <div style="font-family: 'Courier New', monospace; background: white; padding: 16px; max-width: 320px; margin: 0 auto;">
                <div style="text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="font-size: 1.3em; font-weight: bold;">TICKET DEVOLUCION</div>
                    <div>Devolución #${devolucion.id}</div>
                    <div>Venta #${numeroVenta}</div>
                    <div>${devolucion.fecha}</div>
                </div>
                <div style="margin-bottom: 10px; font-size: 0.9em;">
                    <div><strong>Cliente:</strong> ${(venta && venta.cliente) || devolucion.cliente || 'Cliente General'}</div>
                    <div><strong>Reintegro total:</strong> $${(devolucion.total_reintegrado_dolares || 0).toFixed(2)}</div>
                </div>
                <div style="border-bottom: 2px dashed #333; margin-bottom: 10px;"></div>
                <div style="font-weight: bold; text-align: center; margin-bottom: 8px;">PRODUCTOS DEVUELTOS</div>
                ${detalles}
                <div style="border-top: 2px dashed #333; margin-top: 10px; padding-top: 10px; font-size: 0.9em;">
                    <div style="font-weight: bold; text-align: center; margin-bottom: 8px;">REINTEGROS ENTREGADOS</div>
                    ${reintegrosHtml || '<div style="text-align:center;">Sin detalle</div>'}
                </div>
                <div style="border-top: 2px dashed #333; margin-top: 10px; padding-top: 10px; font-size: 0.9em;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>Total USD:</span>
                        <span>$${(devolucion.total_reintegrado_dolares || 0).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                        <span>Total Bs:</span>
                        <span>Bs ${(devolucion.total_reintegrado_bolivares || 0).toFixed(2)}</span>
                    </div>
                    ${motivo}
                </div>
            </div>
        `;

        this.abrirVentanaImpresionTicket(html, 'Ticket de devolución');
    },

    abrirVentanaImpresionTicket(ticketHtml, titulo) {
        const ventanaImpresion = window.open('', '_blank', 'width=300,height=600');
        if (!ventanaImpresion) return;

        ventanaImpresion.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${titulo}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        width: 80mm;
                        max-width: 300px;
                        margin: 0 auto;
                        padding: 10px;
                        background: white;
                    }
                    @media print {
                        body { width: 80mm; margin: 0; padding: 5mm; }
                        @page { size: 80mm auto; margin: 0; }
                    }
                </style>
            </head>
            <body>${ticketHtml}</body>
            </html>
        `);

        ventanaImpresion.document.close();
        setTimeout(() => {
            ventanaImpresion.print();
        }, 500);
    },

    verReciboCompleto(venta, numeroVenta) {
        if (typeof venta === 'string') {
            venta = JSON.parse(venta);
        }

        const numeroDocumento = venta.numero_venta || numeroVenta || venta.id || 'S/N';

        let totalPagadoDolares = 0;
        let totalPagadoBs = 0;

        venta.pagos.forEach(pago => {
            if (pago.moneda === 'USD') {
                totalPagadoDolares += pago.monto;
            } else {
                totalPagadoBs += pago.monto;
            }
        });

        const reciboHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px; max-width: 350px; font-family: 'Courier New', monospace; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                <div style="text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="font-size: 1.4em; font-weight: bold; margin-bottom: 5px;">RECIBO</div>
                    <div style="font-size: 0.9em;">Venta #${numeroDocumento}</div>
                    <div style="font-size: 0.85em; margin-top: 3px;">${venta.fecha || 'S/F'}</div>
                </div>
                
                <div style="margin-bottom: 10px; font-size: 0.9em;">
                    <strong>Cliente:</strong> ${venta.cliente}
                </div>
                <div style="margin-bottom: 10px; font-size: 0.9em;">
                    <strong>Tipo:</strong> ${(venta.tipo_venta || 'contado').toUpperCase()}
                </div>
                
                <div style="border-bottom: 2px dashed #333; margin-bottom: 10px;"></div>
                
                <div style="margin-bottom: 10px;">
                    <div style="font-weight: bold; margin-bottom: 5px; text-align: center;">PRODUCTOS</div>
                    ${venta.productos.map(p => `
                        <div style="margin-bottom: 8px; font-size: 0.85em;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="flex: 1;">${p.nombre}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                                <span>${p.cantidad} x $${p.precio_unitario_dolares.toFixed(2)} - ${obtenerEtiquetaListaPrecio(p.lista_precio || 1)}</span>
                                <span style="font-weight: bold;">$${p.subtotal_dolares.toFixed(2)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="border-bottom: 2px dashed #333; margin-bottom: 10px;"></div>
                
                <div style="margin-bottom: 10px; font-size: 0.9em;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; font-size: 1.1em;">
                        <span>TOTAL VENTA:</span>
                        <span>$${venta.total_dolares.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85em; color: #666;">
                        <span>En Bs:</span>
                        <span>Bs ${venta.total_bolivares.toFixed(2)}</span>
                    </div>
                    
                    ${venta.descuento_dolares > 0 ? `
                    <div style="border-top: 1px dashed #ccc; margin-top: 5px; padding-top: 5px; font-size: 0.9em; color: #28a745; display: flex; justify-content: space-between;">
                        <span>Ahorro aplicado:</span>
                        <span>-$${venta.descuento_dolares.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em; margin-top: 5px; border-top: 1px solid #333; padding-top: 5px;">
                        <span>TOTAL A PAGAR:</span>
                        <span>$${(venta.total_dolares - venta.descuento_dolares).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    ${(venta.saldo_pendiente_usd || 0) > 0.001 ? `
                    <div style="display: flex; justify-content: space-between; margin-top: 5px; color: #b45309; font-weight: bold;">
                        <span>SALDO PENDIENTE:</span>
                        <span>$${(venta.saldo_pendiente_usd || 0).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    ${(venta.saldo_a_favor_generado_usd || 0) > 0.001 ? `
                    <div style="display: flex; justify-content: space-between; margin-top: 5px; color: #198754; font-weight: bold;">
                        <span>SALDO A FAVOR:</span>
                        <span>$${(venta.saldo_a_favor_generado_usd || 0).toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="border-bottom: 2px dashed #333; margin-bottom: 10px;"></div>
                
                <div style="margin-bottom: 10px;">
                    <div style="font-weight: bold; margin-bottom: 5px; text-align: center;">MEDIOS DE PAGO</div>
                    ${venta.pagos.map(p => `
                        <div style="margin-bottom: 4px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.85em;">
                                <span>${p.medio}</span>
                                <span style="font-weight: bold;">${p.moneda} ${Math.abs(p.monto).toFixed(2)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="border-bottom: 2px dashed #333; margin-bottom: 10px;"></div>
                
                <div style="text-align: center; font-size: 0.85em; margin-bottom: 15px;">
                    <div style="margin-bottom: 3px;">¡Gracias por su compra!</div>
                    <div style="font-size: 0.8em; color: #666;">Vuelva pronto</div>
                </div>
                
                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 15px;">
                    <button onclick="imprimirTicket()" title="F9" style="padding: 10px 20px; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.9em;">
                        🖨️ Imprimir
                    </button>
                    <button onclick="cerrarReciboCompleto()" title="F10 o Enter" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.9em;">
                        Cerrar (F10)
                    </button>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.id = 'modalReciboCompleto';
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            overflow-y: auto;
            padding: 20px;
        `;
        modal.innerHTML = reciboHTML;
        modal.onclick = e => {
            if (e.target === modal) this.cerrarReciboCompleto();
        };

        document.body.appendChild(modal);
        const botonCerrar = modal.querySelector('button[onclick="cerrarReciboCompleto()"]');
        botonCerrar?.focus();
    },

    cerrarReciboCompleto() {
        const modal = document.getElementById('modalReciboCompleto');
        if (modal) {
            document.body.removeChild(modal);
        }
    },

    imprimirTicket() {
        const modal = document.getElementById('modalReciboCompleto');
        if (!modal) return;

        const ticketContent = modal.querySelector('div > div');
        if (!ticketContent) return;
        this.abrirVentanaImpresionTicket(ticketContent.innerHTML, 'Ticket de Venta');
    }
};

window.VentasPostventaFeature = VentasPostventaFeature;
