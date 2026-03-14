// ============================================
// FUNCIONES DE INFORMES Y FILTROS
// ============================================

const InformesService = {
    obtenerValorFiltro(id) {
        const elemento = document.getElementById(id);
        return elemento ? elemento.value : '';
    },

    parsearFechaVenta(fechaTexto) {
        if (!fechaTexto) return null;

        const partes = fechaTexto.split(/[\/\s:]/);
        if (partes.length < 3) return null;

        let dia = parseInt(partes[0], 10);
        let mes = parseInt(partes[1], 10) - 1;
        let anio = parseInt(partes[2], 10);
        if (anio < 100) anio += 2000;

        const hora = partes.length > 3 ? parseInt(partes[3], 10) : 0;
        const min = partes.length > 4 ? parseInt(partes[4], 10) : 0;

        return new Date(anio, mes, dia, hora, min);
    },

    obtenerVentasFiltradas({ soloHoy = false, aplicarFecha = false } = {}) {
        const rolFiltro = this.obtenerValorFiltro('filtroRolInforme');
        const usuarioFiltro = this.obtenerValorFiltro('filtroUsuarioInforme');
        const inicioInput = this.obtenerValorFiltro('fechaInicioInforme');
        const finInput = this.obtenerValorFiltro('fechaFinInforme');

        let fechaInicio = null;
        let fechaFin = null;

        if (soloHoy) {
            const hoy = new Date();
            fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
            fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
        } else if (aplicarFecha) {
            if (!inicioInput || !finInput) {
                alert('Seleccione fechas de Inicio y Fin');
                return null;
            }

            fechaInicio = new Date(inicioInput + 'T00:00:00');
            fechaFin = new Date(finInput + 'T23:59:59');

            if (fechaInicio > fechaFin) {
                alert('La fecha final no puede ser menor a la inicial');
                return null;
            }
        }

        return AppState.ventas.filter(venta => {
            if (rolFiltro && (venta.usuario_rol || '') !== rolFiltro) return false;
            if (usuarioFiltro && (venta.usuario_username || '') !== usuarioFiltro) return false;
            if (!fechaInicio || !fechaFin) return true;

            const fechaVenta = this.parsearFechaVenta(venta.fecha);
            if (!fechaVenta) return false;

            return fechaVenta >= fechaInicio && fechaVenta <= fechaFin;
        });
    },

    actualizarOpcionesUsuarios() {
        const selectUsuario = document.getElementById('filtroUsuarioInforme');
        if (!selectUsuario) return;

        const valorActual = selectUsuario.value;
        const usuarios = [...new Set(
            (AppState.ventas || [])
                .map(venta => (venta.usuario_username || '').trim())
                .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b, 'es'));

        selectUsuario.innerHTML = `
            <option value="">Todos</option>
            ${usuarios.map(usuario => `<option value="${usuario}">${usuario}</option>`).join('')}
        `;

        if (usuarios.includes(valorActual)) {
            selectUsuario.value = valorActual;
        }
    },

    construirTitulo(baseTitulo) {
        const etiquetas = [];
        const rolFiltro = this.obtenerValorFiltro('filtroRolInforme');
        const usuarioFiltro = this.obtenerValorFiltro('filtroUsuarioInforme');

        if (rolFiltro) etiquetas.push(`Rol: ${rolFiltro}`);
        if (usuarioFiltro) etiquetas.push(`Usuario: ${usuarioFiltro}`);

        return etiquetas.length > 0 ? `${baseTitulo} - ${etiquetas.join(' | ')}` : baseTitulo;
    },

    cargarVentasDelDia() {
        this.actualizarOpcionesUsuarios();
        const ventasDelDia = this.obtenerVentasFiltradas({ soloHoy: true }) || [];
        this.mostrar(ventasDelDia, this.construirTitulo('Ventas de Hoy'));
    },

    cargarTodasLasVentas() {
        this.actualizarOpcionesUsuarios();
        const ventasFiltradas = this.obtenerVentasFiltradas() || [];
        this.mostrar(ventasFiltradas, this.construirTitulo('Todas las Ventas'));
    },

    filtrarPorFecha() {
        const filtradas = this.obtenerVentasFiltradas({ aplicarFecha: true });
        if (!filtradas) return;

        const fechaInicio = new Date(this.obtenerValorFiltro('fechaInicioInforme') + 'T00:00:00');
        const fechaFin = new Date(this.obtenerValorFiltro('fechaFinInforme') + 'T23:59:59');
        const label = `Del ${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}`;
        this.mostrar(filtradas, this.construirTitulo(label));
    },

    limpiarFiltros() {
        document.getElementById('fechaInicioInforme').value = '';
        document.getElementById('fechaFinInforme').value = '';

        const selectRol = document.getElementById('filtroRolInforme');
        const selectUsuario = document.getElementById('filtroUsuarioInforme');

        if (selectRol) selectRol.value = '';
        if (selectUsuario) selectUsuario.value = '';

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
                            <th style="padding: 15px; text-align: left;">Usuario</th>
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
                                    <td style="padding: 12px;">
                                        ${venta.usuario_username || 'Sin usuario'}
                                        <br><small style="color: #64748b;">${venta.usuario_rol || 'Sin rol'}</small>
                                    </td>
                                    <td style="padding: 12px;">${venta.cliente || 'Consumidor Final'}</td>
                                    <td style="padding: 12px;">
                                        ${typeof renderProductosVentaInforme === 'function' ? renderProductosVentaInforme(venta) : ((venta.productos || []).map(p => `${p.cantidad}x ${p.nombre}`).join('<br>') || 'Sin productos')}
                                        ${typeof obtenerResumenDevolucionVenta === 'function' ? obtenerResumenDevolucionVenta(venta) : ''}
                                    </td>
                                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">
                                        $${(venta.total_dolares || 0).toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #007bff;">
                                        Bs ${(venta.total_bolivares || 0).toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        ${typeof renderAccionesVentaInforme === 'function' ? renderAccionesVentaInforme(venta, numeroVenta) : ''}
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
