// ============================================
// INFORME DE VENTA DEL DIA
// ============================================

const InformesVentaDiaService = {

    _ultimosDatos: null,

    obtenerApiUrl() {
        return window.API_URL || (window.API?.baseUrl || '/api').replace(/\/$/, '');
    },

    obtenerHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        try {
            const sesionGuardada = localStorage.getItem('sesion_ventas') || sessionStorage.getItem('sesion_ventas');
            if (sesionGuardada) {
                const sesion = JSON.parse(sesionGuardada);
                if (sesion?.token) {
                    headers['Authorization'] = `Bearer ${sesion.token}`;
                }
            }
        } catch (e) {
            console.warn('Error leyendo sesion para headers:', e);
        }
        return headers;
    },

    // -- Helpers --

    fmt(n) {
        const num = Number(n) || 0;
        return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    fmtInt(n) {
        const num = Number(n) || 0;
        return Number.isInteger(num) ? num.toLocaleString('es-VE') : num.toLocaleString('es-VE', { minimumFractionDigits: 2 });
    },

    // -- Lectura del formulario --

    obtenerSeccionesSeleccionadas() {
        const mapeo = {
            'chkResumenGeneral': 'resumen',
            'chkMetodosPago': 'metodos_pago',
            'chkCuentasCobrar': 'cuentas_por_cobrar',
            'chkRecibosCaja': 'recibos_caja',
            'chkVentasDetalladas': 'ventas_detalladas',
            'chkProductosVendidos': 'productos_vendidos',
            'chkDevoluciones': 'devoluciones',
        };
        const secciones = [];
        for (const [id, seccion] of Object.entries(mapeo)) {
            const el = document.getElementById(id);
            if (el?.checked) secciones.push(seccion);
        }
        return secciones;
    },

    obtenerParametros() {
        const fecha = document.getElementById('fechaInformeDia')?.value || '';
        const horaInicio = document.getElementById('horaInicioInforme')?.value || '00:00';
        const horaFin = document.getElementById('horaFinInforme')?.value || '23:59';
        const secciones = this.obtenerSeccionesSeleccionadas();
        return { fecha, horaInicio, horaFin, secciones };
    },

    inicializarFechaHoy() {
        const input = document.getElementById('fechaInformeDia');
        if (input && !input.value) {
            const hoy = new Date();
            const yyyy = hoy.getFullYear();
            const mm = String(hoy.getMonth() + 1).padStart(2, '0');
            const dd = String(hoy.getDate()).padStart(2, '0');
            input.value = `${yyyy}-${mm}-${dd}`;
        }
    },

    // -- Carga de datos --

    async cargarInforme() {
        const { fecha, horaInicio, horaFin, secciones } = this.obtenerParametros();

        if (!fecha) {
            alert('Debe seleccionar una fecha para generar el informe');
            return;
        }

        if (secciones.length === 0) {
            alert('Debe seleccionar al menos una opcion para incluir en el informe');
            return;
        }

        const url = new URL(`${this.obtenerApiUrl()}/ventas/informe-dia`, window.location.origin);
        url.searchParams.set('fecha', fecha);
        url.searchParams.set('hora_inicio', horaInicio);
        url.searchParams.set('hora_fin', horaFin);
        url.searchParams.set('secciones', secciones.join(','));

        const contenedor = document.getElementById('resultadoInformeDia');
        if (contenedor) {
            contenedor.innerHTML = '<div class="informe-dia-placeholder"><p>Cargando informe...</p></div>';
        }

        try {
            const resp = await fetch(url.toString(), { headers: this.obtenerHeaders() });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error || err.msg || `Error ${resp.status}`);
            }
            const data = await resp.json();
            this._ultimosDatos = data;
            this.renderInforme(data);

            const btnPdf = document.getElementById('btnImprimirInformeDia');
            if (btnPdf) btnPdf.disabled = false;

        } catch (error) {
            console.error('Error cargando informe del dia:', error);
            if (contenedor) {
                contenedor.innerHTML = `<div class="informe-dia-placeholder"><p style="color:var(--danger);">Error: ${error.message}</p></div>`;
            }
        }
    },

    // -- Render vista previa --

    renderInforme(data) {
        const contenedor = document.getElementById('resultadoInformeDia');
        if (!contenedor || !data) return;

        let html = '';

        // Tarjetas de resumen
        if (data.resumen) {
            html += this.renderResumen(data);
        }

        // Metodos de pago
        if (data.metodos_pago) {
            html += this.renderMetodosPago(data.metodos_pago);
        }

        // Recibos de caja
        if (data.recibos_caja) {
            html += this.renderRecibosCaja(data.recibos_caja);
        }

        // Ventas detalladas
        if (data.ventas_detalladas) {
            html += this.renderVentasDetalladas(data.ventas_detalladas);
        }

        // Productos vendidos
        if (data.productos_vendidos) {
            html += this.renderProductosVendidos(data.productos_vendidos);
        }

        // Cuentas por cobrar
        if (data.cuentas_por_cobrar) {
            html += this.renderCuentasPorCobrar(data.cuentas_por_cobrar);
        }

        // Devoluciones
        if (data.devoluciones) {
            html += this.renderDevoluciones(data.devoluciones);
        }

        if (!html) {
            html = '<div class="informe-dia-placeholder"><p>No hay datos para mostrar con las opciones seleccionadas.</p></div>';
        }

        contenedor.innerHTML = html;
    },

    renderResumen(data) {
        const r = data.resumen;
        return `
            <div class="informe-dia-seccion">
                <h3 class="informe-dia-seccion-titulo">Resumen General - ${data.fecha}</h3>
                <div class="resumen-ventas-grid informe-dia-resumen-grid">
                    <div class="tarjeta-resumen tarjeta-resumen--ventas-dia">
                        <h3>Ventas Brutas</h3>
                        <div class="valor">$${this.fmt(r.ventas_brutas_usd)}</div>
                        <small>Bs ${this.fmt(r.ventas_brutas_bs)}</small>
                    </div>
                    <div class="tarjeta-resumen tarjeta-resumen--contado-dia">
                        <h3>Total Contado</h3>
                        <div class="valor">$${this.fmt(r.total_contado_usd)}</div>
                    </div>
                    <div class="tarjeta-resumen tarjeta-resumen--credito-dia">
                        <h3>Total Credito</h3>
                        <div class="valor">$${this.fmt(r.total_credito_usd)}</div>
                    </div>
                    <div class="tarjeta-resumen tarjeta-resumen--costo-dia">
                        <h3>Costo Total</h3>
                        <div class="valor">$${this.fmt(r.total_costo)}</div>
                    </div>
                    <div class="tarjeta-resumen tarjeta-resumen--transacciones-dia">
                        <h3>Transacciones</h3>
                        <div class="valor">${r.total_transacciones}</div>
                    </div>
                </div>
                <h3 class="informe-dia-seccion-titulo" style="margin-top:16px;">Utilidades</h3>
                <div class="resumen-ventas-grid informe-dia-resumen-grid">
                    <div class="tarjeta-resumen tarjeta-resumen--utilidad-contado-dia">
                        <h3>Utilidad Contado</h3>
                        <div class="valor">$${this.fmt(r.utilidad_contado)}</div>
                        <small>Margen: ${r.margen_contado}%</small>
                    </div>
                    <div class="tarjeta-resumen tarjeta-resumen--utilidad-credito-dia">
                        <h3>Utilidad Credito</h3>
                        <div class="valor">$${this.fmt(r.utilidad_credito)}</div>
                        <small>Margen: ${r.margen_credito}%</small>
                    </div>
                    <div class="tarjeta-resumen tarjeta-resumen--utilidad-dia">
                        <h3>Utilidad Total</h3>
                        <div class="valor">$${this.fmt(r.utilidad_total)}</div>
                        <small>Margen: ${r.margen_utilidad}%</small>
                    </div>
                </div>
            </div>
        `;
    },

    renderMetodosPago(metodos) {
        if (!metodos.length) return '<div class="informe-dia-seccion"><h3 class="informe-dia-seccion-titulo">Metodos de Pago</h3><p class="informe-dia-vacio">Sin pagos registrados</p></div>';
        const totalUsd = metodos.reduce((s, m) => s + (m.total_usd || 0), 0);
        const filas = metodos.map(m => `
            <tr>
                <td><strong>${m.medio}</strong></td>
                <td style="text-align:center;">${m.cantidad_pagos}</td>
                <td style="text-align:right;">${m.moneda !== 'USD' ? `${this.fmt(m.total_moneda)} ${m.moneda}` : '-'}</td>
                <td style="text-align:right;"><strong>$${this.fmt(m.total_usd)}</strong></td>
            </tr>
        `).join('');
        return `
            <div class="informe-dia-seccion">
                <h3 class="informe-dia-seccion-titulo">Metodos de Pago</h3>
                <div class="tabla-informes">
                    <table>
                        <thead><tr><th>Medio</th><th style="text-align:center;">Operaciones</th><th style="text-align:right;">Total Moneda</th><th style="text-align:right;">Total USD</th></tr></thead>
                        <tbody>
                            ${filas}
                            <tr style="background:var(--bg-muted);font-weight:700;">
                                <td colspan="3" style="text-align:right;">TOTAL INGRESOS:</td>
                                <td style="text-align:right;">$${this.fmt(totalUsd)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderRecibosCaja(recibos) {
        if (!recibos.length) return '<div class="informe-dia-seccion"><h3 class="informe-dia-seccion-titulo">Recibos de Caja</h3><p class="informe-dia-vacio">Sin recibos</p></div>';
        const filas = recibos.map((r, i) => `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td style="text-align:center;">#${r.numero_venta}</td>
                <td style="text-align:center;">${r.hora}</td>
                <td>${r.cliente}</td>
                <td>${r.usuario}</td>
                <td style="text-align:right;">$${this.fmt(r.total_usd)}</td>
                <td style="text-align:center;"><span class="badge-tipo-venta badge-tipo-venta--${r.tipo}">${r.tipo === 'contado' ? 'Contado' : 'Credito'}</span></td>
            </tr>
        `).join('');
        return `
            <div class="informe-dia-seccion">
                <h3 class="informe-dia-seccion-titulo">Recibos de Caja</h3>
                <div class="tabla-informes">
                    <table>
                        <thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Factura</th><th style="text-align:center;">Hora</th><th>Cliente</th><th>Usuario</th><th style="text-align:right;">Total $</th><th style="text-align:center;">Tipo</th></tr></thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderVentasDetalladas(ventas) {
        if (!ventas.length) return '<div class="informe-dia-seccion"><h3 class="informe-dia-seccion-titulo">Ventas Detalladas</h3><p class="informe-dia-vacio">Sin ventas</p></div>';
        const tarjetas = ventas.map(v => {
            const prodsHtml = v.productos.map(p => `
                <tr>
                    <td>${p.nombre}</td>
                    <td style="text-align:right;">${this.fmtInt(p.cantidad)}</td>
                    <td style="text-align:right;">$${this.fmt(p.precio_unitario)}</td>
                    <td style="text-align:right;">$${this.fmt(p.subtotal)}</td>
                </tr>
            `).join('');
            const pagosHtml = v.pagos.map(p => `<span class="badge-pago">${p.medio}: ${p.moneda === 'USD' ? '$' : 'Bs '}${this.fmt(p.monto)}</span>`).join(' ');
            return `
                <div class="informe-dia-venta-card">
                    <div class="informe-dia-venta-header">
                        <strong>Venta #${v.numero_venta}</strong>
                        <span>${v.hora} &middot; ${v.cliente} &middot; ${v.usuario}</span>
                        <span class="badge-tipo-venta badge-tipo-venta--${v.tipo}">${v.tipo === 'contado' ? 'Contado' : 'Credito'}</span>
                    </div>
                    <table class="informe-dia-mini-tabla">
                        <thead><tr><th>Producto</th><th style="text-align:right;">Cant.</th><th style="text-align:right;">P.Unit.</th><th style="text-align:right;">Subtotal</th></tr></thead>
                        <tbody>${prodsHtml}</tbody>
                    </table>
                    <div class="informe-dia-venta-footer">
                        <div class="informe-dia-venta-pagos">${pagosHtml}</div>
                        <div class="informe-dia-venta-total"><strong>Total: $${this.fmt(v.total_usd)}</strong></div>
                    </div>
                </div>
            `;
        }).join('');
        return `
            <div class="informe-dia-seccion">
                <h3 class="informe-dia-seccion-titulo">Ventas Detalladas</h3>
                ${tarjetas}
            </div>
        `;
    },

    renderProductosVendidos(productos) {
        if (!productos.length) return '<div class="informe-dia-seccion"><h3 class="informe-dia-seccion-titulo">Productos Vendidos</h3><p class="informe-dia-vacio">Sin productos</p></div>';
        const totalUsd = productos.reduce((s, p) => s + (p.total_usd || 0), 0);
        const totalCant = productos.reduce((s, p) => s + (p.cantidad_total || 0), 0);
        const filas = productos.map((p, i) => `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td><strong>${p.producto}</strong></td>
                <td style="text-align:right;">${this.fmtInt(p.cantidad_total)}</td>
                <td style="text-align:right;">$${this.fmt(p.costo_total)}</td>
                <td style="text-align:right;"><strong>$${this.fmt(p.total_usd)}</strong></td>
            </tr>
        `).join('');
        return `
            <div class="informe-dia-seccion">
                <h3 class="informe-dia-seccion-titulo">Productos Vendidos</h3>
                <div class="tabla-informes">
                    <table>
                        <thead><tr><th style="text-align:center;">#</th><th>Producto</th><th style="text-align:right;">Cantidad</th><th style="text-align:right;">Costo Total</th><th style="text-align:right;">Venta Total</th></tr></thead>
                        <tbody>
                            ${filas}
                            <tr style="background:var(--bg-muted);font-weight:700;">
                                <td></td>
                                <td>TOTALES</td>
                                <td style="text-align:right;">${this.fmtInt(totalCant)}</td>
                                <td></td>
                                <td style="text-align:right;">$${this.fmt(totalUsd)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderCuentasPorCobrar(cuentas) {
        if (!cuentas.length) return '<div class="informe-dia-seccion"><h3 class="informe-dia-seccion-titulo">Cuentas por Cobrar</h3><p class="informe-dia-vacio">Sin cuentas por cobrar generadas</p></div>';
        const filas = cuentas.map((c, i) => `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td style="text-align:center;">#${c.numero_venta}</td>
                <td>${c.cliente}</td>
                <td style="text-align:right;">$${this.fmt(c.monto_original_usd)}</td>
                <td style="text-align:right;">$${this.fmt(c.saldo_pendiente_usd)}</td>
                <td style="text-align:center;">${c.estado}</td>
            </tr>
        `).join('');
        return `
            <div class="informe-dia-seccion">
                <h3 class="informe-dia-seccion-titulo">Cuentas por Cobrar</h3>
                <div class="tabla-informes">
                    <table>
                        <thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Venta</th><th>Cliente</th><th style="text-align:right;">Monto</th><th style="text-align:right;">Saldo</th><th style="text-align:center;">Estado</th></tr></thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderDevoluciones(devoluciones) {
        if (!devoluciones.length) return '<div class="informe-dia-seccion"><h3 class="informe-dia-seccion-titulo">Devoluciones</h3><p class="informe-dia-vacio">Sin devoluciones registradas</p></div>';
        const filas = devoluciones.map((d, i) => `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td style="text-align:center;">${d.fecha}</td>
                <td>${d.cliente}</td>
                <td>${d.motivo || '-'}</td>
                <td>${d.metodo_reintegro}</td>
                <td style="text-align:right;">$${this.fmt(d.total_reintegrado_usd)}</td>
            </tr>
        `).join('');
        return `
            <div class="informe-dia-seccion">
                <h3 class="informe-dia-seccion-titulo">Devoluciones del Dia</h3>
                <div class="tabla-informes">
                    <table>
                        <thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Hora</th><th>Cliente</th><th>Motivo</th><th>Metodo</th><th style="text-align:right;">Total USD</th></tr></thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // -- Exportar PDF --

    exportarPDF() {
        const data = this._ultimosDatos;
        if (!data) {
            alert('No hay datos para exportar. Genere el informe primero.');
            return;
        }

        const empresa = window.AppState?.nombreEmpresa || window.AppState?.configuracion?.empresa_nombre || 'Mi Empresa';
        const rif = window.AppState?.rifEmpresa || window.AppState?.configuracion?.empresa_rif || '';
        const direccion = window.AppState?.direccionEmpresa || window.AppState?.configuracion?.empresa_direccion || '';
        const ahora = new Date();
        const fechaStr = ahora.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaStr = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

        let cuerpo = '';

        // Resumen general
        if (data.resumen) {
            const r = data.resumen;
            cuerpo += `
                <div class="seccion">
                    <h2>Resumen General de Ventas</h2>
                    <div class="resumen-grid">
                        <div class="resumen-card highlight">
                            <h4>Ventas Brutas</h4>
                            <div class="val">$${this.fmt(r.ventas_brutas_usd)}</div>
                            <small>Bs ${this.fmt(r.ventas_brutas_bs)}</small>
                        </div>
                        <div class="resumen-card">
                            <h4>Total Contado</h4>
                            <div class="val">$${this.fmt(r.total_contado_usd)}</div>
                        </div>
                        <div class="resumen-card">
                            <h4>Total Credito</h4>
                            <div class="val">$${this.fmt(r.total_credito_usd)}</div>
                        </div>
                        <div class="resumen-card">
                            <h4>Costo Total</h4>
                            <div class="val">$${this.fmt(r.total_costo)}</div>
                        </div>
                        <div class="resumen-card">
                            <h4>Transacciones</h4>
                            <div class="val">${r.total_transacciones}</div>
                        </div>
                    </div>
                    <h2 style="margin-top:10px;">Utilidades</h2>
                    <div class="resumen-grid">
                        <div class="resumen-card utilidad-contado">
                            <h4>Utilidad Contado</h4>
                            <div class="val">$${this.fmt(r.utilidad_contado)}</div>
                            <small>Margen: ${r.margen_contado}%</small>
                        </div>
                        <div class="resumen-card utilidad-credito">
                            <h4>Utilidad Credito</h4>
                            <div class="val">$${this.fmt(r.utilidad_credito)}</div>
                            <small>Margen: ${r.margen_credito}%</small>
                        </div>
                        <div class="resumen-card highlight">
                            <h4>Utilidad Total</h4>
                            <div class="val">$${this.fmt(r.utilidad_total)}</div>
                            <small>Margen: ${r.margen_utilidad}%</small>
                        </div>
                    </div>
                    ${r.total_descuentos_usd > 0 ? `<p class="nota">Descuentos aplicados: $${this.fmt(r.total_descuentos_usd)}</p>` : ''}
                    ${r.total_devoluciones_usd > 0 ? `<p class="nota">Devoluciones del dia: $${this.fmt(r.total_devoluciones_usd)}</p>` : ''}
                </div>
            `;
        }

        // Metodos de pago
        if (data.metodos_pago?.length) {
            const totalMp = data.metodos_pago.reduce((s, m) => s + (m.total_usd || 0), 0);
            cuerpo += `
                <div class="seccion">
                    <h2>Metodos de Pago</h2>
                    <table>
                        <thead><tr><th>Medio de Pago</th><th style="text-align:center;">Operaciones</th><th style="text-align:right;">Total Moneda</th><th style="text-align:right;">Total USD</th></tr></thead>
                        <tbody>
                            ${data.metodos_pago.map(m => `
                                <tr>
                                    <td>${m.medio}</td>
                                    <td style="text-align:center;">${m.cantidad_pagos}</td>
                                    <td style="text-align:right;">${m.moneda !== 'USD' ? `${this.fmt(m.total_moneda)} ${m.moneda}` : '-'}</td>
                                    <td style="text-align:right;font-weight:700;">$${this.fmt(m.total_usd)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="3" style="text-align:right;">TOTAL INGRESOS:</td>
                                <td style="text-align:right;">$${this.fmt(totalMp)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Recibos de caja
        if (data.recibos_caja?.length) {
            const totalRecibos = data.recibos_caja.reduce((s, r) => s + (r.total_usd || 0), 0);
            cuerpo += `
                <div class="seccion">
                    <h2>Recibos de Caja</h2>
                    <table>
                        <thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Factura</th><th style="text-align:center;">Hora</th><th>Cliente</th><th>Usuario</th><th style="text-align:right;">Total $</th><th style="text-align:center;">Tipo</th></tr></thead>
                        <tbody>
                            ${data.recibos_caja.map((r, i) => `
                                <tr>
                                    <td style="text-align:center;">${i + 1}</td>
                                    <td style="text-align:center;">F${String(r.numero_venta).padStart(8, '0')}</td>
                                    <td style="text-align:center;">${r.hora}</td>
                                    <td>${r.cliente}</td>
                                    <td>${r.usuario}</td>
                                    <td style="text-align:right;">$${this.fmt(r.total_usd)}</td>
                                    <td style="text-align:center;">${r.tipo === 'contado' ? 'Contado' : 'Credito'}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="5" style="text-align:right;">TOTAL:</td>
                                <td style="text-align:right;">$${this.fmt(totalRecibos)}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Ventas detalladas
        if (data.ventas_detalladas?.length) {
            let ventasHtml = '';
            let totalNetoGlobal = 0;
            for (const v of data.ventas_detalladas) {
                totalNetoGlobal += v.total_usd || 0;
                const prodsRows = v.productos.map(p => `
                    <tr>
                        <td>${p.nombre}</td>
                        <td style="text-align:right;">${this.fmtInt(p.cantidad)}</td>
                        <td style="text-align:right;">$${this.fmt(p.precio_unitario)}</td>
                        <td style="text-align:right;">$${this.fmt(p.subtotal)}</td>
                    </tr>
                `).join('');
                const pagosTexto = v.pagos.map(p => `${p.medio}: ${p.moneda === 'USD' ? '$' : 'Bs '}${this.fmt(p.monto)}`).join(' | ');
                ventasHtml += `
                    <div class="venta-detalle-bloque">
                        <div class="venta-detalle-header">
                            <strong>Venta #${v.numero_venta}</strong> &mdash; ${v.hora} &mdash; ${v.cliente} &mdash; ${v.tipo === 'contado' ? 'Contado' : 'Credito'}
                        </div>
                        <table class="tabla-interna">
                            <thead><tr><th>Producto</th><th style="text-align:right;">Cant.</th><th style="text-align:right;">P.Unit.</th><th style="text-align:right;">Subtotal</th></tr></thead>
                            <tbody>${prodsRows}</tbody>
                        </table>
                        <div class="venta-detalle-footer">
                            <span>Pagos: ${pagosTexto}</span>
                            <strong>Total: $${this.fmt(v.total_usd)}</strong>
                        </div>
                    </div>
                `;
            }
            cuerpo += `
                <div class="seccion">
                    <h2>Transacciones del Dia</h2>
                    ${ventasHtml}
                    <div class="total-general">Total Neto: $${this.fmt(totalNetoGlobal)}</div>
                </div>
            `;
        }

        // Productos vendidos
        if (data.productos_vendidos?.length) {
            const totalProd = data.productos_vendidos.reduce((s, p) => s + (p.total_usd || 0), 0);
            const totalCant = data.productos_vendidos.reduce((s, p) => s + (p.cantidad_total || 0), 0);
            cuerpo += `
                <div class="seccion">
                    <h2>Productos Vendidos</h2>
                    <table>
                        <thead><tr><th style="text-align:center;">#</th><th>Producto</th><th style="text-align:right;">Cantidad</th><th style="text-align:right;">Costo Total</th><th style="text-align:right;">Venta Total</th></tr></thead>
                        <tbody>
                            ${data.productos_vendidos.map((p, i) => `
                                <tr>
                                    <td style="text-align:center;">${i + 1}</td>
                                    <td><strong>${p.producto}</strong></td>
                                    <td style="text-align:right;">${this.fmtInt(p.cantidad_total)}</td>
                                    <td style="text-align:right;">$${this.fmt(p.costo_total)}</td>
                                    <td style="text-align:right;font-weight:700;">$${this.fmt(p.total_usd)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td></td>
                                <td>TOTALES</td>
                                <td style="text-align:right;">${this.fmtInt(totalCant)}</td>
                                <td></td>
                                <td style="text-align:right;">$${this.fmt(totalProd)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Cuentas por cobrar
        if (data.cuentas_por_cobrar?.length) {
            cuerpo += `
                <div class="seccion">
                    <h2>Cuentas por Cobrar Generadas</h2>
                    <table>
                        <thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Venta</th><th>Cliente</th><th style="text-align:right;">Monto</th><th style="text-align:right;">Saldo</th><th style="text-align:center;">Estado</th></tr></thead>
                        <tbody>
                            ${data.cuentas_por_cobrar.map((c, i) => `
                                <tr>
                                    <td style="text-align:center;">${i + 1}</td>
                                    <td style="text-align:center;">#${c.numero_venta}</td>
                                    <td>${c.cliente}</td>
                                    <td style="text-align:right;">$${this.fmt(c.monto_original_usd)}</td>
                                    <td style="text-align:right;">$${this.fmt(c.saldo_pendiente_usd)}</td>
                                    <td style="text-align:center;">${c.estado}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Devoluciones
        if (data.devoluciones?.length) {
            const totalDev = data.devoluciones.reduce((s, d) => s + (d.total_reintegrado_usd || 0), 0);
            cuerpo += `
                <div class="seccion">
                    <h2>Devoluciones del Dia</h2>
                    <table>
                        <thead><tr><th style="text-align:center;">#</th><th style="text-align:center;">Hora</th><th>Cliente</th><th>Motivo</th><th>Metodo</th><th style="text-align:right;">Total USD</th></tr></thead>
                        <tbody>
                            ${data.devoluciones.map((d, i) => `
                                <tr>
                                    <td style="text-align:center;">${i + 1}</td>
                                    <td style="text-align:center;">${d.fecha}</td>
                                    <td>${d.cliente}</td>
                                    <td>${d.motivo || '-'}</td>
                                    <td>${d.metodo_reintegro}</td>
                                    <td style="text-align:right;font-weight:700;">$${this.fmt(d.total_reintegrado_usd)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="5" style="text-align:right;">TOTAL DEVUELTO:</td>
                                <td style="text-align:right;">$${this.fmt(totalDev)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Venta del Dia - ${data.fecha}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 15px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #1d4f5f; padding-bottom: 12px; }
        .header-left h1 { font-size: 16px; color: #1d4f5f; margin-bottom: 2px; }
        .header-left p { font-size: 10px; color: #555; }
        .header-right { text-align: right; font-size: 10px; color: #555; }
        .seccion { margin-bottom: 18px; }
        .seccion h2 { font-size: 12px; color: #1d4f5f; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
        .resumen-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
        .resumen-card { background: #f0f5f3; border-radius: 6px; padding: 8px 10px; border-left: 3px solid #1d4f5f; }
        .resumen-card.highlight { background: #e8f0ec; border-left-color: #2d8f57; }
        .resumen-card.utilidad-contado { background: #e8f5ec; border-left-color: #2d8f57; }
        .resumen-card.utilidad-contado .val { color: #2d8f57; }
        .resumen-card.utilidad-credito { background: #f5f0e4; border-left-color: #b78a49; }
        .resumen-card.utilidad-credito .val { color: #8a6520; }
        .resumen-card h4 { font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 3px; }
        .resumen-card .val { font-size: 14px; font-weight: 800; color: #1d4f5f; }
        .resumen-card.highlight .val { color: #2d8f57; }
        .resumen-card small { font-size: 8px; color: #888; }
        .nota { font-size: 10px; color: #666; margin-top: 4px; font-style: italic; }
        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        th { background: #1d4f5f; color: #fff; padding: 6px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; font-size: 10px; }
        tr:nth-child(even) { background: #f8faf9; }
        .total-row { background: #1d4f5f !important; color: #fff; font-weight: 700; }
        .total-row td { border-bottom: none; padding: 8px; font-size: 11px; }
        .venta-detalle-bloque { margin-bottom: 12px; border: 1px solid #ddd; border-radius: 6px; padding: 8px; background: #fafdf9; }
        .venta-detalle-header { font-size: 10px; color: #1d4f5f; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #eee; }
        .venta-detalle-footer { display: flex; justify-content: space-between; font-size: 10px; margin-top: 6px; padding-top: 4px; border-top: 1px solid #eee; }
        .tabla-interna { margin-top: 4px; }
        .tabla-interna th { background: #2a7a8a; font-size: 8px; padding: 4px 6px; }
        .tabla-interna td { font-size: 9px; padding: 3px 6px; }
        .total-general { text-align: right; font-size: 13px; font-weight: 800; color: #1d4f5f; margin-top: 8px; padding: 8px; background: #eef5f0; border-radius: 6px; }
        .footer { margin-top: 15px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
        @media print {
            body { padding: 5mm; }
            .resumen-card, th, .total-row, tr:nth-child(even), .venta-detalle-bloque, .total-general { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>${empresa}</h1>
            ${rif ? `<p>RIF: ${rif}</p>` : ''}
            ${direccion ? `<p>${direccion}</p>` : ''}
            <p style="font-size:12px; font-weight:700; margin-top:6px; color:#1d4f5f;">Informe de Venta del Dia</p>
        </div>
        <div class="header-right">
            <p>Fecha del informe: ${data.fecha}</p>
            <p>Horario: ${data.hora_inicio} - ${data.hora_fin}</p>
            <p>Transacciones: ${data.total_transacciones}</p>
            <p style="margin-top:4px;">Generado: ${fechaStr} ${horaStr}</p>
        </div>
    </div>

    ${cuerpo}

    <div class="footer">
        Generado el ${fechaStr} a las ${horaStr} &mdash; ${empresa}
    </div>
</body>
</html>`;

        const ventana = window.open('', '_blank');
        if (ventana) {
            ventana.document.write(html);
            ventana.document.close();
            setTimeout(() => ventana.print(), 600);
        }
    }
};

window.InformesVentaDiaService = InformesVentaDiaService;
