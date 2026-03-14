// Sistema de Ventas con Pagos Múltiples
// Este archivo ahora usa módulos separados en js/
const API_URL = "http://localhost:5000/api";

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async function () {
    verificarSesion();
    await cargarConfiguracion();
    await cargarProductos();
    await cargarDatosVentas();
    mostrarVentas();
    actualizarFecha();
    setInterval(actualizarFecha, 60000);

    // Configurar eventos generales
    document.getElementById('productoPrecioCosto').addEventListener('input', calcularPrecioVenta);
    document.getElementById('productoPorcentajeGanancia').addEventListener('input', calcularPrecioVenta);
    document.getElementById('productoPrecioDolares').addEventListener('input', () => {
        calcularPrecioBolivares();
        recalcularPorcentajeGanancia();
    });
    document.getElementById('productoPrecioBolivares').addEventListener('input', () => {
        calcularPrecioDolares();
        recalcularPorcentajeGanancia();
    });
    document.getElementById('formProducto').addEventListener('submit', guardarProducto);
    document.getElementById('buscarProducto').addEventListener('input', filtrarProductos);
    document.getElementById('buscarProducto').addEventListener('keydown', manejarTecladoBusqueda);
    document.getElementById('btnAgregarPago').addEventListener('click', agregarPago);

    // Cerrar sugerencias si se hace clic fuera
    // Cerrar sugerencias si se hace clic fuera
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.seleccion-productos')) {
            document.getElementById('sugerenciasProductos').style.display = 'none';
        }
    });

    // Inicializar Fechas con formato DD/MM/AAAA
    flatpickr("#fechaInicioInforme", {
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d/m/Y",
        locale: "es",
        allowInput: true
    });

    flatpickr("#fechaFinInforme", {
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d/m/Y",
        locale: "es",
        allowInput: true
    });
});

// Funciones de Configuración
async function cargarConfiguracion() {
    const config = await ApiService.cargarConfiguracion();

    if (config) {
        AppState.tasaDolar = config.tasaDolar;
        AppState.tasaVuelto = config.tasaVuelto;
        AppState.porcentajeGananciaDefecto = config.porcentajeGananciaDefecto;
        AppState.porcentajeDescuentoDolares = config.porcentajeDescuentoDolares;
        AppState.metodoRedondeoBs = config.metodoRedondeoBs;
        AppState.nombreEmpresa = config.nombreEmpresa || '';
        AppState.rifEmpresa = config.rifEmpresa || '';
        AppState.direccionEmpresa = config.direccionEmpresa || '';
        
        tasaDolar = AppState.tasaDolar;
        tasaVuelto = AppState.tasaVuelto;
        porcentajeGananciaDefecto = AppState.porcentajeGananciaDefecto;
        porcentajeDescuentoDolares = AppState.porcentajeDescuentoDolares;
        metodoRedondeoBs = AppState.metodoRedondeoBs;
    }
    actualizarInfoTasaHeader();
    actualizarEmpresaDisplay();
}

function actualizarInfoTasaHeader() {
    const info = document.getElementById('infoTasa');
    if (info) {
        info.innerHTML = `Venta: <strong>Bs ${tasaDolar.toFixed(2)}</strong> | Vuelto: <strong>Bs ${tasaVuelto.toFixed(2)}</strong> | G: <strong>${parseFloat(porcentajeGananciaDefecto).toFixed(4)}%</strong> | Bono: <strong>${porcentajeDescuentoDolares}%</strong>`;
    }
}

function abrirModalConfiguracion() {
    if (usuarioLogueado?.rol === 'cajero') {
        mostrarNotificacion('🔒 Solo el administrador puede cambiar la configuracion');
        return;
    }

    document.getElementById('configTasaDolar').value = tasaDolar;
    document.getElementById('configTasaVueltoGeneral').value = tasaVuelto;
    document.getElementById('configPorcentajeDescuentoModal').value = porcentajeDescuentoDolares;
    document.getElementById('configPorcentajeGananciaDefecto').value = porcentajeGananciaDefecto;
    
    document.getElementById('configNombreEmpresa').value = AppState.nombreEmpresa || '';
    document.getElementById('configRifEmpresa').value = AppState.rifEmpresa || '';
    document.getElementById('configDireccionEmpresa').value = AppState.direccionEmpresa || '';
    
    document.getElementById('modalConfiguracion').style.display = 'block';
}

function cerrarModalConfiguracion() {
    document.getElementById('modalConfiguracion').style.display = 'none';
}

function cerrarModalVuelto() {
    document.getElementById('modalVuelto').style.display = 'none';
    const info = document.getElementById('vueltoInfo');
    if (info) info.innerHTML = '';

    // Si hay una venta procesada, mostrar el recibo automáticamente
    if (ultimaVentaProcesada) {
        verReciboCompleto(ultimaVentaProcesada, ultimoNumeroVenta);
        ultimaVentaProcesada = null; // Limpiar para no repetir
    }
}

// FUNCIONES DE AUTENTICACION
function obtenerTabsPermitidos() {
    return usuarioLogueado?.rol === 'cajero' ? ['ventas'] : ['productos', 'ventas', 'proveedores', 'compras', 'informes'];
}

function aplicarPermisosUsuario() {
    const nombreUsuario = document.getElementById('nombreUsuarioDisplay');
    const rolUsuario = document.getElementById('rolUsuarioDisplay');
    const btnConfiguracion = document.getElementById('btnConfiguracion');
    const tabsPermitidos = obtenerTabsPermitidos();

    if (nombreUsuario && usuarioLogueado?.username) {
        nombreUsuario.textContent = usuarioLogueado.username;
    }

    if (rolUsuario) {
        rolUsuario.textContent = usuarioLogueado?.rol ? `(${usuarioLogueado.rol})` : '';
    }

    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.style.display = tabsPermitidos.includes(btn.dataset.tab) ? 'inline-flex' : 'none';
    });

    if (btnConfiguracion) {
        btnConfiguracion.style.display = usuarioLogueado?.rol === 'cajero' ? 'none' : 'inline-flex';
    }
}

function asegurarVistaInicialPorRol() {
    if (usuarioLogueado?.rol === 'cajero') {
        cambiarTab('ventas');
        return;
    }

    cambiarTab('productos');
}

function verificarSesion() {
    const sesion = localStorage.getItem('sesion_ventas');
    if (sesion) {
        usuarioLogueado = JSON.parse(sesion);
        AppState.usuarioLogueado = usuarioLogueado;
        document.getElementById('panelLogin').style.display = 'none';
        document.getElementById('panelPrincipal').style.display = 'block';
        aplicarPermisosUsuario();
        asegurarVistaInicialPorRol();
    } else {
        document.getElementById('panelLogin').style.display = 'flex';
        document.getElementById('panelPrincipal').style.display = 'none';
    }
}

async function manejarLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    const btn = e.target.querySelector('button');
    
    try {
        btn.disabled = true;
        btn.textContent = '⌛ Ingresando...';

        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            usuarioLogueado = data.user;
            AppState.usuarioLogueado = usuarioLogueado;
            localStorage.setItem('sesion_ventas', JSON.stringify(usuarioLogueado));
            verificarSesion();
            mostrarNotificacion('✅ Bienvenid@ al sistema');
        } else {
            alert('Login falló: ' + (data.message || 'Error de acceso'));
        }
    } catch (e) {
        alert('Error de conexión con el servidor.');
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Entrar al Sistema';
    }
}

function cerrarSesion() {
    if (confirm('¿Desea cerrar la sesión?')) {
        localStorage.removeItem('sesion_ventas');
        usuarioLogueado = null;
        AppState.usuarioLogueado = null;
        window.location.reload();
    }
}

async function guardarConfiguracion() {
    const nuevaTasa = parseFloat(document.getElementById('configTasaDolar').value);
    const nuevaTasaVuelto = parseFloat(document.getElementById('configTasaVueltoGeneral').value);
    const nuevoDesc = parseFloat(document.getElementById('configPorcentajeDescuentoModal').value) || 0;
    const nuevaGanancia = parseFloat(document.getElementById('configPorcentajeGananciaDefecto').value);
    
    const nombreEmpresa = document.getElementById('configNombreEmpresa').value;
    const rifEmpresa = document.getElementById('configRifEmpresa').value;
    const direccionEmpresa = document.getElementById('configDireccionEmpresa').value;

    const nuevaConfig = {
        tasaDolar: nuevaTasa,
        tasaVuelto: nuevaTasaVuelto,
        porcentajeGananciaDefecto: nuevaGanancia,
        porcentajeDescuentoDolares: Math.min(100, Math.max(0, nuevoDesc)),
        nombreEmpresa: nombreEmpresa,
        rifEmpresa: rifEmpresa,
        direccionEmpresa: direccionEmpresa
    };

    const guardado = await ApiService.guardarConfiguracion(nuevaConfig);
    if (!guardado) {
        mostrarNotificacion('⚠️ No se pudo guardar en el servidor');
        return;
    }

    tasaDolar = nuevaConfig.tasaDolar;
    tasaVuelto = nuevaConfig.tasaVuelto;
    porcentajeGananciaDefecto = nuevaConfig.porcentajeGananciaDefecto;
    porcentajeDescuentoDolares = nuevaConfig.porcentajeDescuentoDolares;
    metodoRedondeoBs = nuevaConfig.metodoRedondeoBs || 'none';

    AppState.tasaDolar = nuevaConfig.tasaDolar;
    AppState.tasaVuelto = nuevaConfig.tasaVuelto;
    AppState.porcentajeGananciaDefecto = nuevaConfig.porcentajeGananciaDefecto;
    AppState.porcentajeDescuentoDolares = nuevaConfig.porcentajeDescuentoDolares;
    AppState.metodoRedondeoBs = metodoRedondeoBs;
    
    AppState.nombreEmpresa = nombreEmpresa;
    AppState.rifEmpresa = rifEmpresa;
    AppState.direccionEmpresa = direccionEmpresa;

    actualizarInfoTasaHeader();
    actualizarEmpresaDisplay();
    actualizarCarrito();
    actualizarListaPagos();
    mostrarProductos();

    cerrarModalConfiguracion();
    mostrarNotificacion("⚙️ Configuración actualizada");
}

function actualizarEmpresaDisplay() {
    const nombre = AppState.nombreEmpresa || 'Mi Empresa';
    const rif = AppState.rifEmpresa || '';
    
    const nombreEl = document.getElementById('nombreEmpresaDisplay');
    const rifEl = document.getElementById('rifEmpresaDisplay');
    
    if (nombreEl) nombreEl.textContent = nombre;
    if (rifEl) rifEl.textContent = rif ? `RIF: ${rif}` : '';
}



async function actualizarTasaBCV() {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;

    try {
        btn.innerHTML = '⌛...';
        btn.disabled = true;

        // Intento 1: API Directa
        let response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');

        // Si falla la API principal, intentamos nuestro Backend (Scraping BCV)
        if (!response.ok) {
            console.warn("API principal falló, intentando respaldo en backend...");
            response = await fetch('http://localhost:5000/api/config/tasa-bcv');
        }

        if (!response.ok) throw new Error('Ambos servicios de tasa fallaron');

        const data = await response.json();
        const tasaOficial = parseFloat(data.promedio);

        if (tasaOficial > 0) {
            // Solo actualizar la Tasa de Venta, no la de Vuelto
            document.getElementById('configTasaDolar').value = tasaOficial.toFixed(2);
            mostrarNotificacion(`✅ Tasa BCV obtenida (${data.fuente || 'API'}): Bs ${tasaOficial.toFixed(2)}`);
        }
    } catch (error) {
        console.error('Error BCV:', error);
        mostrarNotificacion('❌ Error: No se pudo obtener la tasa oficial del BCV');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function actualizarFecha() {
    const fecha = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('fechaActual').textContent = fecha.toLocaleDateString('es-ES', opciones);
}

function aplicarRedondeoBs(monto, metodo = 'none') {
    if (metodo === 'none') return monto;

    switch (metodo) {
        case 'no_decimals':
            return Math.round(monto);
        case 'five_cents':
            return Math.round(monto / 0.05) * 0.05;
        case 'unit_up':
            return Math.ceil(monto);
        case 'five_units':
            return Math.ceil(monto / 5) * 5;
        case 'ten_up':
            return Math.ceil(monto / 10) * 10;
        case 'hundred_up':
            return Math.ceil(monto / 100) * 100;
        default:
            return monto;
    }
}

// Funciones de Productos
async function cargarProductos() {
    AppState.productos = await ApiService.cargarProductos();
    productos = AppState.productos;
    mostrarProductos();
}

async function guardarProducto(e) {
    if (e) e.preventDefault();
    const id = parseInt(document.getElementById('productoId').value);
    const idServidor = document.getElementById('productoId').getAttribute('data-server-id');

    const codigoInput = document.getElementById('productoCodigo');
    const codigo = codigoInput.value || `PROD-${(productos.length + 1).toString().padStart(4, '0')}`;
    const nombre = document.getElementById('productoNombre').value;
    const descripcion = document.getElementById('productoDescripcion').value;
    const precioCosto = parseFloat(document.getElementById('productoPrecioCosto').value) || 0;
    const porcentajeGanancia = parseFloat(document.getElementById('productoPorcentajeGanancia').value) || 0;
    const precioDolares = parseFloat(document.getElementById('productoPrecioDolares').value);
    const categoria = document.getElementById('productoCategoria').value;
    const metodoRedondeo = document.getElementById('productoMetodoRedondeo').value;

    const producto = {
        codigo, nombre, descripcion,
        precio_costo: precioCosto,
        porcentaje_ganancia: porcentajeGanancia,
        precio_dolares: precioDolares,
        cantidad: 0, categoria,
        metodo_redondeo: metodoRedondeo
    };

    try {
        const url = idServidor ? `${API_URL}/productos/${idServidor}` : `${API_URL}/productos/`;
        const method = idServidor ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...API.getAuthHeaders() },
            body: JSON.stringify(producto)
        });

        if (res.ok) {
            mostrarNotificacion(idServidor ? '✅ Producto actualizado en servidor' : '✅ Producto creado en servidor');
            await cargarProductos(); // Recargar todo
            cerrarModalProducto();
            return;
        }
        mostrarNotificacion('⚠️ No se pudo guardar el producto en el servidor');
    } catch (e) {
        mostrarNotificacion('⚠️ No se pudo guardar el producto en el servidor');
    }
}

async function eliminarProducto(index) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
        const prod = productos[index];
        if (!prod.id) {
            mostrarNotificacion('⚠️ El producto no existe en el servidor');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/productos/${prod.id}`, {
                method: 'DELETE',
                headers: API.getAuthHeaders()
            });
            if (!res.ok) {
                mostrarNotificacion('⚠️ No se pudo eliminar el producto');
                return;
            }

            await cargarProductos();
            mostrarNotificacion('✅ Producto eliminado');
        } catch (e) {
            console.error('No se pudo eliminar en servidor', e);
            mostrarNotificacion('⚠️ No se pudo eliminar el producto');
        }
    }
}

async function cargarDatosVentas() {
    AppState.ventas = await ApiService.cargarVentas();
    ventas = AppState.ventas;
    if (typeof InformesService !== 'undefined' && typeof InformesService.actualizarOpcionesUsuarios === 'function') {
        InformesService.actualizarOpcionesUsuarios();
    }
}



function mostrarProductos(productosAMostrar = null) {
    const grid = document.getElementById('productosGrid');
    const lista = productosAMostrar || productos;

    if (lista.length === 0) {
        grid.innerHTML = '<div class="mensaje-vacio" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">' +
            (productos.length === 0 ? '📦 No hay productos registrados' : '🔍 No se encontraron coincidencias') +
            '</div>';
        return;
    }

    grid.innerHTML = lista.map((producto) => {
        // Encontrar el índice original en el array 'productos' para que los botones de editar/eliminar funcionen
        const originalIndex = productos.findIndex(p => p.codigo === producto.codigo);
        const precioBsDinamico = aplicarRedondeoBs(producto.precio_dolares * tasaDolar, producto.metodo_redondeo || 'none');

        // Calcular precio con descuento (Promo $)
        let htmlPromo = '';
        if (porcentajeDescuentoDolares > 0) {
            const precioPromo = producto.precio_dolares * (1 - (porcentajeDescuentoDolares / 100));
            htmlPromo = `
                <div class="precio-promo" style="color: #28a745; font-weight: bold; font-size: 0.95em; margin-top: 5px; background: #e8f5e9; padding: 4px 8px; border-radius: 4px; display: inline-block;">
                    🏷️ Promo $: $${precioPromo.toFixed(2)}
                </div>
            `;
        }

        return `
            <div class="producto-card">
                <div class="producto-header">
                    <h3>${producto.nombre}</h3>
                    <span class="producto-codigo">${producto.codigo}</span>
                </div>
                <div class="producto-descripcion">${producto.descripcion}</div>
                <div class="producto-precios">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span class="precio-dolar">💵 $${producto.precio_dolares.toFixed(2)}</span>
                        <span class="precio-bolivar">💶 Bs ${precioBsDinamico.toFixed(2)}</span>
                        ${htmlPromo}
                    </div>
                </div>
                <div class="producto-stock">
                    <span>📦 Stock: ${producto.cantidad}</span>
                    ${producto.cantidad < 5 ? '<span class="stock-bajo">⚠️ Stock bajo</span>' : ''}
                </div>
                <div class="producto-categoria">📂 ${producto.categoria}</div>
                <div class="producto-acciones">
                    <button class="btn-agregar-carrito" onclick="agregarAlCarrito(${originalIndex})">
                        🛒 Agregar al carrito
                    </button>
                    <button class="btn-editar" onclick="editarProducto(${originalIndex})">
                        ✏️ Editar
                    </button>
                    <button class="btn-eliminar" onclick="eliminarProducto(${originalIndex})">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filtrarProductosGestion() {
    const termino = document.getElementById('buscarProductoGestion').value.toLowerCase();

    if (!termino) {
        mostrarProductos();
        return;
    }

    const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(termino) ||
        p.codigo.toLowerCase().includes(termino) ||
        p.descripcion.toLowerCase().includes(termino) ||
        p.categoria.toLowerCase().includes(termino)
    );

    mostrarProductos(filtrados);
}

function mostrarFormularioProducto() {
    document.getElementById('modalTitulo').textContent = 'Nuevo Producto';
    document.getElementById('formProducto').reset();
    document.getElementById('productoId').value = '-1';
    document.getElementById('productoPorcentajeGanancia').value = porcentajeGananciaDefecto;
    document.getElementById('productoMetodoRedondeo').value = 'none'; // Default sin redondeo
    document.getElementById('productoCantidad').value = 0;
    document.getElementById('productoCodigo').disabled = false; // Habilitar para nuevos productos
    document.getElementById('modalProducto').style.display = 'block';
}

function calcularPrecioVenta() {
    const costo = parseFloat(document.getElementById('productoPrecioCosto').value) || 0;
    const porcentaje = parseFloat(document.getElementById('productoPorcentajeGanancia').value) || 0;

    if (costo > 0) {
        const precioVenta = costo * (1 + (porcentaje / 100));
        document.getElementById('productoPrecioDolares').value = precioVenta.toFixed(2);
        calcularPrecioBolivares();
    }
}

function calcularPrecioBolivares() {
    const precioDolares = parseFloat(document.getElementById('productoPrecioDolares').value) || 0;
    const metodo = document.getElementById('productoMetodoRedondeo').value;
    const precioBs = aplicarRedondeoBs(precioDolares * tasaDolar, metodo);
    document.getElementById('productoPrecioBolivares').value = precioBs ? precioBs.toFixed(2) : '';
}

function recalcularPorcentajeGanancia() {
    const costo = parseFloat(document.getElementById('productoPrecioCosto').value) || 0;
    const precioVenta = parseFloat(document.getElementById('productoPrecioDolares').value) || 0;

    if (costo > 0 && precioVenta > 0) {
        const porcentaje = ((precioVenta / costo) - 1) * 100;
        document.getElementById('productoPorcentajeGanancia').value = porcentaje.toFixed(4);
    }
}

function calcularPrecioDolares() {
    const precioBs = parseFloat(document.getElementById('productoPrecioBolivares').value) || 0;
    const precioDolares = precioBs / tasaDolar;
    document.getElementById('productoPrecioDolares').value = precioDolares ? precioDolares.toFixed(2) : '';
}



function editarProducto(index) {
    const producto = productos[index];

    document.getElementById('modalTitulo').textContent = 'Editar Producto';
    document.getElementById('productoId').value = index;
    // Guardar el ID del servidor si existe
    if (producto.id) {
        document.getElementById('productoId').setAttribute('data-server-id', producto.id);
    } else {
        document.getElementById('productoId').removeAttribute('data-server-id');
    }

    document.getElementById('productoCodigo').value = producto.codigo;
    document.getElementById('productoCodigo').disabled = true;
    document.getElementById('productoNombre').value = producto.nombre;
    document.getElementById('productoDescripcion').value = producto.descripcion;
    document.getElementById('productoPrecioCosto').value = producto.precio_costo || '';
    document.getElementById('productoPorcentajeGanancia').value = producto.porcentaje_ganancia || '';
    document.getElementById('productoPrecioDolares').value = producto.precio_dolares;
    document.getElementById('productoMetodoRedondeo').value = producto.metodo_redondeo || 'none';
    calcularPrecioBolivares();
    document.getElementById('productoCantidad').value = producto.cantidad;
    document.getElementById('productoCategoria').value = producto.categoria;

    document.getElementById('modalProducto').style.display = 'block';
}



function cerrarModalProducto() {
    document.getElementById('modalProducto').style.display = 'none';
}

// Funciones del Carrito
function agregarAlCarrito(productoIndex) {
    const producto = productos[productoIndex];

    if (producto.cantidad <= 0) {
        alert('❌ Producto sin stock disponible');
        return;
    }

    // Verificar si ya está en el carrito
    const existente = carrito.find(item => item.productoIndex === productoIndex);

    if (existente) {
        if (existente.cantidad < producto.cantidad) {
            existente.cantidad++;
            existente.subtotal_dolares = existente.precio_dolares * existente.cantidad;
        } else {
            alert('❌ No hay suficiente stock');
            return;
        }
    } else {
        carrito.push({
            productoIndex: productoIndex,
            producto_id: producto.id,
            nombre: producto.nombre,
            precio_dolares: producto.precio_dolares,
            cantidad: 1,
            subtotal_dolares: producto.precio_dolares
        });
    }

    actualizarCarrito();
    mostrarNotificacion('🛒 Producto agregado al carrito');
}

function manejarTecladoBusqueda(e) {
    if (resultadosBusqueda.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (indiceSeleccionado < resultadosBusqueda.length - 1) {
            indiceSeleccionado++;
            actualizarSeleccionVisual();
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (indiceSeleccionado > 0) {
            indiceSeleccionado--;
            actualizarSeleccionVisual();
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (indiceSeleccionado !== -1) {
            seleccionarProducto(resultadosBusqueda[indiceSeleccionado].index);
        } else {
            agregarProductoPorEnter();
        }
    }
}

function actualizarSeleccionVisual() {
    const items = document.querySelectorAll('.sugerencia-item');
    items.forEach((item, index) => {
        if (index === indiceSeleccionado) {
            item.classList.add('seleccionado');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('seleccionado');
        }
    });
}

function filtrarProductos(e) {
    const texto = e.target.value.toLowerCase();
    const sugerencias = document.getElementById('sugerenciasProductos');

    indiceSeleccionado = -1; // Resetear selección

    if (texto.length === 0) {
        sugerencias.style.display = 'none';
        resultadosBusqueda = [];
        return;
    }

    resultadosBusqueda = productos.map((producto, index) => ({ producto, index }))
        .filter(item =>
            item.producto.cantidad > 0 && (
                item.producto.nombre.toLowerCase().includes(texto) ||
                item.producto.codigo.toLowerCase().includes(texto) ||
                item.producto.descripcion.toLowerCase().includes(texto)
            )
        );

    if (resultadosBusqueda.length > 0) {
        sugerencias.innerHTML = resultadosBusqueda.map((item, i) => `
            <div class="sugerencia-item" onclick="seleccionarProducto(${item.index})" data-index="${i}">
                <strong>${item.producto.nombre}</strong> <small>(${item.producto.codigo})</small>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span style="color: #28a745;">$${item.producto.precio_dolares.toFixed(2)}</span>
                    <span style="color: #6c757d;">Stock: ${item.producto.cantidad}</span>
                </div>
            </div>
        `).join('');
        sugerencias.style.display = 'block';
    } else {
        sugerencias.innerHTML = '<div class="sugerencia-item" style="cursor: default;">No se encontraron productos</div>';
        sugerencias.style.display = 'block';
        resultadosBusqueda = [];
    }
}

function seleccionarProducto(index) {
    agregarAlCarrito(index);
    document.getElementById('buscarProducto').value = '';
    document.getElementById('sugerenciasProductos').style.display = 'none';
}

function actualizarCarrito() {
    const tbody = document.getElementById('carritoBody');
    let totalDolares = 0;

    if (carrito.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">🛒 Carrito vacío</td></tr>';
    } else {
        tbody.innerHTML = carrito.map((item, index) => {
            totalDolares += item.subtotal_dolares;
            const prodOriginal = productos[item.productoIndex];
            const metodo = prodOriginal.metodo_redondeo || 'none';

            const precioBs = aplicarRedondeoBs(item.precio_dolares * tasaDolar, metodo);
            const subtotalBs = aplicarRedondeoBs(item.subtotal_dolares * tasaDolar, metodo);

            return `
                <tr>
                    <td>${item.nombre}</td>
                    <td>$${item.precio_dolares.toFixed(2)}</td>
                    <td>Bs ${precioBs.toFixed(2)}</td>
                    <td>
                        <input type="number" min="1" max="${productos[item.productoIndex].cantidad}" 
                               value="${item.cantidad}" onchange="actualizarCantidadCarrito(${index}, this.value)" 
                               style="width: 60px; padding: 5px;">
                    </td>
                    <td style="font-weight: bold;">$${item.subtotal_dolares.toFixed(2)}</td>
                    <td style="font-weight: bold; color: #007bff;">Bs ${subtotalBs.toFixed(2)}</td>
                    <td>
                        <button class="btn-eliminar-item" onclick="eliminarDelCarrito(${index})">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const totalBs = carrito.reduce((sum, item) => {
        const prodOriginal = productos[item.productoIndex];
        return sum + aplicarRedondeoBs(item.subtotal_dolares * tasaDolar, prodOriginal.metodo_redondeo || 'none');
    }, 0);

    document.getElementById('totalDolares').textContent = `$${totalDolares.toFixed(2)}`;
    document.getElementById('totalBolivares').textContent = `Bs ${totalBs.toFixed(2)}`;

    // Actualizar resumen de pagos
    actualizarResumenPagos(totalDolares, totalBs);
}

function actualizarCantidadCarrito(index, cantidad) {
    cantidad = parseInt(cantidad);
    const producto = productos[carrito[index].productoIndex];

    if (cantidad > producto.cantidad) {
        alert(`❌ Solo hay ${producto.cantidad} unidades disponibles`);
        cantidad = producto.cantidad;
    }

    if (cantidad < 1) {
        eliminarDelCarrito(index);
        return;
    }

    carrito[index].cantidad = cantidad;
    carrito[index].subtotal_dolares = producto.precio_dolares * cantidad;
    actualizarCarrito();
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

function limpiarCarrito() {
    if (confirm('¿Vaciar el carrito y pagos?')) {
        reiniciarVenta();
    }
}

// ============================================
// FUNCIONES DE PAGOS MÚLTIPLES
// ============================================

function agregarPago() {
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

    // Determinar si el pago es en dólares o bolívares
    const esDolares = medioPago.includes('Dólares');

    const pago = {
        medio: medioPago,
        monto: monto,
        esDolares: esDolares,
        fecha: new Date().toLocaleTimeString()
    };

    pagos.push(pago);
    actualizarListaPagos();

    // Limpiar campos
    document.getElementById('medioPago').value = '';
    document.getElementById('montoPago').value = '';

    mostrarNotificacion(`✅ Pago de ${esDolares ? '$' : 'Bs'} ${monto.toFixed(2)} agregado`);
}

function actualizarListaPagos() {
    const listaPagos = document.getElementById('listaPagos');

    // Total a pagar (suma de productos) en ambas monedas para mantener consistencia con el redondeo
    const totalVenta = carrito.reduce((sum, item) => sum + item.subtotal_dolares, 0);
    const totalVentaBs = carrito.reduce((sum, item) => {
        const prodOriginal = productos[item.productoIndex];
        return sum + aplicarRedondeoBs(item.subtotal_dolares * tasaDolar, prodOriginal.metodo_redondeo || 'none');
    }, 0);

    // Tasa efectiva de esta venta específica (considerando redondeos individuales)
    const tasaEfectiva = totalVenta > 0 ? (totalVentaBs / totalVenta) : tasaDolar;

    // Variables de cálculo acumulativo
    let deudaPendiente = totalVenta;
    let totalReconocidoDolares = 0;
    let descuentoAcumulado = 0;
    let ultimaMonedaCompletoDeuda = 'USD'; // Por defecto

    // Crear lista ordenada: Primero Dólares para priorizar bonos/descuentos
    const pagosOrdenados = [...pagos].sort((a, b) => (b.esDolares ? 1 : 0) - (a.esDolares ? 1 : 0));

    // Recalcular pagos con lógica secuencial de cobertura de deuda
    pagosOrdenados.forEach(pago => {
        let valorReconocido = 0;
        let descuentoEstePago = 0;

        const deudaAntesDeEstePago = deudaPendiente;

        if (pago.esDolares) {
            // Si hay descuento configurado y AÚN hay deuda
            if (porcentajeDescuentoDolares > 0 && deudaPendiente > 0.01) {
                // Cuánto valor máximo podría cubrir este pago completo con descuento
                const factor = 1 - (porcentajeDescuentoDolares / 100);
                const valorPotencial = pago.monto / factor;

                if (valorPotencial > deudaPendiente) {
                    // El pago excede la deuda: 
                    // 1. Parte que cubre la deuda (con descuento)
                    const costoFisicoParaDeuda = deudaPendiente * factor;

                    // 2. Parte sobrante (sin descuento, nominal)
                    const sobranteFisico = pago.monto - costoFisicoParaDeuda;

                    // Valor reconocido = Deuda cubierta + Sobrante nominal
                    valorReconocido = deudaPendiente + sobranteFisico;
                    descuentoEstePago = deudaPendiente - costoFisicoParaDeuda;

                    deudaPendiente = 0; // Deuda saldada
                } else {
                    // El pago no cubre toda la deuda o es exacto
                    valorReconocido = valorPotencial;
                    descuentoEstePago = valorReconocido - pago.monto;
                    deudaPendiente -= valorReconocido;
                }
            } else {
                // Sin descuento o deuda ya saldada (es puro vuelto/saldo a favor)
                valorReconocido = pago.monto;
                descuentoEstePago = 0;
                deudaPendiente = Math.max(0, deudaPendiente - valorReconocido);
            }
        } else {
            // Bolívares a Dólares (usando tasa efectiva de la venta)
            valorReconocido = pago.monto / tasaEfectiva;
            descuentoEstePago = 0; // No hay descuento en Bs
            deudaPendiente = Math.max(0, deudaPendiente - valorReconocido);
        }

        // Guardamos valores calculados
        pago.valorReconocido = valorReconocido;
        pago.descuentoAplicado = descuentoEstePago;

        // Si este pago completó o excedió la deuda pendiente, guardamos su moneda
        if (deudaAntesDeEstePago > 0.01 && valorReconocido >= deudaAntesDeEstePago - 0.01) {
            ultimaMonedaCompletoDeuda = pago.esDolares ? 'USD' : 'BS';
        }

        totalReconocidoDolares += valorReconocido;
        descuentoAcumulado += descuentoEstePago;
    });

    // Actualizar variable global
    descuentoTotal = descuentoAcumulado;

    const pendienteDolares = Math.max(0, totalVenta - totalReconocidoDolares);
    const pendienteBs = pendienteDolares * tasaEfectiva;

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
                // Es dólar pero no aplicó descuento (porque ya estaba pagado)
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

    // Actualizar Resumen de Totales (pendiente)
    const elementoPendienteDolares = document.getElementById('pendienteDolares');
    if (elementoPendienteDolares) elementoPendienteDolares.textContent = `$${pendienteDolares.toFixed(2)}`;

    const elementoPendienteBs = document.getElementById('pendienteBs');
    if (elementoPendienteBs) elementoPendienteBs.textContent = `Bs ${pendienteBs.toFixed(2)}`;

    // Actualizar Resumen de Totales (pagado)
    const totalPagadoDolaresDisplay = pagos.filter(p => p.esDolares).reduce((sum, p) => sum + p.monto, 0);
    const totalPagadoBsDisplay = pagos.filter(p => !p.esDolares).reduce((sum, p) => sum + p.monto, 0);

    const elPagadoUSD = document.getElementById('totalPagadoDolares');
    if (elPagadoUSD) elPagadoUSD.textContent = `$${totalPagadoDolaresDisplay.toFixed(2)}`;

    const elPagadoBS = document.getElementById('totalPagadoBs');
    if (elPagadoBS) elPagadoBS.textContent = `Bs ${totalPagadoBsDisplay.toFixed(2)}`;

    // Mostrar el Ahorro y Total a Pagar Real en la cabecera del resumen si hay ahorro
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

    // Habilitar/deshabilitar botón
    const btnProcesar = document.getElementById('btnProcesarVenta');
    if (pendienteDolares <= 0.01) {
        btnProcesar.disabled = false;
        btnProcesar.classList.add('btn-success');
        btnProcesar.classList.remove('btn-disabled');
        // Atributo temporal para saber qué moneda sugerir
        btnProcesar.setAttribute('data-moneda-sugerida', ultimaMonedaCompletoDeuda);
    } else {
        btnProcesar.disabled = true;
        btnProcesar.classList.remove('btn-success');
        btnProcesar.classList.add('btn-disabled');
        btnProcesar.removeAttribute('data-moneda-sugerida');
    }

    // Y necesitamos actualizar el resumen general también para mostrar el descuento global si se quiere
    // Pero como el descuento ahora es por pago, el "Total Venta" original se mantiene,
    // lo que baja es el "Falta por Pagar".
    // Sin embargo, para consistencia visual, podríamos mostrar el "Total con Descuento Proyectado" si todo fuera en dólares...
    // Mejor dejemos el Total Venta quieto y mostremos el descuento en los pagos.
}

function eliminarPago(index) {
    pagos.splice(index, 1);
    actualizarListaPagos();
}

// Eliminar aplicarDescuento ya no se usa

function actualizarResumenPagos(totalDolares, totalBs) {
    document.getElementById('totalVentaDolares').textContent = `$${totalDolares.toFixed(2)}`;
    document.getElementById('totalVentaBs').textContent = `Bs ${totalBs.toFixed(2)}`;

    // Recalcular pendientes
    actualizarListaPagos();
}

// ============================================
// PROCESAR VENTA CON PAGOS MÚLTIPLES
// ============================================

function procesarVenta() {
    if (carrito.length === 0) {
        mostrarNotificacion('❌ El carrito está vacío');
        return;
    }

    // Total real de la venta (precio de lista)
    const totalVenta = carrito.reduce((sum, item) => sum + item.subtotal_dolares, 0);
    // Total en bolívares considerando los redondeos individuales de cada producto
    const totalVentaBs = carrito.reduce((sum, item) => {
        const prodOriginal = productos[item.productoIndex];
        return sum + aplicarRedondeoBs(item.subtotal_dolares * tasaDolar, prodOriginal.metodo_redondeo || 'none');
    }, 0);

    // Tasa efectiva (importante para que los pagos en Bs coincidan con lo mostrado en pantalla)
    const tasaEfectiva = totalVenta > 0 ? (totalVentaBs / totalVenta) : tasaDolar;

    if (pagos.length === 0 && totalVenta > 0) { // Si hay venta en 0 (regalo), pasa
        mostrarNotificacion('❌ Debe agregar al menos un pago');
        return;
    }

    // Calcular montos reales y reconocidos usando lógica de deuda pendiente
    let deudaPendiente = totalVenta;
    let totalPagadoRealDolares = 0;
    let totalPagadoRealBs = 0;
    let totalReconocidoDolares = 0;
    let descuentoTotalGenerado = 0;
    let excedenteUSD = 0; // Excedente originado en pagos USD
    let excedenteBS = 0;  // Excedente originado en pagos BS

    // IMPORTANTE: Ordenar pagos para que el descuento se aplique primero a los dólares
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
                    // Pago excede deuda: Parte con descuento + Sobrante nominal
                    const costoFisicoParaDeuda = deudaPendiente * factor;
                    const sobranteFisico = p.monto - costoFisicoParaDeuda;

                    valorReconocido = deudaPendiente + sobranteFisico;
                    descuentoPago = deudaPendiente - costoFisicoParaDeuda;
                    excedenteUSD += sobranteFisico; // Atribución correcta del vuelto USD
                    deudaPendiente = 0;
                } else {
                    // Pago cubre parcial o justo
                    valorReconocido = valorPotencial;
                    descuentoPago = valorReconocido - p.monto;
                    deudaPendiente -= valorReconocido;
                }
            } else {
                // Sin bono o deuda ya saldada
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
                excedenteBS += sobranteBS; // Atribución correcta del vuelto BS
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

    // Verificación de pago completo
    if (totalReconocidoDolares < totalVenta - 0.05) { // Pequeña tolerancia para redondeo
        mostrarNotificacion(`❌ Falta pagar (Valor reconocido)`);
        return;
    }

    // Calcular excedente total reconocido para la lógica de entrega de vuelto
    const excedenteTotalUSD = Math.max(0, totalReconocidoDolares - totalVenta);

    // Crear el objeto de venta base
    ventaEnProgreso = {
        fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        cliente: document.getElementById('cliente').value || 'Cliente General',
        productos: carrito.map(item => ({
            producto_id: item.producto_id,
            nombre: item.nombre,
            cantidad: item.cantidad,
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
        excedenteUSD: excedenteUSD,
        excedenteBS: excedenteBS,
        excedenteTotalUSD: excedenteTotalUSD
    };

    if (excedenteTotalUSD > 0.01) {
        const monedaSugerida = document.getElementById('btnProcesarVenta').getAttribute('data-moneda-sugerida') || 'USD';
        abrirModalGestionVuelto(ventaEnProgreso, monedaSugerida);
    } else {
        terminarProcesoVenta(ventaEnProgreso, '');
    }
}

// --- Soporte para Gestión de Vuelto Multimoneda ---

function abrirModalGestionVuelto(venta, monedaSugerida = 'USD') {
    vueltosAgregados = [];
    const tasaAct = parseFloat(document.getElementById('tasaVuelto')?.value) || tasaVuelto;

    // Mostramos la atribución real: lo que físicamente sobró
    document.getElementById('montoExcedenteVuelto').textContent = `$${venta.excedenteUSD.toFixed(2)}`;
    document.getElementById('montoExcedenteVueltoBs').textContent = `Bs ${venta.excedenteBS.toFixed(2)}`;

    document.getElementById('tasaVuelto').value = tasaVuelto;
    document.getElementById('montoEntregaVuelto').value = '';

    // Resetear moneda predeterminada según sugerencia (si el último pago fue BS, sugerir BS)
    const radios = document.getElementsByName('monedaVuelto');
    if (monedaSugerida === 'BS') {
        radios[1].checked = true; // Bolívares
        actualizarMetodosVuelto('BS');
    } else {
        radios[0].checked = true; // USD
        actualizarMetodosVuelto('USD');
    }

    actualizarUIGestionVuelto();
    sugerirMontoVuelto();
    document.getElementById('modalGestionVuelto').style.display = 'block';
}

function sugerirMontoVuelto() {
    if (!ventaEnProgreso) return;

    const totalEntregadoUSD = vueltosAgregados.reduce((sum, v) => sum + v.valorEnDolares, 0);
    const faltanteTotalUSD = Math.max(0, ventaEnProgreso.excedenteTotalUSD - totalEntregadoUSD);

    if (faltanteTotalUSD <= 0.001) {
        document.getElementById('montoEntregaVuelto').value = '';
        return;
    }

    const moneda = document.querySelector('input[name="monedaVuelto"]:checked').value;
    const tasa = parseFloat(document.getElementById('tasaVuelto').value) || tasaVuelto;

    // Lógica Inteligente de Sugerencia:
    if (vueltosAgregados.length === 0) {
        // Primera sugerencia: Intentar devolver exactamente lo que sobró en esa moneda
        if (moneda === 'BS' && ventaEnProgreso.excedenteBS > 0.01) {
            document.getElementById('montoEntregaVuelto').value = ventaEnProgreso.excedenteBS.toFixed(2);
        } else if (moneda === 'USD' && ventaEnProgreso.excedenteUSD > 0.01) {
            document.getElementById('montoEntregaVuelto').value = ventaEnProgreso.excedenteUSD.toFixed(2);
        } else {
            // Conversión cruzada si no coincide la moneda o no hay excedente puro en esa moneda
            const sugerencia = (moneda === 'USD') ? faltanteTotalUSD : (faltanteTotalUSD * tasa);
            document.getElementById('montoEntregaVuelto').value = sugerencia.toFixed(2);
        }
    } else {
        // Sugerencias posteriores basadas en el faltante total
        const sugerencia = (moneda === 'USD') ? faltanteTotalUSD : (faltanteTotalUSD * tasa);
        document.getElementById('montoEntregaVuelto').value = sugerencia.toFixed(2);
    }

    actualizarUIGestionVuelto();
}

function actualizarMetodosVuelto(moneda) {
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
    sugerirMontoVuelto();
}

function actualizarConversionesVuelto() {
    // Si el usuario cambia la tasa, sugerimos el nuevo monto en Bs
    const moneda = document.querySelector('input[name="monedaVuelto"]:checked').value;
    if (moneda === 'BS') {
        sugerirMontoVuelto();
    } else {
        actualizarUIGestionVuelto();
    }
}

function agregarVueltoALista() {
    const moneda = document.querySelector('input[name="monedaVuelto"]:checked').value;
    const metodo = document.getElementById('metodoEntregaVuelto').value;
    const monto = parseFloat(document.getElementById('montoEntregaVuelto').value);
    const tasa = parseFloat(document.getElementById('tasaVuelto').value) || tasaVuelto;

    if (isNaN(monto) || monto <= 0) {
        mostrarNotificacion("❌ Ingrese un monto válido");
        return;
    }

    let valorEnDolares = 0;
    if (moneda === 'USD') {
        valorEnDolares = monto;
    } else {
        if (tasa <= 0) {
            mostrarNotificacion("❌ Ingrese una tasa válida");
            return;
        }
        valorEnDolares = monto / tasa;
    }

    // Calcular cuánto falta para no excederse (opcional, pero mejor dejar que el usuario decida)
    const excedenteTotal = ventaEnProgreso.excedenteReconocido;
    const yaEntregado = vueltosAgregados.reduce((sum, v) => sum + v.valorEnDolares, 0);
    const faltante = excedenteTotal - yaEntregado;

    // Si el usuario intenta entregar más de lo que falta por un margen pequeño, lo ajustamos o avisamos
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
    actualizarUIGestionVuelto();
    sugerirMontoVuelto();
}

function eliminarVueltoDeLista(index) {
    vueltosAgregados.splice(index, 1);
    actualizarUIGestionVuelto();
}

function actualizarUIGestionVuelto() {
    const excUSD = ventaEnProgreso.excedenteUSD;
    const excBS = ventaEnProgreso.excedenteBS;
    const tasaActual = parseFloat(document.getElementById('tasaVuelto').value) || tasaVuelto;

    // Total excedente en términos de la tasa actual del modal
    const totalTargetUSD = excUSD + (excBS / tasaActual);

    const totalEntregadoUSD = vueltosAgregados.reduce((sum, v) => sum + v.valorEnDolares, 0);
    const faltanteUSD = Math.max(0, totalTargetUSD - totalEntregadoUSD);

    document.getElementById('montoEntregadoVuelto').textContent = `$${totalEntregadoUSD.toFixed(2)}`;
    document.getElementById('montoEntregadoVueltoBs').textContent = `Bs ${(totalEntregadoUSD * tasaActual).toFixed(2)}`;
    document.getElementById('montoFaltanteVuelto').textContent = `$${faltanteUSD.toFixed(2)}`;
    document.getElementById('montoFaltanteVueltoBs').textContent = `Bs ${(faltanteUSD * tasaActual).toFixed(2)}`;

    // Preview de lo que se está escribiendo ahora
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
}

function finalizarVentaSinVuelto() {
    if (confirm('¿Está seguro de finalizar la venta sin entregar el vuelto excedente?')) {
        document.getElementById('modalGestionVuelto').style.display = 'none';
        terminarProcesoVenta(ventaEnProgreso, 'Venta finalizada sin vuelto entregado');
    }
}

function confirmarVuelto() {
    const totalExcedente = ventaEnProgreso.excedenteReconocido;
    const totalEntregadoUSD = vueltosAgregados.reduce((sum, v) => sum + v.valorEnDolares, 0);

    // Si no ha entregado nada y hay excedente, preguntar
    if (vueltosAgregados.length === 0 && totalExcedente > 0.01) {
        if (!confirm('No ha registrado ninguna entrega de vuelto. ¿Desea finalizar la venta de todas formas?')) {
            return;
        }
    }

    // Registrar cada vuelto en los pagos de la venta
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

    let mensaje = "";
    if (vueltosAgregados.length > 0) {
        mensaje = "Vuelto entregado en: " + vueltosAgregados.map(v => `${v.moneda} ${v.monto.toFixed(2)}`).join(', ');
    }

    document.getElementById('modalGestionVuelto').style.display = 'none';
    terminarProcesoVenta(ventaEnProgreso, mensaje);
}

async function terminarProcesoVenta(venta, mensajeVuelto) {
    try {
        const payload = {
            ...venta,
            vueltos_entregados: vueltosAgregados
        };
        const res = await fetch(`${API_URL}/ventas/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...API.getAuthHeaders() },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            mostrarNotificacion('✅ Venta guardada en servidor');
            await cargarProductos(); // Sincronizar stock real desde backend
            await cargarDatosVentas();
            // Guardar para mostrar recibo después
            ultimaVentaProcesada = { ...venta, vueltos_entregados: vueltosAgregados };
            ultimoNumeroVenta = ventas.length;
        } else {
            mostrarNotificacion('⚠️ No se pudo guardar la venta en el servidor');
            return;
        }
    } catch (e) {
        mostrarNotificacion('⚠️ No se pudo guardar la venta en el servidor');
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
    }

    reiniciarVenta();
    mostrarVentas();
    ventaEnProgreso = null;
}

function reiniciarVenta() {
    carrito = [];
    pagos = [];
    descuentoTotal = 0;
    indiceSeleccionado = -1;

    // Limpiar campos de entrada
    const elCliente = document.getElementById('cliente');
    if (elCliente) elCliente.value = '';

    const elBusqueda = document.getElementById('buscarProducto');
    if (elBusqueda) elBusqueda.value = '';

    const elSugerencias = document.getElementById('sugerenciasProductos');
    if (elSugerencias) elSugerencias.innerHTML = '';

    const elMontoPago = document.getElementById('montoPago');
    if (elMontoPago) elMontoPago.value = '';

    const elMedioPago = document.getElementById('medioPago');
    if (elMedioPago) elMedioPago.selectedIndex = 0;

    // Resetear textos de totales y ahorros explícitamente
    const elAhorro = document.getElementById('ahorroVentaRealTime');
    if (elAhorro) elAhorro.textContent = '-$0.00';

    const elTotalReal = document.getElementById('totalAPagarRealTime');
    if (elTotalReal) elTotalReal.textContent = '$0.00';

    const elVueltoBs = document.getElementById('montoCalculadoBs');
    if (elVueltoBs) elVueltoBs.textContent = 'Bs 0.00';

    // Actualizar interfaz
    actualizarCarrito();
    actualizarListaPagos();

    // Actualizar historial si existe
    if (typeof mostrarVentas === 'function') mostrarVentas();

    // Enfocar buscador para la siguiente venta
    if (elBusqueda) elBusqueda.focus();
}

function generarRecibo(venta, vuelto) {
    const fecha = new Date().toLocaleString();
    let productosHTML = venta.productos.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td style="text-align: center;">${p.cantidad}</td>
            <td style="text-align: right;">$${p.precio_unitario_dolares.toFixed(2)}</td>
            <td style="text-align: right;">$${p.subtotal_dolares.toFixed(2)}</td>
        </tr>
    `).join('');

    let pagosHTML = venta.pagos.map(p => `
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
            
            <h4 style="margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Productos:</h4>
            <table style="width: 100%; font-size: 0.9em;">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th style="text-align: center;">Cant.</th>
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
                ${vuelto ? `<p style="color: green; font-weight: bold;">${vuelto}</p>` : ''}
            </div>
            
            <p style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #666;">
                ¡Gracias por su compra!<br>
                Fecha: ${fecha}
            </p>
        </div>
    `;

    // Mostrar en una nueva ventana
    const ventanaRecibo = window.open('', '_blank');
    ventanaRecibo.document.write(reciboHTML);
    ventanaRecibo.document.close();
    ventanaRecibo.focus();

    // Imprimir automáticamente
    setTimeout(() => {
        ventanaRecibo.print();
    }, 1000);
}

// ============================================
// HISTORIAL DE VENTAS
// ============================================

function mostrarHistorialVentas() {
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
                        <strong>Venta #${index + 1}</strong><br>
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
                            ${p.cantidad} x ${p.nombre} = $${(p.subtotal_dolares || 0).toFixed(2)}
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
}

function mostrarVentas() {
    const ventasDiv = document.getElementById('ventasRecientes');
    if (!ventasDiv) return;

    if (ventas.length === 0) {
        ventasDiv.innerHTML = '<div class="mensaje-vacio">No hay ventas registradas</div>';
        return;
    }

    // Mostrar las últimas 5 ventas
    const ventasRecientes = ventas.slice(-5).reverse();
    ventasDiv.innerHTML = ventasRecientes.map((venta, index) => `
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
}

// ============================================
// UTILIDADES
// ============================================

function mostrarNotificacion(mensaje) {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.textContent = mensaje;
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notificacion);

    // Eliminar después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notificacion);
        }, 300);
    }, 3000);
}

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================
// NAVEGACIÓN DE TABS
// ============================================

function cambiarTab(tabName) {
    if (usuarioLogueado && !obtenerTabsPermitidos().includes(tabName)) {
        mostrarNotificacion('🔒 Este usuario solo puede usar el POS de ventas');
        return;
    }

    // Ocultar todos los paneles
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
    });

    // Desactivar todos los botones
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Activar el panel seleccionado
    let panelId = '';
    switch (tabName) {
        case 'productos':
            panelId = 'panelProductos';
            break;
        case 'ventas':
            panelId = 'panelVentas';
            break;
        case 'proveedores':
            panelId = 'panelProveedores';
            if (typeof ProveedoresModule !== 'undefined') {
                setTimeout(() => ProveedoresModule.init(), 100);
            }
            break;
        case 'compras':
            panelId = 'panelCompras';
            console.log('Cambiando a compras, ComprasModule existe:', typeof ComprasModule !== 'undefined');
            if (typeof ComprasModule !== 'undefined') {
                setTimeout(() => {
                    console.log('Ejecutando ComprasModule.init()');
                    ComprasModule.init();
                }, 100);
            } else {
                console.error('ComprasModule no está definido');
            }
            break;
        case 'informes':
            panelId = 'panelInformes';
            cargarTodasLasVentas(); // Cargar informes al abrir
            break;
    }

    // Ocultar todos los paneles primero
    document.querySelectorAll('.tab-panel').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });

    const panel = document.getElementById(panelId);
    console.log('Panel:', panelId, panel);
    if (panel) {
        panel.style.display = 'block';
        panel.classList.add('active');
    } else {
        console.error('No se encontró el panel:', panelId);
    }

    // Activar el botón correspondiente
    const activeButton = Array.from(buttons).find(btn => btn.dataset.tab === tabName);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// ============================================
// FUNCIONES DE INFORMES (delegadas al módulo InformesService)
// ============================================

function cargarVentasDelDia() {
    InformesService.cargarVentasDelDia();
}

function cargarTodasLasVentas() {
    InformesService.cargarTodasLasVentas();
}

function filtrarInformesPorFecha() {
    InformesService.filtrarPorFecha();
}

function limpiarFiltrosFecha() {
    InformesService.limpiarFiltros();
}

function mostrarInformes(ventasFiltradas, titulo) {
    InformesService.mostrar(ventasFiltradas, titulo);
}

function obtenerTimestampFecha(venta) {
    if (!venta.fecha) return 0;
    const fechaStr = venta.fecha;
    const partes = fechaStr.split(/[\/\s:]/);
    if (partes.length >= 3) {
        let dia = parseInt(partes[0], 10);
        let mes = parseInt(partes[1], 10) - 1;
        let anio = parseInt(partes[2], 10);
        if (anio < 100) anio += 2000;
        const hora = partes.length > 3 ? parseInt(partes[3], 10) : 0;
        const min = partes.length > 4 ? parseInt(partes[4], 10) : 0;
        return new Date(anio, mes, dia, hora, min).getTime();
    }
    return 0;
}

function obtenerVentaPorId(ventaId) {
    return ventas.find(v => v.id === ventaId);
}

function escaparAtributoHtml(valor) {
    return String(valor || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function obtenerResumenDevolucionVenta(venta) {
    const devoluciones = venta.devoluciones || [];
    if (devoluciones.length === 0) return '';

    return `
        <div style="margin-top: 6px; padding: 6px 8px; background: #fff4e8; border: 1px solid #ffd8a8; border-radius: 6px; color: #9a3412; font-size: 0.82em;">
            ↩️ ${devoluciones.length} devolución(es) | Reintegrado: $${(venta.total_devuelto_dolares || 0).toFixed(2)}
        </div>
    `;
}

function renderProductosVentaInforme(venta) {
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
}

function renderAccionesVentaInforme(venta, numeroVenta) {
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
}

function limpiarFiltrosFecha() {
    InformesService.limpiarFiltros();
}

function cargarTodasLasVentas() {
    InformesService.cargarTodasLasVentas();
}

function filtrarInformesPorFecha() {
    InformesService.filtrarPorFecha();
}

function mostrarInformes(ventasFiltradas, titulo) {
    InformesService.mostrar(ventasFiltradas, titulo);
}

function verDetallesPago(venta, numeroVenta) {
    // Si venta es un string (viene de JSON.stringify), parsearlo
    if (typeof venta === 'string') {
        venta = JSON.parse(venta);
    }

    let detalleHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px; max-width: 500px;">
            <h3 style="margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                Detalles de Pago - Venta #${numeroVenta}
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

    // Crear modal
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
    modal.onclick = (e) => {
        if (e.target === modal) cerrarDetallePago();
    };

    document.body.appendChild(modal);
}

function cerrarDetallePago() {
    const modal = document.getElementById('modalDetallePago');
    if (modal) {
        document.body.removeChild(modal);
    }
}

function abrirModalDevolucion(ventaId) {
    const venta = obtenerVentaPorId(ventaId);
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
            <div><strong>Venta ID:</strong><br>${venta.id}</div>
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
                    data-nombre="${escaparAtributoHtml(producto.nombre)}"
                    data-precio="${producto.precio_unitario_dolares || 0}"
                    oninput="actualizarResumenDevolucion()"
                >
            </div>
        </div>
    `).join('');

    renderListaReintegrosDevolucion();
    sincronizarFormularioReintegro();
    actualizarResumenDevolucion();
    document.getElementById('modalDevolucion').style.display = 'block';
}

function cerrarModalDevolucion() {
    document.getElementById('modalDevolucion').style.display = 'none';
    devolucionActiva = null;
    reintegrosDevolucion = [];
}

function sincronizarFormularioReintegro() {
    const moneda = document.getElementById('devolucionMonedaReintegro').value;
    const inputTasa = document.getElementById('devolucionTasaReintegro');
    if (moneda === 'USD') {
        inputTasa.value = tasaDolar.toFixed(2);
    } else if (!parseFloat(inputTasa.value || '0')) {
        inputTasa.value = tasaDolar.toFixed(2);
    }
    actualizarVistaFormularioReintegro();
}

function actualizarVistaFormularioReintegro() {
    const moneda = document.getElementById('devolucionMonedaReintegro').value;
    const monto = parseFloat(document.getElementById('devolucionMontoReintegro').value || '0') || 0;
    const tasa = parseFloat(document.getElementById('devolucionTasaReintegro').value || '0') || 0;
    const equivalenteUSD = moneda === 'BS' ? (tasa > 0 ? monto / tasa : 0) : monto;
    document.getElementById('devolucionVistaFormulario').textContent = `${moneda} ${monto.toFixed(2)} equivalen a $${equivalenteUSD.toFixed(2)}`;
}

function agregarReintegroDevolucion() {
    const metodo = document.getElementById('devolucionMetodoReintegro').value;
    const moneda = document.getElementById('devolucionMonedaReintegro').value;
    const monto = parseFloat(document.getElementById('devolucionMontoReintegro').value || '0') || 0;
    const tasa = parseFloat(document.getElementById('devolucionTasaReintegro').value || '0') || 0;

    if (monto <= 0) {
        alert('Ingrese un monto de reintegro válido');
        return;
    }
    if (moneda === 'BS' && tasa <= 0) {
        alert('Ingrese una tasa válida para el reintegro en bolívares');
        return;
    }

    const equivalenteUSD = moneda === 'BS' ? monto / tasa : monto;
    reintegrosDevolucion.push({
        metodo,
        moneda,
        monto: roundAmount(monto),
        tasa: moneda === 'BS' ? roundAmount(tasa) : 0,
        equivalente_usd: roundAmount(equivalenteUSD),
    });

    document.getElementById('devolucionMontoReintegro').value = '';
    renderListaReintegrosDevolucion();
    actualizarVistaFormularioReintegro();
    actualizarResumenDevolucion();
}

function eliminarReintegroDevolucion(index) {
    reintegrosDevolucion.splice(index, 1);
    renderListaReintegrosDevolucion();
    actualizarResumenDevolucion();
}

function renderListaReintegrosDevolucion() {
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
}

function roundAmount(value) {
    return Math.round((parseFloat(value || '0') || 0) * 100) / 100;
}

function obtenerItemsDevolucionSeleccionados() {
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
            subtotal: cantidadFinal * parseFloat(input.dataset.precio || '0'),
        };
    }).filter(item => item.cantidad > 0);
}

function actualizarResumenDevolucion() {
    const items = obtenerItemsDevolucionSeleccionados();
    const totalUSD = roundAmount(items.reduce((sum, item) => sum + item.subtotal, 0));
    const entregadoUSD = roundAmount(reintegrosDevolucion.reduce((sum, item) => sum + (item.equivalente_usd || 0), 0));
    const entregadoBS = roundAmount(reintegrosDevolucion.filter(item => item.moneda === 'BS').reduce((sum, item) => sum + item.monto, 0));
    const diferenciaUSD = roundAmount(totalUSD - entregadoUSD);

    document.getElementById('devolucionTotalUSD').textContent = `$${totalUSD.toFixed(2)}`;
    document.getElementById('devolucionEntregadoUSD').textContent = `$${entregadoUSD.toFixed(2)}`;
    document.getElementById('devolucionEntregadoBS').textContent = `Bs ${entregadoBS.toFixed(2)}`;
    document.getElementById('devolucionFaltanteUSD').textContent = `${diferenciaUSD >= 0 ? '$' : '-$'}${Math.abs(diferenciaUSD).toFixed(2)}`;
    document.getElementById('btnGuardarDevolucion').disabled = items.length === 0 || reintegrosDevolucion.length === 0 || Math.abs(diferenciaUSD) > 0.05;
}

async function guardarDevolucionVenta() {
    if (!devolucionActiva) return;

    const items = obtenerItemsDevolucionSeleccionados();
    if (items.length === 0) {
        alert('Seleccione al menos un producto para devolver');
        return;
    }

    if (reintegrosDevolucion.length === 0) {
        alert('Debe agregar al menos una entrega de reintegro');
        return;
    }

    const totalUSD = roundAmount(items.reduce((sum, item) => sum + item.subtotal, 0));
    const entregadoUSD = roundAmount(reintegrosDevolucion.reduce((sum, item) => sum + (item.equivalente_usd || 0), 0));
    if (Math.abs(totalUSD - entregadoUSD) > 0.05) {
        alert('El total de reintegro no coincide con la devolución');
        return;
    }

    const payload = {
        motivo: document.getElementById('devolucionMotivo').value.trim(),
        reintegros: reintegrosDevolucion.map(item => ({
            metodo: item.metodo,
            moneda: item.moneda,
            monto: item.monto,
            tasa: item.tasa,
        })),
        items: items.map(item => ({
            detalle_venta_id: item.detalle_venta_id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
        })),
    };

    const btnGuardar = document.getElementById('btnGuardarDevolucion');
    const textoOriginal = btnGuardar.textContent;

    try {
        btnGuardar.disabled = true;
        btnGuardar.textContent = '⌛ Registrando...';

        const respuesta = await ApiService.registrarDevolucionVenta(devolucionActiva.id, payload);
        const ventaId = devolucionActiva.id;

        cerrarModalDevolucion();
        await cargarProductos();
        await cargarDatosVentas();
        mostrarVentas();
        cargarTodasLasVentas();

        const ventaActualizada = obtenerVentaPorId(ventaId) || devolucionActiva;
        mostrarNotificacion('✅ Devolución registrada con reintegro');
        verTicketDevolucion(respuesta.devolucion, ventaActualizada);
    } catch (e) {
        alert(`No se pudo registrar la devolución: ${e.message || 'Error inesperado'}`);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = textoOriginal;
    }
}

function verTicketDevolucion(devolucion, venta) {
    const detalles = (devolucion.detalles || []).map(detalle => `
        <div style="margin-bottom: 8px; font-size: 0.85em;">
            <div style="display: flex; justify-content: space-between;">
                <span>${detalle.producto_nombre}</span>
                <span>${detalle.cantidad} x $${(detalle.precio_unitario_dolares || 0).toFixed(2)}</span>
            </div>
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
                <div>Venta #${devolucion.venta_id}</div>
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

    abrirVentanaImpresionTicket(html, 'Ticket de devolución');
}

function abrirVentanaImpresionTicket(ticketHtml, titulo) {
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
}

// ============================================
// VER RECIBO COMPLETO
// ============================================

function verReciboCompleto(venta, numeroVenta) {
    // Si venta es un string (viene de JSON.stringify), parsearlo
    if (typeof venta === 'string') {
        venta = JSON.parse(venta);
    }

    // Calcular totales de pagos
    let totalPagadoDolares = 0;
    let totalPagadoBs = 0;

    venta.pagos.forEach(pago => {
        if (pago.moneda === 'USD') {
            totalPagadoDolares += pago.monto;
        } else {
            totalPagadoBs += pago.monto;
        }
    });

    let reciboHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px; max-width: 350px; font-family: 'Courier New', monospace; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <!-- Encabezado del ticket -->
            <div style="text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 10px;">
                <div style="font-size: 1.4em; font-weight: bold; margin-bottom: 5px;">RECIBO</div>
                <div style="font-size: 0.9em;">Venta #${numeroVenta}</div>
                <div style="font-size: 0.85em; margin-top: 3px;">${venta.id ? new Date(venta.id).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : venta.fecha}</div>
            </div>
            
            <!-- Cliente -->
            <div style="margin-bottom: 10px; font-size: 0.9em;">
                <strong>Cliente:</strong> ${venta.cliente}
            </div>
            
            <div style="border-bottom: 2px dashed #333; margin-bottom: 10px;"></div>
            
            <!-- Productos -->
            <div style="margin-bottom: 10px;">
                <div style="font-weight: bold; margin-bottom: 5px; text-align: center;">PRODUCTOS</div>
                ${venta.productos.map(p => `
                    <div style="margin-bottom: 8px; font-size: 0.85em;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="flex: 1;">${p.nombre}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                            <span>${p.cantidad} x $${p.precio_unitario_dolares.toFixed(2)}</span>
                            <span style="font-weight: bold;">$${p.subtotal_dolares.toFixed(2)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="border-bottom: 2px dashed #333; margin-bottom: 10px;"></div>
            
            <!-- Totales -->
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
            </div>
            
            <div style="border-bottom: 2px dashed #333; margin-bottom: 10px;"></div>
            
            <!-- Medios de Pago -->
            <div style="margin-bottom: 10px;">
                <div style="font-weight: bold; margin-bottom: 5px; text-align: center;">MEDIOS DE PAGO</div>
                ${venta.pagos.map(p => `
                    <div style="margin-bottom: 4px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.85em;">
                            <span>${p.medio}</span>
                            <span style="font-weight: bold;">${p.moneda} ${Math.abs(p.monto).toFixed(2)}</span>
                        </div>
                        ${(p.descuento_aplicado && Math.abs(p.descuento_aplicado) > 0.001) ? `
                        
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div style="border-bottom: 2px dashed #333; margin-bottom: 10px;"></div>
            
            <!-- Pie del ticket -->
            <div style="text-align: center; font-size: 0.85em; margin-bottom: 15px;">
                <div style="margin-bottom: 3px;">¡Gracias por su compra!</div>
                <div style="font-size: 0.8em; color: #666;">Vuelva pronto</div>
            </div>
            
            <!-- Botones de acción -->
            <div style="display: flex; gap: 8px; justify-content: center; margin-top: 15px;">
                <button onclick="imprimirTicket()" style="padding: 10px 20px; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.9em;">
                    🖨️ Imprimir
                </button>
                <button onclick="cerrarReciboCompleto()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.9em;">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'modalReciboCompleto';
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
    modal.onclick = (e) => {
        if (e.target === modal) cerrarReciboCompleto();
    };

    document.body.appendChild(modal);
}

function cerrarReciboCompleto() {
    const modal = document.getElementById('modalReciboCompleto');
    if (modal) {
        document.body.removeChild(modal);
    }
}

function imprimirTicket() {
    const modal = document.getElementById('modalReciboCompleto');
    if (!modal) return;

    // Obtener el contenido del ticket sin los botones
    const ticketContent = modal.querySelector('div > div');
    if (!ticketContent) return;
    abrirVentanaImpresionTicket(ticketContent.innerHTML, 'Ticket de Venta');
}

// Función para agregar producto con Enter
function agregarProductoPorEnter() {
    const input = document.getElementById('buscarProducto');
    const texto = input.value.trim().toLowerCase();

    if (texto === '') return;

    // 1. Buscar coincidencia exacta por CÓDIGO primero (prioridad máxima)
    const indexPorCodigo = productos.findIndex(p => p.codigo.toLowerCase() === texto && p.cantidad > 0);

    if (indexPorCodigo !== -1) {
        seleccionarProducto(indexPorCodigo);
        return;
    }

    // 2. Si no es exacto, buscar en los resultados filtrados
    const resultados = productos.map((producto, index) => ({ producto, index }))
        .filter(item =>
            item.producto.cantidad > 0 && (
                item.producto.nombre.toLowerCase().includes(texto) ||
                item.producto.codigo.toLowerCase().includes(texto) ||
                item.producto.descripcion.toLowerCase().includes(texto)
            )
        );

    // Si hay resultados, agregar el primero
    if (resultados.length > 0) {
        seleccionarProducto(resultados[0].index);
    } else {
        mostrarNotificacion('❌ Producto no encontrado o sin stock');
    }
}
