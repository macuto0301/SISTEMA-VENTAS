// ============================================
// FUNCIONES DE INFORMES Y FILTROS
// ============================================

const InformesService = {
    cargarVentasDelDia() {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        const hoyStr = `${dia}/${mes}/${anio}`;
        
        const ventasDelDia = AppState.ventas.filter(venta => {
            if (!venta.fecha) return false;
            return venta.fecha.startsWith(hoyStr);
        });
        
        this.mostrar(ventasDelDia, 'Ventas de Hoy');
    },

    cargarTodasLasVentas() {
        this.mostrar(AppState.ventas, 'Todas las Ventas');
    },

    filtrarPorFecha() {
        const inicioInput = document.getElementById('fechaInicioInforme').value;
        const finInput = document.getElementById('fechaFinInforme').value;

        if (!inicioInput || !finInput) {
            alert("Seleccione fechas de Inicio y Fin");
            return;
        }

        const fechaInicio = new Date(inicioInput + 'T00:00:00');
        const fechaFin = new Date(finInput + 'T23:59:59');

        if (fechaInicio > fechaFin) {
            alert("La fecha final no puede ser menor a la inicial");
            return;
        }

        const filtradas = AppState.ventas.filter(v => {
            if (!v.fecha) return false;
            
            const partes = v.fecha.split(/[\/\s:]/);
            if (partes.length < 3) return false;
            
            let dia = parseInt(partes[0], 10);
            let mes = parseInt(partes[1], 10) - 1;
            let anio = parseInt(partes[2], 10);
            if (anio < 100) anio += 2000;
            
            const hora = partes.length > 3 ? parseInt(partes[3], 10) : 0;
            const min = partes.length > 4 ? parseInt(partes[4], 10) : 0;
            
            const fechaVenta = new Date(anio, mes, dia, hora, min);
            
            return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
        });

        const label = `Del ${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}`;
        this.mostrar(filtradas, label);
    },

    limpiarFiltros() {
        document.getElementById('fechaInicioInforme').value = '';
        document.getElementById('fechaFinInforme').value = '';
        this.cargarTodasLasVentas();
    },

    mostrar(ventasFiltradas, titulo) {
        const resumenDiv = document.getElementById('resumenVentas');
        const tablaDiv = document.getElementById('tablaInformes');

        if (!ventasFiltradas || ventasFiltradas.length === 0) {
            if (resumenDiv) resumenDiv.innerHTML = '<div class="mensaje-vacio">No hay ventas registradas</div>';
            if (tablaDiv) tablaDiv.innerHTML = '';
            return;
        }

        const totalDolares = ventasFiltradas.reduce((sum, v) => sum + (v.total_dolares || 0), 0);
        const totalBs = ventasFiltradas.reduce((sum, v) => sum + (v.total_bolivares || 0), 0);
        const totalVentas = ventasFiltradas.length;
        const promedioDolares = totalVentas > 0 ? totalDolares / totalVentas : 0;
        const promedioBs = totalVentas > 0 ? totalBs / totalVentas : 0;

        if (resumenDiv) {
            resumenDiv.innerHTML = `
                <h3>${titulo}</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px;">
                        <div style="font-size: 0.9em; opacity: 0.9;">Total Ventas</div>
                        <div style="font-size: 2em; font-weight: bold;">${totalVentas}</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px;">
                        <div style="font-size: 0.9em; opacity: 0.9;">Total en Dólares</div>
                        <div style="font-size: 2em; font-weight: bold;">$${totalDolares.toFixed(2)}</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px;">
                        <div style="font-size: 0.9em; opacity: 0.9;">Total en Bolívares</div>
                        <div style="font-size: 2em; font-weight: bold;">Bs ${totalBs.toFixed(2)}</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 10px;">
                        <div style="font-size: 0.9em; opacity: 0.9;">Promedio por Venta</div>
                        <div style="font-size: 1.5em; font-weight: bold;">$${promedioDolares.toFixed(2)}</div>
                        <div style="font-size: 0.8em; opacity: 0.9;">Bs ${promedioBs.toFixed(2)}</div>
                    </div>
                </div>
            `;
        }

        const ventasInvertidas = [...ventasFiltradas].reverse();

        if (tablaDiv) {
            tablaDiv.innerHTML = `
                <table style="width: 100%; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <thead style="background: #667eea; color: white;">
                        <tr>
                            <th style="padding: 15px; text-align: left;">#</th>
                            <th style="padding: 15px; text-align: left;">Fecha</th>
                            <th style="padding: 15px; text-align: left;">Cliente</th>
                            <th style="padding: 15px; text-align: left;">Productos</th>
                            <th style="padding: 15px; text-align: right;">Total $</th>
                            <th style="padding: 15px; text-align: right;">Total Bs</th>
                            <th style="padding: 15px; text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ventasInvertidas.map((venta, idx) => {
                            const numeroVenta = ventasFiltradas.length - idx;
                            return `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 12px; font-weight: bold;">${numeroVenta}</td>
                                    <td style="padding: 12px;">${venta.fecha || 'S/F'}</td>
                                    <td style="padding: 12px;">${venta.cliente || 'Consumidor Final'}</td>
                                    <td style="padding: 12px;">
                                        ${(venta.productos || []).map(p => `${p.cantidad}x ${p.nombre}`).join('<br>') || 'Sin productos'}
                                    </td>
                                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">
                                        $${(venta.total_dolares || 0).toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #007bff;">
                                        Bs ${(venta.total_bolivares || 0).toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                                            <button onclick='verDetallesPago(${JSON.stringify(venta)}, ${numeroVenta})' class="btn-small" style="padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">
                                                Ver Pagos
                                            </button>
                                            <button onclick='verReciboCompleto(${JSON.stringify(venta)}, ${numeroVenta})' class="btn-small" style="padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">
                                                Ver Recibo
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }
    }
};
