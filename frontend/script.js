// Sistema de Ventas con Pagos Múltiples
// Este archivo ahora usa módulos separados en js/
const API_URL = "http://localhost:5000/api";
const API_ORIGIN = API_URL.replace(/\/api$/, '');
const MAX_PRODUCT_IMAGES = 5;
const PRICE_LIST_NUMBERS = [1, 2, 3];
let productoFotosSeleccionadas = [];
let productoFotosExistentes = [];
const clienteFotosState = {
    perfil: { currentUrl: '', currentPath: '', objectUrl: '', remove: false },
    cedula: { currentUrl: '', currentPath: '', objectUrl: '', remove: false }
};

const ProductoGaleria = {
    imagenes: [],
    titulo: '',
    indice: 0,
    zoom: 1,
    minZoom: 1,
    maxZoom: 3,
    zoomStep: 0.25,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    panX: 0,
    panY: 0,
    dragStartPanX: 0,
    dragStartPanY: 0,

    abrir(imagenes = [], indice = 0, titulo = 'Producto') {
        this.imagenes = Array.isArray(imagenes) ? imagenes.filter(Boolean) : [];
        this.titulo = titulo || 'Producto';
        this.indice = Math.max(0, Math.min(indice, this.imagenes.length - 1));
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;

        if (!this.imagenes.length) return;

        const modal = document.getElementById('modalGaleriaProducto');
        if (!modal) return;

        modal.style.display = 'block';
        this.render();
        this.actualizarZoom();
    },

    cerrar() {
        const modal = document.getElementById('modalGaleriaProducto');
        if (modal) {
            modal.style.display = 'none';
        }
        this.terminarArrastre();
        this.resetZoom();
    },

    siguiente() {
        if (this.imagenes.length <= 1) return;
        this.indice = (this.indice + 1) % this.imagenes.length;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
    },

    anterior() {
        if (this.imagenes.length <= 1) return;
        this.indice = (this.indice - 1 + this.imagenes.length) % this.imagenes.length;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
    },

    irA(indice) {
        if (indice < 0 || indice >= this.imagenes.length) return;
        this.indice = indice;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
    },

    zoomIn() {
        this.zoom = Math.min(this.maxZoom, this.zoom + this.zoomStep);
        this.actualizarZoom();
    },

    zoomOut() {
        this.zoom = Math.max(this.minZoom, this.zoom - this.zoomStep);
        this.actualizarZoom();
    },

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.actualizarZoom();
    },

    toggleZoom() {
        this.zoom = this.zoom > 1 ? 1 : 2;
        if (this.zoom === 1) {
            this.panX = 0;
            this.panY = 0;
        }
        this.actualizarZoom();
    },

    limitarPaneo() {
        const imagen = document.getElementById('galeriaProductoImagen');
        if (!imagen) return;

        if (this.zoom <= 1) {
            this.panX = 0;
            this.panY = 0;
            return;
        }

        const maxX = Math.max(0, (imagen.offsetWidth * this.zoom - imagen.offsetWidth) / 2);
        const maxY = Math.max(0, (imagen.offsetHeight * this.zoom - imagen.offsetHeight) / 2);

        this.panX = Math.min(maxX, Math.max(-maxX, this.panX));
        this.panY = Math.min(maxY, Math.max(-maxY, this.panY));
    },

    actualizarZoom() {
        const imagen = document.getElementById('galeriaProductoImagen');
        const botonReset = document.querySelector('.galeria-zoom-btn[aria-label="Restablecer zoom"]');
        const stage = document.querySelector('.galeria-stage');

        this.limitarPaneo();

        if (imagen) {
            imagen.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
            imagen.classList.toggle('is-zoomed', this.zoom > 1);
        }

        if (stage) {
            stage.classList.toggle('galeria-stage-zoomed', this.zoom > 1);
            if (this.zoom <= 1) {
                this.terminarArrastre();
            }
        }

        if (botonReset) {
            botonReset.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    },

    iniciarArrastre(event) {
        const stage = document.querySelector('.galeria-stage');
        if (!stage || this.zoom <= 1) return;

        this.dragging = true;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.dragStartPanX = this.panX;
        this.dragStartPanY = this.panY;
        stage.classList.add('is-dragging');
        event.preventDefault();
    },

    moverArrastre(event) {
        const stage = document.querySelector('.galeria-stage');
        if (!stage || !this.dragging || this.zoom <= 1) return;

        const deltaX = event.clientX - this.dragStartX;
        const deltaY = event.clientY - this.dragStartY;

        this.panX = this.dragStartPanX + deltaX;
        this.panY = this.dragStartPanY + deltaY;
        this.actualizarZoom();
    },

    terminarArrastre() {
        this.dragging = false;
        const stage = document.querySelector('.galeria-stage');
        if (stage) {
            stage.classList.remove('is-dragging');
        }
    },

    render() {
        const imagen = document.getElementById('galeriaProductoImagen');
        const titulo = document.getElementById('galeriaProductoTitulo');
        const contador = document.getElementById('galeriaProductoContador');
        const thumbs = document.getElementById('galeriaProductoThumbs');

        if (!imagen || !titulo || !contador || !thumbs || !this.imagenes.length) return;

        imagen.src = this.imagenes[this.indice];
        imagen.alt = `${this.titulo} - imagen ${this.indice + 1}`;
        imagen.onload = () => this.actualizarZoom();
        titulo.textContent = this.titulo;
        contador.textContent = `${this.indice + 1} / ${this.imagenes.length}`;
        this.actualizarZoom();

        thumbs.innerHTML = this.imagenes.map((src, index) => `
            <button
                type="button"
                class="galeria-thumb${index === this.indice ? ' active' : ''}"
                onclick="ProductoGaleria.irA(${index})"
                aria-label="Ver imagen ${index + 1}"
            >
                <img src="${src}" alt="Miniatura ${index + 1}">
            </button>
        `).join('');
    }
};

function obtenerPaginacion(nombre) {
    return AppState.paginacion[nombre] || { page: 1, page_size: 10, total: 0, total_pages: 0, has_next: false, has_prev: false };
}

function actualizarPaginacion(nombre, pagination) {
    AppState.paginacion[nombre] = {
        ...obtenerPaginacion(nombre),
        ...(pagination || {})
    };
}

function mezclarProductosEnCache(items = []) {
    const cache = Array.isArray(AppState.productos) ? [...AppState.productos] : [];

    items.forEach(item => {
        const productoNormalizado = normalizarProductoPrecios(item);
        const index = cache.findIndex(existing => existing.id === item.id);
        if (index >= 0) {
            cache[index] = { ...cache[index], ...productoNormalizado };
        } else {
            cache.push(productoNormalizado);
        }
    });

    cache.sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }));
    AppState.productos = cache;
    productos = AppState.productos;
}

function actualizarConsultaProductos(search = '', filters = {}) {
    AppState.productosQuery = {
        search: search || '',
        filters: filters || {}
    };
}

function construirUrlFotoProducto(fotoUrl) {
    if (!fotoUrl) return '';

    try {
        return new URL(fotoUrl, `${API_ORIGIN}/`).href;
    } catch (e) {
        return fotoUrl;
    }
}

function construirUrlFotoCliente(fotoUrl) {
    if (!fotoUrl) return '';

    try {
        return new URL(fotoUrl, `${API_ORIGIN}/`).href;
    } catch (e) {
        return fotoUrl;
    }
}

function obtenerInicialesCliente(nombre = '') {
    return String(nombre || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte.charAt(0).toUpperCase())
        .join('') || 'CL';
}

function liberarObjectUrlCliente(tipo) {
    const state = clienteFotosState[tipo];
    if (state?.objectUrl) {
        URL.revokeObjectURL(state.objectUrl);
        state.objectUrl = '';
    }
}

function actualizarPreviewFotoCliente(tipo) {
    const preview = document.getElementById(tipo === 'perfil' ? 'clienteFotoPerfilPreview' : 'clienteFotoCedulaPreview');
    const state = clienteFotosState[tipo];
    if (!preview || !state) return;

    const url = state.objectUrl || state.currentUrl;
    if (url) {
        preview.className = 'cliente-foto-preview';
        preview.innerHTML = `<img src="${url}" alt="Foto de ${tipo === 'perfil' ? 'perfil' : 'cedula'} del cliente">`;
        return;
    }

    preview.className = 'cliente-foto-preview cliente-foto-preview-empty';
    preview.textContent = tipo === 'perfil' ? 'Sin foto de perfil' : 'Sin foto de cedula';
}

function resetearFotosCliente(cliente = null) {
    ['perfil', 'cedula'].forEach(tipo => {
        liberarObjectUrlCliente(tipo);
        const state = clienteFotosState[tipo];
        const pathKey = tipo === 'perfil' ? 'foto_perfil_path' : 'foto_cedula_path';
        const urlKey = tipo === 'perfil' ? 'foto_perfil_url' : 'foto_cedula_url';
        const inputId = tipo === 'perfil' ? 'clienteFotoPerfilModal' : 'clienteFotoCedulaModal';
        const removeId = tipo === 'perfil' ? 'clienteFotoPerfilEliminar' : 'clienteFotoCedulaEliminar';

        state.currentPath = cliente?.[pathKey] || '';
        state.currentUrl = construirUrlFotoCliente(cliente?.[urlKey] || cliente?.[pathKey] || '');
        state.remove = false;

        const input = document.getElementById(inputId);
        const removeInput = document.getElementById(removeId);
        if (input) input.value = '';
        if (removeInput) removeInput.value = 'false';

        actualizarPreviewFotoCliente(tipo);
    });
}

function manejarCambioFotoCliente(tipo, event) {
    const file = event.target.files?.[0];
    const state = clienteFotosState[tipo];
    const removeInput = document.getElementById(tipo === 'perfil' ? 'clienteFotoPerfilEliminar' : 'clienteFotoCedulaEliminar');
    if (!state) return;

    liberarObjectUrlCliente(tipo);

    if (!file) {
        actualizarPreviewFotoCliente(tipo);
        return;
    }

    if (!file.type.startsWith('image/')) {
        mostrarNotificacion('⚠️ Selecciona una imagen valida');
        event.target.value = '';
        actualizarPreviewFotoCliente(tipo);
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        mostrarNotificacion('⚠️ La imagen no puede superar 5 MB');
        event.target.value = '';
        actualizarPreviewFotoCliente(tipo);
        return;
    }

    state.objectUrl = URL.createObjectURL(file);
    state.remove = false;
    if (removeInput) removeInput.value = 'false';
    actualizarPreviewFotoCliente(tipo);
}

function limpiarFotoCliente(tipo) {
    const state = clienteFotosState[tipo];
    const input = document.getElementById(tipo === 'perfil' ? 'clienteFotoPerfilModal' : 'clienteFotoCedulaModal');
    const removeInput = document.getElementById(tipo === 'perfil' ? 'clienteFotoPerfilEliminar' : 'clienteFotoCedulaEliminar');
    if (!state) return;

    liberarObjectUrlCliente(tipo);
    if (input) input.value = '';
    state.remove = Boolean(state.currentPath);
    state.currentPath = '';
    state.currentUrl = '';
    if (removeInput) removeInput.value = state.remove ? 'true' : 'false';
    actualizarPreviewFotoCliente(tipo);
}

function renderAvatarCliente(cliente, className = 'cliente-card-avatar') {
    const foto = construirUrlFotoCliente(cliente?.foto_perfil_url || cliente?.foto_perfil_path || '');
    if (foto) {
        return `<div class="${className}"><img src="${foto}" alt="${cliente?.nombre || 'Cliente'}"></div>`;
    }
    return `<div class="${className}">${obtenerInicialesCliente(cliente?.nombre)}</div>`;
}

function construirUrlsFotosProducto(fotos = []) {
    return (Array.isArray(fotos) ? fotos : []).map(foto => construirUrlFotoProducto(foto)).filter(Boolean);
}

function obtenerUrlsGaleriaProducto(producto) {
    return construirUrlsFotosProducto(producto.fotos_urls?.length ? producto.fotos_urls : producto.fotos);
}

function liberarObjectUrlFotoProducto() {
    const preview = document.getElementById('productoFotoPreview');
    if (!preview) return;

    (preview.dataset.objectUrls || '')
        .split('|')
        .filter(Boolean)
        .forEach(url => URL.revokeObjectURL(url));
    delete preview.dataset.objectUrls;
}

function obtenerFotosProductoParaPreview() {
    const existentes = productoFotosExistentes.map(foto => ({
        tipo: 'existente',
        path: foto.path,
        url: foto.url
    }));

    const nuevas = productoFotosSeleccionadas.map((foto, index) => ({
        tipo: 'nueva',
        index,
        nombre: foto.file.name,
        url: foto.url
    }));

    return [...existentes, ...nuevas];
}

function actualizarPreviewFotoProducto() {
    const preview = document.getElementById('productoFotoPreview');
    if (!preview) return;

    const fotos = obtenerFotosProductoParaPreview();

    if (!fotos.length) {
        preview.className = 'producto-foto-preview-list producto-foto-preview-empty';
        preview.textContent = 'Sin fotos cargadas';
        return;
    }

    preview.className = 'producto-foto-preview-list';
    preview.innerHTML = fotos.map((foto, index) => `
        <div class="producto-foto-thumb">
            <img src="${foto.url}" alt="Foto ${index + 1} del producto">
            <button type="button" class="producto-foto-thumb-remove" onclick="quitarFotoProducto('${foto.tipo}', ${foto.tipo === 'nueva' ? foto.index : index})">&times;</button>
            <span class="producto-foto-thumb-badge">${foto.tipo === 'existente' ? 'Guardada' : 'Nueva'}</span>
        </div>
    `).join('');
}

function sincronizarInputFotosProducto() {
    const input = document.getElementById('productoFoto');
    if (!input) return;

    try {
        const dataTransfer = new DataTransfer();
        productoFotosSeleccionadas.forEach(item => dataTransfer.items.add(item.file));
        input.files = dataTransfer.files;
    } catch (e) {
        input.value = '';
    }
}

function resetearEstadoFotoProducto(currentPhotos = []) {
    const input = document.getElementById('productoFoto');
    const removeInput = document.getElementById('productoFotoEliminar');

    liberarObjectUrlFotoProducto();
    productoFotosSeleccionadas = [];
    productoFotosExistentes = (Array.isArray(currentPhotos) ? currentPhotos : []).map((foto, index) => {
        if (typeof foto === 'string') {
            return {
                path: foto,
                url: construirUrlFotoProducto(foto)
            };
        }

        if (foto && typeof foto === 'object') {
            const path = foto.path || foto.foto_path || foto.raw || foto.url || '';
            const fallbackUrl = Array.isArray(currentPhotos) && Array.isArray(foto.urls)
                ? foto.urls[index] || ''
                : '';

            return {
                path,
                url: foto.url || fallbackUrl || construirUrlFotoProducto(path)
            };
        }

        return null;
    }).filter(item => item && item.path && item.url);

    if (input) {
        input.value = '';
    }

    if (removeInput) {
        removeInput.value = 'false';
    }

    sincronizarInputFotosProducto();
    actualizarPreviewFotoProducto();
}

function manejarCambioFotoProducto(event) {
    const files = Array.from(event.target.files || []);
    const removeInput = document.getElementById('productoFotoEliminar');
    const preview = document.getElementById('productoFotoPreview');

    if (!files.length) {
        return;
    }

    const totalActual = productoFotosExistentes.length + productoFotosSeleccionadas.length;
    if (totalActual + files.length > MAX_PRODUCT_IMAGES) {
        mostrarNotificacion(`⚠️ Solo puedes tener hasta ${MAX_PRODUCT_IMAGES} fotos por producto`);
        event.target.value = '';
        return;
    }

    const objectUrls = [];

    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            mostrarNotificacion('⚠️ Selecciona imagenes validas');
            continue;
        }

        if (file.size > 5 * 1024 * 1024) {
            mostrarNotificacion(`⚠️ ${file.name} supera 5 MB`);
            continue;
        }

        const objectUrl = URL.createObjectURL(file);
        objectUrls.push(objectUrl);
        productoFotosSeleccionadas.push({ file, url: objectUrl });
    }

    if (preview) {
        const actuales = (preview.dataset.objectUrls || '').split('|').filter(Boolean);
        preview.dataset.objectUrls = [...actuales, ...objectUrls].join('|');
    }
    if (removeInput) {
        removeInput.value = 'false';
    }

    sincronizarInputFotosProducto();
    actualizarPreviewFotoProducto();
    event.target.value = '';
}

function limpiarFotoProductoSeleccionada() {
    const removeInput = document.getElementById('productoFotoEliminar');
    const hadExistingPhotos = productoFotosExistentes.length > 0;

    liberarObjectUrlFotoProducto();
    productoFotosSeleccionadas = [];
    productoFotosExistentes = [];

    const input = document.getElementById('productoFoto');
    if (input) {
        input.value = '';
    }

    if (removeInput) {
        removeInput.value = hadExistingPhotos ? 'true' : 'false';
    }

    sincronizarInputFotosProducto();
    actualizarPreviewFotoProducto();
}

function quitarFotoProducto(tipo, index) {
    const removeInput = document.getElementById('productoFotoEliminar');

    if (tipo === 'existente') {
        productoFotosExistentes.splice(index, 1);
        if (removeInput && productoFotosExistentes.length === 0) {
            removeInput.value = 'true';
        }
    } else {
        const foto = productoFotosSeleccionadas[index];
        if (foto?.url) {
            URL.revokeObjectURL(foto.url);
        }
        productoFotosSeleccionadas.splice(index, 1);
        const preview = document.getElementById('productoFotoPreview');
        if (preview) {
            preview.dataset.objectUrls = productoFotosSeleccionadas.map(item => item.url).join('|');
        }
    }

    sincronizarInputFotosProducto();
    actualizarPreviewFotoProducto();
}

let indiceCarritoSeleccionado = -1;

function aplicarEstadoSidebar(colapsado) {
    const contenedor = document.getElementById('panelPrincipal');
    const boton = document.getElementById('btnToggleSidebar');
    const icono = boton?.querySelector('.sidebar-toggle-icon');

    if (!contenedor || !boton) return;

    const oculto = Boolean(colapsado);
    contenedor.classList.toggle('sidebar-collapsed', oculto);
    boton.setAttribute('aria-expanded', String(!oculto));
    boton.setAttribute('title', oculto ? 'Mostrar menu' : 'Ocultar menu');
    if (icono) {
        icono.textContent = oculto ? '▶' : '◀';
    }
}

function toggleSidebar() {
    const contenedor = document.getElementById('panelPrincipal');
    if (!contenedor) return;

    const colapsado = !contenedor.classList.contains('sidebar-collapsed');
    aplicarEstadoSidebar(colapsado);
    localStorage.setItem('sidebar_collapsed', colapsado ? 'true' : 'false');
}

function obtenerTabsDisponibles() {
    return ['productos', 'ventas', 'clientes', 'cuentas', 'proveedores', 'compras', 'informes'];
}

function obtenerTabDesdeHash() {
    const tab = window.location.hash.replace(/^#/, '').trim().toLowerCase();
    return obtenerTabsDisponibles().includes(tab) ? tab : '';
}

function sincronizarTabConHash() {
    const tab = obtenerTabDesdeHash();
    if (!tab) return;
    cambiarTab(tab, false);
}

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async function () {
    aplicarEstadoSidebar(localStorage.getItem('sidebar_collapsed') === 'true');
    verificarSesion();
    await cargarConfiguracion();
    await cargarProductos();
    await cargarDatosVentas();
    await cargarClientes();
    await cargarCuentasPorCobrar();
    mostrarVentas();
    actualizarFecha();
    setInterval(actualizarFecha, 60000);

    // Configurar eventos generales
    document.getElementById('productoPrecioCosto').addEventListener('input', recalcularPreciosProducto);
    document.getElementById('productoPorcentajeGanancia1').addEventListener('input', () => calcularPrecioVenta(1));
    document.getElementById('productoPorcentajeGanancia2').addEventListener('input', () => calcularPrecioVenta(2));
    document.getElementById('productoPorcentajeGanancia3').addEventListener('input', () => calcularPrecioVenta(3));
    document.getElementById('productoPrecioDolares1').addEventListener('input', () => {
        calcularPrecioBolivares();
        recalcularPorcentajeGanancia(1);
    });
    document.getElementById('productoPrecioDolares2').addEventListener('input', () => recalcularPorcentajeGanancia(2));
    document.getElementById('productoPrecioDolares3').addEventListener('input', () => recalcularPorcentajeGanancia(3));
    document.getElementById('productoPrecioBolivares').addEventListener('input', () => {
        calcularPrecioDolares();
        recalcularPorcentajeGanancia(1);
    });
    document.getElementById('productoFoto').addEventListener('change', manejarCambioFotoProducto);
    document.getElementById('clienteFotoPerfilModal')?.addEventListener('change', event => manejarCambioFotoCliente('perfil', event));
    document.getElementById('clienteFotoCedulaModal')?.addEventListener('change', event => manejarCambioFotoCliente('cedula', event));
    document.getElementById('formProducto').addEventListener('submit', guardarProducto);
    document.getElementById('buscarProducto').addEventListener('input', filtrarProductos);
    document.getElementById('buscarProducto').addEventListener('keydown', manejarTecladoBusqueda);
    document.getElementById('btnAgregarPago').addEventListener('click', agregarPago);
    document.addEventListener('keydown', manejarAtajosVentas);
    document.addEventListener('keydown', manejarTecladoGaleriaProducto);
    document.getElementById('galeriaProductoImagen')?.addEventListener('wheel', manejarWheelGaleriaProducto, { passive: false });
    document.querySelector('.galeria-stage')?.addEventListener('pointerdown', iniciarArrastreGaleriaProducto);
    document.addEventListener('pointermove', moverArrastreGaleriaProducto);
    document.addEventListener('pointerup', terminarArrastreGaleriaProducto);
    document.addEventListener('pointercancel', terminarArrastreGaleriaProducto);

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

    window.addEventListener('hashchange', sincronizarTabConHash);
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
        AppState.precioVentaLibre = Boolean(config.precioVentaLibre);
        AppState.nombreEmpresa = config.nombreEmpresa || '';
        AppState.rifEmpresa = config.rifEmpresa || '';
        AppState.direccionEmpresa = config.direccionEmpresa || '';
        
        tasaDolar = AppState.tasaDolar;
        tasaVuelto = AppState.tasaVuelto;
        porcentajeGananciaDefecto = AppState.porcentajeGananciaDefecto;
        porcentajeDescuentoDolares = AppState.porcentajeDescuentoDolares;
        metodoRedondeoBs = AppState.metodoRedondeoBs;
        precioVentaLibre = AppState.precioVentaLibre;
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
    document.getElementById('configPrecioVentaLibre').checked = Boolean(AppState.precioVentaLibre);
    
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
    return usuarioLogueado?.rol === 'cajero' ? ['ventas'] : ['productos', 'ventas', 'clientes', 'cuentas', 'proveedores', 'compras', 'informes'];
}

function actualizarModoInterfazPorRol() {
    document.body.classList.toggle('modo-cajero', usuarioLogueado?.rol === 'cajero');

    if (usuarioLogueado?.rol === 'cajero') {
        aplicarEstadoSidebar(true);
        return;
    }

    aplicarEstadoSidebar(localStorage.getItem('sidebar_collapsed') === 'true');
}

function aplicarPermisosUsuario() {
    const nombreUsuario = document.getElementById('nombreUsuarioDisplay');
    const rolUsuario = document.getElementById('rolUsuarioDisplay');
    const btnConfiguracion = document.getElementById('btnConfiguracion');
    const tabsPermitidos = obtenerTabsPermitidos();

    actualizarModoInterfazPorRol();

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
    const tabsPermitidos = obtenerTabsPermitidos();
    const tabHash = obtenerTabDesdeHash();

    if (tabHash && tabsPermitidos.includes(tabHash)) {
        cambiarTab(tabHash, false);
        return;
    }

    const tabPorDefecto = usuarioLogueado?.rol === 'cajero' ? 'ventas' : 'productos';
    cambiarTab(tabPorDefecto);
}

function verificarSesion() {
    const sesion = localStorage.getItem('sesion_ventas');
    document.body.classList.toggle('login-active', !sesion);

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
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const btn = e.target.querySelector('button');
    const feedback = document.getElementById('loginFeedback');
    const label = btn.querySelector('.btn-login-label');

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
            if (feedback) {
                feedback.textContent = `Acceso aprobado para ${usuarioLogueado.username}`;
                feedback.dataset.state = 'success';
            }
            verificarSesion();
            mostrarNotificacion('✅ Bienvenid@ al sistema');
        } else {
            if (feedback) {
                feedback.textContent = data.message || 'No se pudo validar el acceso.';
                feedback.dataset.state = 'error';
            }
        }
    } catch (e) {
        if (feedback) {
            feedback.textContent = 'No se pudo conectar con el servidor.';
            feedback.dataset.state = 'error';
        }
    } finally {
        btn.disabled = false;
        if (label) {
            label.textContent = 'Entrar al sistema';
        } else {
            btn.textContent = 'Entrar al sistema';
        }
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
    const nuevoPrecioVentaLibre = document.getElementById('configPrecioVentaLibre').checked;
    
    const nombreEmpresa = document.getElementById('configNombreEmpresa').value;
    const rifEmpresa = document.getElementById('configRifEmpresa').value;
    const direccionEmpresa = document.getElementById('configDireccionEmpresa').value;

    const nuevaConfig = {
        tasaDolar: nuevaTasa,
        tasaVuelto: nuevaTasaVuelto,
        porcentajeGananciaDefecto: nuevaGanancia,
        porcentajeDescuentoDolares: Math.min(100, Math.max(0, nuevoDesc)),
        precioVentaLibre: nuevoPrecioVentaLibre,
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
    precioVentaLibre = Boolean(nuevaConfig.precioVentaLibre);

    AppState.tasaDolar = nuevaConfig.tasaDolar;
    AppState.tasaVuelto = nuevaConfig.tasaVuelto;
    AppState.porcentajeGananciaDefecto = nuevaConfig.porcentajeGananciaDefecto;
    AppState.porcentajeDescuentoDolares = nuevaConfig.porcentajeDescuentoDolares;
    AppState.metodoRedondeoBs = metodoRedondeoBs;
    AppState.precioVentaLibre = precioVentaLibre;
    
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

function puedeEditarPrecioVenta() {
    return Boolean(AppState.precioVentaLibre) && ['admin', 'cajero'].includes(usuarioLogueado?.rol);
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

function normalizarProductoPrecios(producto = {}) {
    const precio1 = parseFloat(producto.precio_1_dolares ?? producto.precio_dolares) || 0;
    const precio2 = parseFloat(producto.precio_2_dolares ?? precio1) || 0;
    const precio3 = parseFloat(producto.precio_3_dolares ?? precio1) || 0;
    const porcentajeBase = parseFloat(producto.porcentaje_ganancia) || 0;
    const porcentaje1 = parseFloat(producto.porcentaje_ganancia_1 ?? porcentajeBase) || 0;
    const porcentaje2 = parseFloat(producto.porcentaje_ganancia_2 ?? porcentaje1) || 0;
    const porcentaje3 = parseFloat(producto.porcentaje_ganancia_3 ?? porcentaje1) || 0;

    return {
        ...producto,
        precio_dolares: precio1,
        precio_1_dolares: precio1,
        precio_2_dolares: precio2,
        precio_3_dolares: precio3,
        porcentaje_ganancia: porcentaje1,
        porcentaje_ganancia_1: porcentaje1,
        porcentaje_ganancia_2: porcentaje2,
        porcentaje_ganancia_3: porcentaje3,
        precios: [
            { lista: 1, precio_dolares: precio1, porcentaje_ganancia: porcentaje1 },
            { lista: 2, precio_dolares: precio2, porcentaje_ganancia: porcentaje2 },
            { lista: 3, precio_dolares: precio3, porcentaje_ganancia: porcentaje3 }
        ]
    };
}

function obtenerPrecioProducto(producto, lista = 1) {
    const productoNormalizado = normalizarProductoPrecios(producto);
    return parseFloat(productoNormalizado[`precio_${lista}_dolares`]) || 0;
}

function obtenerPorcentajeGananciaProducto(producto, lista = 1) {
    const productoNormalizado = normalizarProductoPrecios(producto);
    return parseFloat(productoNormalizado[`porcentaje_ganancia_${lista}`]) || 0;
}

function obtenerListaPrecioVentaSeleccionada() {
    const lista = parseInt(document.getElementById('listaPrecioVenta')?.value || '1', 10);
    return PRICE_LIST_NUMBERS.includes(lista) ? lista : 1;
}

function obtenerEtiquetaListaPrecio(lista = 1) {
    if (Number(lista) === 0) {
        return 'Precio libre';
    }
    return `Precio ${lista}`;
}

function obtenerPrecioCarritoDesdeProducto(producto, lista = 1) {
    return roundAmount(obtenerPrecioProducto(producto, lista));
}

function obtenerCostoProducto(producto) {
    return roundAmount(parseFloat(producto?.precio_costo) || 0);
}

function obtenerOpcionesListaPrecioProducto(producto) {
    return PRICE_LIST_NUMBERS.map(lista => ({
        lista,
        etiqueta: obtenerEtiquetaListaPrecio(lista),
        precio: obtenerPrecioProducto(producto, lista)
    }));
}

function aplicarListaPrecioEnCarrito(index, listaPrecio) {
    const item = carrito[index];
    if (!item) return;
    const producto = productos[item.productoIndex];
    if (!producto) return;

    const precio = obtenerPrecioCarritoDesdeProducto(producto, listaPrecio);
    item.lista_precio = listaPrecio;
    item.lista_precio_nombre = obtenerEtiquetaListaPrecio(listaPrecio);
    item.precio_dolares = precio;
    item.precio_original_dolares = precio;
    item.subtotal_dolares = precio * item.cantidad;
    actualizarCarrito();
}

function aplicarPrecioLibreEnCarrito(index, precioLibre) {
    const item = carrito[index];
    if (!item) return false;
    const producto = productos[item.productoIndex];
    if (!producto) return false;

    const nuevoPrecio = roundAmount(parseFloat(precioLibre) || 0);
    const precioCosto = obtenerCostoProducto(producto);

    if (Number.isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
        mostrarNotificacion('❌ Ingrese un precio libre valido');
        return false;
    }

    if (nuevoPrecio < precioCosto) {
        mostrarNotificacion(`❌ El precio libre no puede ser menor al costo ($${precioCosto.toFixed(2)})`);
        return false;
    }

    item.lista_precio = 0;
    item.lista_precio_nombre = obtenerEtiquetaListaPrecio(0);
    item.precio_dolares = nuevoPrecio;
    item.precio_original_dolares = nuevoPrecio;
    item.subtotal_dolares = nuevoPrecio * item.cantidad;
    actualizarCarrito();
    return true;
}

function abrirSelectorPrecioCarrito(index) {
    if (!puedeEditarPrecioVenta() || !carrito[index]) return;

    cerrarSelectorPrecioCarrito();

    const item = carrito[index];
    const producto = productos[item.productoIndex];
    if (!producto) return;
    const precioCosto = obtenerCostoProducto(producto);

    const opciones = obtenerOpcionesListaPrecioProducto(producto).map(opcion => `
        <button
            type="button"
            class="selector-precio-option${(item.lista_precio || 1) === opcion.lista ? ' active' : ''}"
            onclick="seleccionarPrecioCarrito(${index}, ${opcion.lista})"
        >
            <span>${opcion.precio.toFixed(2)}</span>
            <small>${opcion.etiqueta}</small>
        </button>
    `).join('');

    const modal = document.createElement('div');
    modal.id = 'modalSelectorPrecioCarrito';
    modal.className = 'modal modal-selector-precio';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content modal-selector-precio-content">
            <button type="button" class="close" onclick="cerrarSelectorPrecioCarrito()">&times;</button>
            <h3>Seleccionar precio</h3>
            <p>${item.nombre}</p>
            <div class="selector-precio-grid">
                ${opciones}
            </div>
            <div class="selector-precio-libre-box">
                <label for="selectorPrecioLibreInput">Precio libre</label>
                <small>No puede ser menor al costo: $${precioCosto.toFixed(2)}</small>
                <div class="selector-precio-libre-row">
                    <input type="number" id="selectorPrecioLibreInput" min="${precioCosto.toFixed(2)}" step="0.01" value="${item.precio_dolares.toFixed(2)}">
                    <button type="button" class="btn-primary" onclick="confirmarPrecioLibreCarrito(${index})">Aplicar</button>
                </div>
            </div>
        </div>
    `;
    modal.onclick = event => {
        if (event.target === modal) cerrarSelectorPrecioCarrito();
    };
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('selectorPrecioLibreInput')?.focus(), 40);
}

function seleccionarPrecioCarrito(index, listaPrecio) {
    aplicarListaPrecioEnCarrito(index, listaPrecio);
    cerrarSelectorPrecioCarrito();
    mostrarNotificacion(`💲 ${obtenerEtiquetaListaPrecio(listaPrecio)} aplicada en la venta`);
}

function confirmarPrecioLibreCarrito(index) {
    const input = document.getElementById('selectorPrecioLibreInput');
    if (!input) return;

    const ok = aplicarPrecioLibreEnCarrito(index, input.value);
    if (!ok) {
        input.focus();
        input.select?.();
        return;
    }

    cerrarSelectorPrecioCarrito();
    mostrarNotificacion('💲 Precio libre aplicado en la venta');
}

function cerrarSelectorPrecioCarrito() {
    const modal = document.getElementById('modalSelectorPrecioCarrito');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Funciones de Productos
async function cargarProductos(options = {}) {
    const paginacionActual = obtenerPaginacion('productos');
    const append = options.append === true;
    const page = options.page || (append ? paginacionActual.page + 1 : 1);
    const pageSize = options.pageSize || paginacionActual.page_size || 20;
    const querySearch = options.search !== undefined ? options.search : (AppState.productosQuery?.search || '');
    const queryFilters = options.filters !== undefined ? options.filters : (AppState.productosQuery?.filters || {});
    const response = await ApiService.cargarProductos({ page, pageSize, search: querySearch, filters: queryFilters });
    response.items = (response.items || []).map(normalizarProductoPrecios);

    actualizarConsultaProductos(querySearch, queryFilters);
    mezclarProductosEnCache(response.items);

    const listaVistaActual = Array.isArray(AppState.productosVista) ? AppState.productosVista : [];
    AppState.productosVista = append
        ? [...listaVistaActual, ...response.items.filter(item => !listaVistaActual.some(existing => existing.id === item.id))]
        : response.items;

    actualizarPaginacion('productos', response.pagination);

    if (options.render !== false) {
        mostrarProductos();
    }
}

async function cargarMasProductos() {
    const paginacion = obtenerPaginacion('productos');
    if (!paginacion.has_next) return;
    await cargarProductos({ append: true });
}

async function buscarProductosRemotos(termino, filters = {}, pageSize = 20) {
    const texto = String(termino || '').trim();
    if (!texto) return [];

    const response = await ApiService.cargarProductos({
        page: 1,
        pageSize,
        search: texto,
        filters
    });
    response.items = (response.items || []).map(normalizarProductoPrecios);

    mezclarProductosEnCache(response.items);
    return response.items.map(producto => ({
        producto,
        index: AppState.productos.findIndex(item => item.id === producto.id)
    })).filter(item => item.index >= 0);
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
    const porcentajeGanancia1 = parseFloat(document.getElementById('productoPorcentajeGanancia1').value) || 0;
    const porcentajeGanancia2 = parseFloat(document.getElementById('productoPorcentajeGanancia2').value) || 0;
    const porcentajeGanancia3 = parseFloat(document.getElementById('productoPorcentajeGanancia3').value) || 0;
    const precioDolares1 = parseFloat(document.getElementById('productoPrecioDolares1').value) || 0;
    const precioDolares2 = parseFloat(document.getElementById('productoPrecioDolares2').value) || 0;
    const precioDolares3 = parseFloat(document.getElementById('productoPrecioDolares3').value) || 0;
    const categoria = document.getElementById('productoCategoria').value;
    const metodoRedondeo = document.getElementById('productoMetodoRedondeo').value;
    const fotos = productoFotosSeleccionadas.map(item => item.file);
    const removePhoto = document.getElementById('productoFotoEliminar').value === 'true';

    const formData = new FormData();
    formData.append('codigo', codigo);
    formData.append('nombre', nombre);
    formData.append('descripcion', descripcion);
    formData.append('precio_costo', String(precioCosto));
    formData.append('porcentaje_ganancia', String(porcentajeGanancia1));
    formData.append('precio_dolares', String(precioDolares1));
    formData.append('porcentaje_ganancia_1', String(porcentajeGanancia1));
    formData.append('porcentaje_ganancia_2', String(porcentajeGanancia2));
    formData.append('porcentaje_ganancia_3', String(porcentajeGanancia3));
    formData.append('precio_1_dolares', String(precioDolares1));
    formData.append('precio_2_dolares', String(precioDolares2));
    formData.append('precio_3_dolares', String(precioDolares3));
    formData.append('cantidad', '0');
    formData.append('categoria', categoria);
    formData.append('metodo_redondeo', metodoRedondeo);
    formData.append('remove_photo', removePhoto ? 'true' : 'false');

    formData.append('fotos_existentes', JSON.stringify(productoFotosExistentes.map(foto => foto.path)));

    fotos.forEach(foto => {
        formData.append('fotos', foto);
    });

    try {
        const url = idServidor ? `${API_URL}/productos/${idServidor}` : `${API_URL}/productos/`;
        const method = idServidor ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { ...API.getAuthHeaders() },
            body: formData
        });

        if (res.ok) {
            mostrarNotificacion(idServidor ? '✅ Producto actualizado en servidor' : '✅ Producto creado en servidor');
            await cargarProductos(); // Recargar todo
            cerrarModalProducto();
            return;
        }
        const error = await res.json().catch(() => null);
        mostrarNotificacion(`⚠️ ${error?.error || 'No se pudo guardar el producto en el servidor'}`);
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

async function cargarDatosVentas(options = {}) {
    const paginacionActual = obtenerPaginacion('ventas');
    const page = options.page || paginacionActual.page || 1;
    const pageSize = options.pageSize || paginacionActual.page_size || 10;
    const response = await ApiService.cargarVentas({
        page,
        pageSize,
        search: options.search || '',
        filters: options.filters || {}
    });
    AppState.ventas = response.items;
    actualizarPaginacion('ventas', response.pagination);
    ventas = AppState.ventas;
    if (typeof InformesService !== 'undefined' && typeof InformesService.actualizarOpcionesUsuarios === 'function') {
        InformesService.actualizarOpcionesUsuarios();
    }
}

async function cargarClientes(options = {}) {
    const paginacionActual = obtenerPaginacion('clientes');
    const page = options.page || paginacionActual.page || 1;
    const pageSize = options.pageSize || paginacionActual.page_size || 10;
    const search = options.search !== undefined ? options.search : (document.getElementById('buscarCliente')?.value || '');
    const clienteCuentaSeleccionado = document.getElementById('clienteCuentaPorCobrar')?.value || '';
    const response = await ApiService.cargarClientes({ page, pageSize, search });
    AppState.clientes = response.items;
    actualizarPaginacion('clientes', response.pagination);
    clientes = AppState.clientes;
    renderSelectClientesVenta();
    renderClientes();
    if (document.getElementById('clienteCuentaPorCobrar')) {
        await cargarCuentasPorCobrar({ clienteId: clienteCuentaSeleccionado });
    }
}

async function cargarCuentasPorCobrar(options = {}) {
    const inputId = document.getElementById('clienteCuentaPorCobrar');
    const inputNombre = document.getElementById('clienteCuentaPorCobrarNombre');
    if (!inputId || !inputNombre) return;

    const clientePreseleccionado = String(options.clienteId || inputId.value || '');
    const cliente = clientes.find(item => String(item.id) === clientePreseleccionado);

    if (cliente) {
        inputId.value = String(cliente.id);
        inputNombre.value = `${cliente.nombre}${cliente.documento ? ` - ${cliente.documento}` : ''}`;
        await cargarEstadoCuentaClienteSeleccionado(cliente.id);
    } else {
        inputId.value = '';
        inputNombre.value = '';
        AppState.cuentasPorCobrar = [];
        AppState.estadoCuentaClienteActual = null;
        cuentasPorCobrar = AppState.cuentasPorCobrar;
        renderDetalleCuentaCliente();
    }
}

function renderSelectClientesVenta() {
    const select = document.getElementById('cliente');
    if (!select) return;

    const valorActual = document.getElementById('clienteId')?.value || '';
    select.innerHTML = '<option value="">Cliente General / Contado</option>' + clientes.map(cliente => `
        <option value="${cliente.id}">${cliente.nombre}${cliente.documento ? ` - ${cliente.documento}` : ''}</option>
    `).join('');

    if (valorActual) {
        select.value = valorActual;
    }

    actualizarInfoClienteSeleccionado();
}

function obtenerClienteSeleccionado() {
    const clienteId = parseInt(document.getElementById('clienteId')?.value || document.getElementById('cliente')?.value || '0', 10);
    if (!clienteId) return null;
    return clientes.find(cliente => cliente.id === clienteId) || null;
}

function manejarCambioClienteVenta() {
    const select = document.getElementById('cliente');
    const hidden = document.getElementById('clienteId');
    if (hidden) hidden.value = select?.value || '';
    actualizarInfoClienteSeleccionado();
    actualizarListaPagos();
}

function actualizarInfoClienteSeleccionado() {
    const cliente = obtenerClienteSeleccionado();
    const info = document.getElementById('clienteSaldoInfo');
    const saldoDisponible = document.getElementById('saldoFavorDisponibleVenta');
    const inputSaldo = document.getElementById('montoSaldoFavorVenta');
    const panelSaldoFavor = document.getElementById('panelSaldoFavorCliente');
    const panelCredito = document.getElementById('panelCreditoCliente');
    const tarjetaCliente = document.getElementById('clienteSeleccionadoCard');

    if (saldoDisponible) {
        saldoDisponible.textContent = `$${((cliente && cliente.saldo_a_favor_usd) || 0).toFixed(2)}`;
    }

    if (!cliente) {
        if (info) info.textContent = 'Sin saldo a favor disponible.';
        if (tarjetaCliente) tarjetaCliente.innerHTML = '';
        if (panelSaldoFavor) panelSaldoFavor.style.display = 'none';
        if (panelCredito) panelCredito.style.display = 'none';
        if (inputSaldo) inputSaldo.value = '0';
        const usarSaldo = document.getElementById('usarSaldoFavorVenta');
        if (usarSaldo) usarSaldo.checked = false;
        return;
    }

    if (panelSaldoFavor) panelSaldoFavor.style.display = 'block';
    if (panelCredito) panelCredito.style.display = 'block';

    if (inputSaldo) {
        const montoActual = parseFloat(inputSaldo.value || '0') || 0;
        const saldoCliente = parseFloat(cliente.saldo_a_favor_usd || 0) || 0;
        if (montoActual > saldoCliente) {
            inputSaldo.value = saldoCliente.toFixed(2);
        }
    }

    if (info) {
        info.textContent = `Saldo a favor: $${(cliente.saldo_a_favor_usd || 0).toFixed(2)} | Por cobrar: $${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}`;
    }

    if (tarjetaCliente) {
        tarjetaCliente.innerHTML = `
            ${renderAvatarCliente(cliente, 'cliente-seleccionado-avatar')}
            <div class="cliente-seleccionado-info">
                <strong>${cliente.nombre}</strong>
                <small>${cliente.documento || 'Sin documento'}</small>
            </div>
        `;
    }
}

function renderClientes() {
    const contenedor = document.getElementById('listaClientes');
    if (!contenedor) return;

    if (!clientes.length) {
        contenedor.innerHTML = '<div class="mensaje-vacio">No hay clientes registrados</div>';
        return;
    }

    contenedor.innerHTML = clientes.map(cliente => `
        <div class="producto-card" style="margin-bottom: 12px;">
            <div class="cliente-card-header">
                ${renderAvatarCliente(cliente)}
                <div style="flex: 1; min-width: 0;">
                    <div class="producto-header" style="margin-bottom: 0;">
                        <h3>${cliente.nombre}</h3>
                        <span class="producto-codigo">${cliente.documento || 'Sin documento'}</span>
                    </div>
                </div>
            </div>
            <div class="producto-descripcion">${cliente.telefono || 'Sin telefono'}${cliente.email ? ` | ${cliente.email}` : ''}</div>
            <div class="producto-precios">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <span class="precio-dolar">Saldo a favor: $${(cliente.saldo_a_favor_usd || 0).toFixed(2)}</span>
                    <span class="precio-bolivar" style="color: #b45309;">Por cobrar: $${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}</span>
                </div>
            </div>
            <div class="producto-categoria">${cliente.direccion || 'Sin direccion'}</div>
            <div class="producto-acciones">
                <button class="btn-editar" onclick="editarCliente(${cliente.id})">✏️ Editar</button>
                <button class="btn-secondary" onclick="verEstadoCuentaCliente(${cliente.id})">📄 Estado de Cuenta</button>
            </div>
        </div>
    `).join('');
}

async function cargarEstadoCuentaClienteSeleccionado(clienteId = null) {
    const inputId = document.getElementById('clienteCuentaPorCobrar');
    const inputNombre = document.getElementById('clienteCuentaPorCobrarNombre');
    const id = clienteId || inputId?.value;
    if (!id) {
        AppState.cuentasPorCobrar = [];
        AppState.estadoCuentaClienteActual = null;
        cuentasPorCobrar = [];
        renderDetalleCuentaCliente();
        return;
    }

    try {
        const estado = await ApiService.obtenerEstadoCuentaCliente(id);
        if (inputId) inputId.value = String(id);
        if (inputNombre) {
            const cliente = estado?.cliente;
            inputNombre.value = cliente ? `${cliente.nombre}${cliente.documento ? ` - ${cliente.documento}` : ''}` : '';
        }
        AppState.estadoCuentaClienteActual = estado;
        AppState.cuentasPorCobrar = estado.cuentas_por_cobrar || [];
        cuentasPorCobrar = AppState.cuentasPorCobrar;
        renderDetalleCuentaCliente();
    } catch (e) {
        AppState.estadoCuentaClienteActual = null;
        AppState.cuentasPorCobrar = [];
        cuentasPorCobrar = [];
        renderDetalleCuentaCliente('❌ No se pudo cargar el estado de cuenta del cliente.');
    }
}

function obtenerClientesConCuentaCorriente() {
    const listaBase = (AppState.clientesCxcBusqueda && AppState.clientesCxcBusqueda.length)
        ? AppState.clientesCxcBusqueda
        : clientes;
    return [...listaBase].sort((a, b) => {
        const totalA = (a.saldo_por_cobrar_usd || 0) + (a.saldo_a_favor_usd || 0);
        const totalB = (b.saldo_por_cobrar_usd || 0) + (b.saldo_a_favor_usd || 0);
        if (totalB !== totalA) return totalB - totalA;
        return String(a.nombre || '').localeCompare(String(b.nombre || ''));
    });
}

async function abrirModalBuscarClienteCxc() {
    const modal = document.getElementById('modalBuscarClienteCxc');
    const input = document.getElementById('buscarClienteCxcModal');
    if (input) input.value = '';

    try {
        const response = await ApiService.cargarClientes({ page: 1, pageSize: 200, search: '' });
        AppState.clientesCxcBusqueda = response.items || [];
    } catch (e) {
        AppState.clientesCxcBusqueda = [...clientes];
    }

    renderListaBusquedaClienteCxc();
    if (modal) modal.style.display = 'block';
    if (input) setTimeout(() => input.focus(), 60);
}

function cerrarModalBuscarClienteCxc() {
    const modal = document.getElementById('modalBuscarClienteCxc');
    if (modal) modal.style.display = 'none';
}

function renderListaBusquedaClienteCxc() {
    const contenedor = document.getElementById('listaBusquedaClienteCxc');
    const termino = (document.getElementById('buscarClienteCxcModal')?.value || '').trim().toLowerCase();
    if (!contenedor) return;

    const lista = obtenerClientesConCuentaCorriente().filter(cliente => {
        if (!termino) return true;
        return [cliente.nombre, cliente.documento, cliente.telefono, cliente.email]
            .some(valor => String(valor || '').toLowerCase().includes(termino));
    });

    if (!lista.length) {
        contenedor.innerHTML = '<div class="mensaje-vacio">No hay clientes para mostrar.</div>';
        return;
    }

    contenedor.innerHTML = lista.map(cliente => `
        <button type="button" onclick="seleccionarClienteCxc(${cliente.id})" style="width: 100%; text-align: left; border: 1px solid #e6e6e6; background: white; border-radius: 10px; padding: 14px; margin-bottom: 10px; cursor: pointer;">
            <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:6px;">
                <strong>${cliente.nombre}</strong>
                <span style="color:#5b6470;">${cliente.documento || 'Sin documento'}</span>
            </div>
            <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; font-size:0.92em; color:#334155;">
                <div>Por cobrar: <strong>$${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}</strong></div>
                <div>Saldo a favor: <strong>$${(cliente.saldo_a_favor_usd || 0).toFixed(2)}</strong></div>
            </div>
        </button>
    `).join('');
}

async function seleccionarClienteCxc(clienteId) {
    cerrarModalBuscarClienteCxc();
    await cargarCuentasPorCobrar({ clienteId });
}

function limpiarClienteCxc() {
    const inputId = document.getElementById('clienteCuentaPorCobrar');
    const inputNombre = document.getElementById('clienteCuentaPorCobrarNombre');
    if (inputId) inputId.value = '';
    if (inputNombre) inputNombre.value = '';
    AppState.clientesCxcBusqueda = [];
    AppState.estadoCuentaClienteActual = null;
    AppState.cuentasPorCobrar = [];
    cuentasPorCobrar = [];
    renderDetalleCuentaCliente();
}

function renderDetalleCuentaCliente(mensaje = '') {
    const resumen = document.getElementById('resumenCuentaClienteSeleccionado');
    const detalle = document.getElementById('detalleCuentaClienteSeleccionado');
    const estado = AppState.estadoCuentaClienteActual;

    if (!resumen || !detalle) return;

    if (!estado || !estado.cliente) {
        resumen.style.display = 'none';
        detalle.innerHTML = `<div class="mensaje-vacio">${mensaje || 'Seleccione un cliente para ver sus cuentas por cobrar y abonos.'}</div>`;
        return;
    }

    const cliente = estado.cliente;
    const transacciones = Array.isArray(estado.transacciones) ? estado.transacciones : [];
    const cuentas = Array.isArray(estado.cuentas_por_cobrar) ? estado.cuentas_por_cobrar : [];

    resumen.style.display = 'grid';
    resumen.innerHTML = `
        <div style="background: #eef7ff; border-radius: 12px; padding: 14px;">
            <div style="display:flex; gap:12px; align-items:center;">
                ${renderAvatarCliente(cliente, 'cliente-seleccionado-avatar')}
                <div>
                    <small style="display:block; color:#5b6470; margin-bottom:4px;">Cliente</small>
                    <strong>${cliente.nombre}</strong><br>
                    <small>${cliente.documento || 'Sin documento'}</small>
                </div>
            </div>
        </div>
        <div style="background: #fff6e8; border-radius: 12px; padding: 14px;">
            <small style="display:block; color:#5b6470; margin-bottom:4px;">Total por cobrar</small>
            <strong>$${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}</strong>
        </div>
        <div style="background: #eefbf3; border-radius: 12px; padding: 14px;">
            <small style="display:block; color:#5b6470; margin-bottom:4px;">Saldo a favor</small>
            <strong>$${(cliente.saldo_a_favor_usd || 0).toFixed(2)}</strong>
        </div>
    `;

    if (!transacciones.length && !cuentas.length) {
        detalle.innerHTML = '<div class="mensaje-vacio">Este cliente no tiene transacciones en cuentas por cobrar.</div>';
        return;
    }

    const cuentasHtml = cuentas.map(cuenta => `
        <div style="background:white; border:1px solid #e6e6e6; border-left:4px solid ${cuenta.estado === 'pagada' ? '#198754' : '#dc3545'}; border-radius:10px; padding:14px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:8px;">
                <strong>Factura / Venta #${cuenta.numero_venta || cuenta.venta_id}</strong>
                <span style="text-transform:capitalize; color:#5b6470;">${cuenta.estado}</span>
            </div>
            <div style="font-size:0.92em; color:#5b6470; margin-bottom:10px;">Emitida: ${cuenta.fecha_emision || 'Sin fecha'}</div>
            <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:10px; margin-bottom:12px;">
                <div><small>Original</small><br><strong>$${(cuenta.monto_original_usd || 0).toFixed(2)}</strong></div>
                <div><small>Abonado</small><br><strong>$${(cuenta.monto_abonado_usd || 0).toFixed(2)}</strong></div>
                <div><small>Pendiente</small><br><strong>$${(cuenta.saldo_pendiente_usd || 0).toFixed(2)}</strong></div>
            </div>
            <div class="producto-acciones">
                <button class="btn-success" onclick="registrarAbonoCuentaPrompt(${cuenta.id})">💵 Abonar</button>
            </div>
        </div>
    `).join('');

    const transaccionesHtml = transacciones.map(transaccion => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${transaccion.fecha || ''}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${transaccion.tipo || ''}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${transaccion.descripcion || ''}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(transaccion.cargo_usd || 0).toFixed(2)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(transaccion.abono_usd || 0).toFixed(2)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${transaccion.saldo_documento_usd === null || transaccion.saldo_documento_usd === undefined ? '-' : `$${Number(transaccion.saldo_documento_usd).toFixed(2)}`}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${transaccion.estado || ''}</td>
        </tr>
    `).join('');

    detalle.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h3 style="margin-bottom: 10px;">Documentos pendientes</h3>
            ${cuentasHtml || '<div class="mensaje-vacio">No hay cuentas registradas.</div>'}
        </div>
        <div>
            <h3 style="margin-bottom: 10px;">Transacciones del cliente</h3>
            <div style="overflow-x:auto; background:white; border:1px solid #e6e6e6; border-radius:12px;">
                <table style="width:100%; border-collapse:collapse; min-width: 820px;">
                    <thead>
                        <tr style="background:#f8fafc; text-align:left;">
                            <th style="padding: 10px; border-bottom: 1px solid #eee;">Fecha</th>
                            <th style="padding: 10px; border-bottom: 1px solid #eee;">Tipo</th>
                            <th style="padding: 10px; border-bottom: 1px solid #eee;">Descripción</th>
                            <th style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Debe</th>
                            <th style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Abono</th>
                            <th style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Saldo Doc.</th>
                            <th style="padding: 10px; border-bottom: 1px solid #eee;">Estado</th>
                        </tr>
                    </thead>
                    <tbody>${transaccionesHtml}</tbody>
                </table>
            </div>
        </div>
    `;
}



function mostrarProductos(productosAMostrar = null) {
    const grid = document.getElementById('productosGrid');
    const lista = productosAMostrar || AppState.productosVista || productos;
    const paginacion = obtenerPaginacion('productos');
    const busquedaActiva = Boolean(document.getElementById('buscarProductoGestion')?.value.trim());

    if (lista.length === 0) {
        const mensaje = productos.length === 0
            ? '📦 No hay productos registrados'
            : `🔍 No se encontraron coincidencias${paginacion.has_next ? '. Carga mas productos para seguir buscando.' : ''}`;
        grid.innerHTML = '<div class="mensaje-vacio" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">' +
            mensaje +
            (paginacion.has_next ? '<div style="margin-top: 16px;"><button class="btn-secondary" onclick="cargarMasProductos()">Cargar mas productos</button></div>' : '') +
            '</div>';
        return;
    }

    const cards = lista.map((producto) => {
        // Encontrar el índice original en el array 'productos' para que los botones de editar/eliminar funcionen
        const originalIndex = productos.findIndex(p => p.codigo === producto.codigo);
        const precioPrincipal = obtenerPrecioProducto(producto, 1);
        const precioSecundario = obtenerPrecioProducto(producto, 2);
        const precioTerciario = obtenerPrecioProducto(producto, 3);
        const precioBsDinamico = aplicarRedondeoBs(precioPrincipal * tasaDolar, producto.metodo_redondeo || 'none');
        const fotosProductoUrls = obtenerUrlsGaleriaProducto(producto);
        const fotoPrincipalUrl = fotosProductoUrls[0] || construirUrlFotoProducto(producto.foto_url);

        // Calcular precio con descuento (Promo $)
        let htmlPromo = '';
        if (porcentajeDescuentoDolares > 0) {
            const precioPromo = precioPrincipal * (1 - (porcentajeDescuentoDolares / 100));
            htmlPromo = `
                <div class="precio-promo" style="color: #28a745; font-weight: bold; font-size: 0.95em; margin-top: 5px; background: #e8f5e9; padding: 4px 8px; border-radius: 4px; display: inline-block;">
                    🏷️ Promo $: $${precioPromo.toFixed(2)}
                </div>
            `;
        }

        return `
            <div class="producto-card">
                <button
                    type="button"
                    class="producto-card-media producto-card-media-button${fotoPrincipalUrl ? '' : ' producto-card-media-empty'}"
                    ${fotoPrincipalUrl ? `onclick="abrirGaleriaProductoPorIndice(${originalIndex}, 0)"` : 'disabled'}
                >
                    ${fotoPrincipalUrl
                        ? `<img src="${fotoPrincipalUrl}" alt="${producto.nombre}" loading="lazy">`
                        : '<span>Sin foto</span>'}
                    ${fotosProductoUrls.length > 1 ? `<span class="producto-card-media-count">${fotosProductoUrls.length} fotos</span>` : ''}
                </button>
                <div class="producto-header">
                    <h3>${producto.nombre}</h3>
                    <span class="producto-codigo">${producto.codigo}</span>
                </div>
                <div class="producto-descripcion">${producto.descripcion}</div>
                <div class="producto-precios">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span class="precio-dolar">💵 P1: $${precioPrincipal.toFixed(2)}</span>
                        <span class="precio-dolar">💵 P2: $${precioSecundario.toFixed(2)}</span>
                        <span class="precio-dolar">💵 P3: $${precioTerciario.toFixed(2)}</span>
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

    const resumen = `
        <div class="mensaje-vacio" style="grid-column: 1/-1; text-align: center; padding: 8px 0 0; color: #666;">
            Mostrando ${lista.length}${busquedaActiva ? ' coincidencias cargadas' : ' productos cargados'} de ${paginacion.total || lista.length}
        </div>
    `;

    const loadMore = paginacion.has_next ? `
        <div style="grid-column: 1/-1; display: flex; justify-content: center; padding: 10px 0 24px;">
            <button class="btn-secondary" onclick="cargarMasProductos()">Cargar mas productos</button>
        </div>
    ` : '';

    grid.innerHTML = `${cards}${resumen}${loadMore}`;
}

function filtrarProductosGestion() {
    const termino = document.getElementById('buscarProductoGestion').value.toLowerCase();

    if (!termino) {
        cargarProductos({ page: 1, search: '', filters: {} });
        return;
    }

    cargarProductos({ page: 1, search: termino, filters: {} });
}

function mostrarFormularioProducto() {
    document.getElementById('modalTitulo').textContent = 'Nuevo Producto';
    document.getElementById('formProducto').reset();
    document.getElementById('productoId').value = '-1';
    document.getElementById('productoId').removeAttribute('data-server-id');
    document.getElementById('productoPorcentajeGanancia1').value = porcentajeGananciaDefecto;
    document.getElementById('productoPorcentajeGanancia2').value = porcentajeGananciaDefecto;
    document.getElementById('productoPorcentajeGanancia3').value = porcentajeGananciaDefecto;
    document.getElementById('productoPrecioDolares1').value = '';
    document.getElementById('productoPrecioDolares2').value = '';
    document.getElementById('productoPrecioDolares3').value = '';
    document.getElementById('productoMetodoRedondeo').value = 'none'; // Default sin redondeo
    document.getElementById('productoCantidad').value = 0;
    document.getElementById('productoCodigo').disabled = false; // Habilitar para nuevos productos
    document.getElementById('productoPrecioBolivares').value = '';
    resetearEstadoFotoProducto([]);
    document.getElementById('modalProducto').style.display = 'block';
}

function calcularPrecioVenta(lista = 1) {
    const costo = parseFloat(document.getElementById('productoPrecioCosto').value) || 0;
    const porcentaje = parseFloat(document.getElementById(`productoPorcentajeGanancia${lista}`).value) || 0;

    if (costo > 0) {
        const precioVenta = costo * (1 + (porcentaje / 100));
        document.getElementById(`productoPrecioDolares${lista}`).value = precioVenta.toFixed(2);
        if (lista === 1) {
            calcularPrecioBolivares();
        }
    }
}

function recalcularPreciosProducto() {
    PRICE_LIST_NUMBERS.forEach(calcularPrecioVenta);
}

function calcularPrecioBolivares() {
    const precioDolares = parseFloat(document.getElementById('productoPrecioDolares1').value) || 0;
    const metodo = document.getElementById('productoMetodoRedondeo').value;
    const precioBs = aplicarRedondeoBs(precioDolares * tasaDolar, metodo);
    document.getElementById('productoPrecioBolivares').value = precioBs ? precioBs.toFixed(2) : '';
}

function recalcularPorcentajeGanancia(lista = 1) {
    const costo = parseFloat(document.getElementById('productoPrecioCosto').value) || 0;
    const precioVenta = parseFloat(document.getElementById(`productoPrecioDolares${lista}`).value) || 0;

    if (costo > 0 && precioVenta > 0) {
        const porcentaje = ((precioVenta / costo) - 1) * 100;
        document.getElementById(`productoPorcentajeGanancia${lista}`).value = porcentaje.toFixed(4);
    }
}

function calcularPrecioDolares() {
    const precioBs = parseFloat(document.getElementById('productoPrecioBolivares').value) || 0;
    const precioDolares = precioBs / tasaDolar;
    document.getElementById('productoPrecioDolares1').value = precioDolares ? precioDolares.toFixed(2) : '';
    recalcularPorcentajeGanancia(1);
}

function editarProducto(index) {
    const producto = productos[index];
    const fotosProducto = Array.isArray(producto.fotos) ? producto.fotos : (producto.foto_path ? [producto.foto_path] : []);
    const fotosProductoUrls = Array.isArray(producto.fotos_urls) ? producto.fotos_urls : [];

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
    document.getElementById('productoPorcentajeGanancia1').value = obtenerPorcentajeGananciaProducto(producto, 1) || '';
    document.getElementById('productoPorcentajeGanancia2').value = obtenerPorcentajeGananciaProducto(producto, 2) || '';
    document.getElementById('productoPorcentajeGanancia3').value = obtenerPorcentajeGananciaProducto(producto, 3) || '';
    document.getElementById('productoPrecioDolares1').value = obtenerPrecioProducto(producto, 1);
    document.getElementById('productoPrecioDolares2').value = obtenerPrecioProducto(producto, 2);
    document.getElementById('productoPrecioDolares3').value = obtenerPrecioProducto(producto, 3);
    document.getElementById('productoMetodoRedondeo').value = producto.metodo_redondeo || 'none';
    calcularPrecioBolivares();
    document.getElementById('productoCantidad').value = producto.cantidad;
    document.getElementById('productoCategoria').value = producto.categoria;
    resetearEstadoFotoProducto(fotosProducto.map((path, photoIndex) => ({
        path,
        url: fotosProductoUrls[photoIndex] || construirUrlFotoProducto(path)
    })));

    document.getElementById('modalProducto').style.display = 'block';
}



function cerrarModalProducto() {
    resetearEstadoFotoProducto([]);
    document.getElementById('modalProducto').style.display = 'none';
}

function abrirGaleriaProductoPorIndice(index, imageIndex = 0) {
    const producto = productos[index];
    if (!producto) return;

    const imagenes = obtenerUrlsGaleriaProducto(producto);
    if (!imagenes.length) return;

    ProductoGaleria.abrir(imagenes, imageIndex, producto.nombre);
}

function manejarTecladoGaleriaProducto(event) {
    const modal = document.getElementById('modalGaleriaProducto');
    if (!modal || window.getComputedStyle(modal).display === 'none') return;

    if (event.key === 'ArrowRight') {
        ProductoGaleria.siguiente();
    } else if (event.key === 'ArrowLeft') {
        ProductoGaleria.anterior();
    } else if (event.key === '+' || event.key === '=') {
        ProductoGaleria.zoomIn();
    } else if (event.key === '-') {
        ProductoGaleria.zoomOut();
    } else if (event.key === '0') {
        ProductoGaleria.resetZoom();
    } else if (event.key === 'Escape') {
        ProductoGaleria.cerrar();
    }
}

function manejarWheelGaleriaProducto(event) {
    const modal = document.getElementById('modalGaleriaProducto');
    if (!modal || window.getComputedStyle(modal).display === 'none') return;

    event.preventDefault();
    if (event.deltaY < 0) {
        ProductoGaleria.zoomIn();
    } else {
        ProductoGaleria.zoomOut();
    }
}

function iniciarArrastreGaleriaProducto(event) {
    const modal = document.getElementById('modalGaleriaProducto');
    if (!modal || window.getComputedStyle(modal).display === 'none') return;

    ProductoGaleria.iniciarArrastre(event);
}

function moverArrastreGaleriaProducto(event) {
    ProductoGaleria.moverArrastre(event);
}

function terminarArrastreGaleriaProducto() {
    ProductoGaleria.terminarArrastre();
}

function esPanelVentasActivo() {
    return document.getElementById('panelVentas')?.classList.contains('active');
}

function esCampoEditable(elemento) {
    if (!elemento) return false;
    const tag = (elemento.tagName || '').toLowerCase();
    return elemento.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
}

function obtenerModalAbierto() {
    return Array.from(document.querySelectorAll('.modal')).reverse().find(modal => window.getComputedStyle(modal).display !== 'none') || null;
}

function togglePanelAtajosVentas(forzarEstado) {
    return;
}

function abrirModalTotalizacion() {
    if (!carrito.length) {
        mostrarNotificacion('❌ El carrito está vacío');
        return;
    }

    const modal = document.getElementById('modalTotalizacionVenta');
    if (!modal) return;

    modal.style.display = 'block';
    actualizarListaPagos();
    setTimeout(() => enfocarCampoVentas('medioPago'), 60);
}

function cerrarModalTotalizacion() {
    const modal = document.getElementById('modalTotalizacionVenta');
    if (!modal) return;
    modal.style.display = 'none';
}

function abrirModalExcedenteTotalizacion(venta) {
    const modal = document.getElementById('modalExcedenteTotalizacion');
    const monto = document.getElementById('modalExcedenteTotalizacionMonto');
    if (!modal || !monto || !venta) return;

    monto.textContent = `$${venta.excedenteTotalUSD.toFixed(2)}`;
    modal.style.display = 'block';
}

function cerrarModalExcedenteTotalizacion() {
    const modal = document.getElementById('modalExcedenteTotalizacion');
    if (!modal) return;
    modal.style.display = 'none';
}

function aceptarExcedenteComoSaldoFavor() {
    if (!ventaEnProgreso) return;

    ventaEnProgreso.saldo_a_favor_generado_usd = ventaEnProgreso.excedenteTotalUSD;
    ventaEnProgreso.excedenteUSD = 0;
    ventaEnProgreso.excedenteBS = 0;
    ventaEnProgreso.excedenteTotalUSD = 0;
    ventaEnProgreso.excedenteReconocido = 0;

    cerrarModalExcedenteTotalizacion();
    cerrarModalTotalizacion();
    terminarProcesoVenta(ventaEnProgreso, '');
}

function gestionarExcedenteComoVuelto() {
    if (!ventaEnProgreso) return;

    cerrarModalExcedenteTotalizacion();
    const monedaSugerida = document.getElementById('btnProcesarVenta').getAttribute('data-moneda-sugerida') || 'USD';
    abrirModalGestionVuelto(ventaEnProgreso, monedaSugerida);
}

function enfocarCampoVentas(idCampo, posicion = null) {
    const campo = document.getElementById(idCampo);
    if (!campo) return;
    campo.focus();

    if (typeof campo.select === 'function' && (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA')) {
        campo.select();
    }

    if (typeof posicion === 'number' && typeof campo.setSelectionRange === 'function') {
        campo.setSelectionRange(posicion, posicion);
    }
}

function cerrarOverlayVentasActual() {
    const modalAbierto = obtenerModalAbierto();
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
        togglePanelAtajosVentas(false);
        return true;
    }

    return false;
}

function normalizarIndiceCarrito() {
    if (carrito.length === 0) {
        indiceCarritoSeleccionado = -1;
        return;
    }

    if (indiceCarritoSeleccionado < 0) {
        indiceCarritoSeleccionado = 0;
        return;
    }

    if (indiceCarritoSeleccionado >= carrito.length) {
        indiceCarritoSeleccionado = carrito.length - 1;
    }
}

function seleccionarFilaCarrito(index) {
    if (carrito.length === 0) {
        indiceCarritoSeleccionado = -1;
        return;
    }

    indiceCarritoSeleccionado = Math.max(0, Math.min(index, carrito.length - 1));
    actualizarSeleccionCarritoVisual();
}

function moverSeleccionCarrito(direccion) {
    if (carrito.length === 0) return;
    normalizarIndiceCarrito();
    seleccionarFilaCarrito(indiceCarritoSeleccionado + direccion);
}

function actualizarSeleccionCarritoVisual() {
    const filas = document.querySelectorAll('#carritoBody tr[data-carrito-index]');
    filas.forEach((fila, index) => {
        const activa = index === indiceCarritoSeleccionado;
        fila.classList.toggle('carrito-seleccionado', activa);
        fila.setAttribute('aria-selected', activa ? 'true' : 'false');

        if (activa) {
            fila.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    });
}

function ajustarCantidadItemSeleccionado(delta) {
    if (indiceCarritoSeleccionado < 0 || !carrito[indiceCarritoSeleccionado]) return;
    actualizarCantidadCarrito(indiceCarritoSeleccionado, carrito[indiceCarritoSeleccionado].cantidad + delta);
}

function manejarAtajosVentas(event) {
    if (!esPanelVentasActivo()) return;

    const tecla = event.key;
    const activo = document.activeElement;
    const modalAbierto = obtenerModalAbierto();
    const editable = esCampoEditable(activo);
    const focoEnBusqueda = activo?.id === 'buscarProducto';
    const focoEnPago = activo?.id === 'medioPago' || activo?.id === 'montoPago';

    if (tecla === 'Escape') {
        event.preventDefault();
        cerrarOverlayVentasActual();
        return;
    }

    if (tecla === 'F1') {
        event.preventDefault();
        togglePanelAtajosVentas();
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

// Funciones del Carrito
function agregarAlCarrito(productoIndex) {
    const producto = productos[productoIndex];
    const listaPrecio = obtenerListaPrecioVentaSeleccionada();
    const precioSeleccionado = obtenerPrecioCarritoDesdeProducto(producto, listaPrecio);
    const indiceExistente = carrito.findIndex(item => item.productoIndex === productoIndex && item.lista_precio === listaPrecio);

    if (producto.cantidad <= 0) {
        alert('❌ Producto sin stock disponible');
        return;
    }

    // Verificar si ya está en el carrito
    const existente = indiceExistente >= 0 ? carrito[indiceExistente] : null;

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
            lista_precio: listaPrecio,
            lista_precio_nombre: obtenerEtiquetaListaPrecio(listaPrecio),
            precio_dolares: precioSeleccionado,
            precio_original_dolares: precioSeleccionado,
            cantidad: 1,
            subtotal_dolares: precioSeleccionado
        });
    }

    actualizarCarrito();
    seleccionarFilaCarrito(indiceExistente >= 0 ? indiceExistente : carrito.length - 1);
    mostrarNotificacion(`🛒 Producto agregado al carrito con ${obtenerEtiquetaListaPrecio(listaPrecio)}`);
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

async function filtrarProductos(e) {
    const texto = e.target.value.toLowerCase();
    const sugerencias = document.getElementById('sugerenciasProductos');

    indiceSeleccionado = -1; // Resetear selección

    if (texto.length === 0) {
        sugerencias.style.display = 'none';
        resultadosBusqueda = [];
        return;
    }

    resultadosBusqueda = await buscarProductosRemotos(texto, { in_stock: 'true' }, 20);

    if (resultadosBusqueda.length > 0) {
        const listaPrecio = obtenerListaPrecioVentaSeleccionada();
        sugerencias.innerHTML = resultadosBusqueda.map((item, i) => `
            <div class="sugerencia-item" onclick="seleccionarProducto(${item.index})" data-index="${i}">
                <strong>${item.producto.nombre}</strong> <small>(${item.producto.codigo})</small>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span style="color: #28a745;">${obtenerEtiquetaListaPrecio(listaPrecio)}: $${obtenerPrecioProducto(item.producto, listaPrecio).toFixed(2)}</span>
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
    document.getElementById('buscarProducto').focus();
}

function actualizarCarrito() {
    const tbody = document.getElementById('carritoBody');
    const itemsResumen = document.getElementById('posItemsCount');
    const dolaresResumen = document.getElementById('posResumenDolares');
    const bolivaresResumen = document.getElementById('posResumenBolivares');
    let totalDolares = 0;

    if (carrito.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">🛒 Carrito vacío</td></tr>';
        indiceCarritoSeleccionado = -1;
    } else {
        normalizarIndiceCarrito();
        tbody.innerHTML = carrito.map((item, index) => {
            totalDolares += item.subtotal_dolares;
            const prodOriginal = productos[item.productoIndex];
            const metodo = prodOriginal?.metodo_redondeo || 'none';

            const precioBs = aplicarRedondeoBs(item.precio_dolares * tasaDolar, metodo);
            const subtotalBs = aplicarRedondeoBs(item.subtotal_dolares * tasaDolar, metodo);
            const precioEditable = puedeEditarPrecioVenta();

            return `
                <tr data-carrito-index="${index}" class="${index === indiceCarritoSeleccionado ? 'carrito-seleccionado' : ''}" onclick="seleccionarFilaCarrito(${index})">
                    <td>${item.nombre}<br><small style="color:#64748b;">${item.lista_precio_nombre || obtenerEtiquetaListaPrecio(item.lista_precio || 1)}</small></td>
                    <td>
                        ${precioEditable
                            ? `<button type="button" class="btn-selector-precio-carrito" onclick="event.stopPropagation(); abrirSelectorPrecioCarrito(${index})">$${item.precio_dolares.toFixed(2)}</button>`
                            : `$${item.precio_dolares.toFixed(2)}`}
                    </td>
                    <td>Bs ${precioBs.toFixed(2)}</td>
                    <td>
                        <input type="number" min="1" max="${productos[item.productoIndex].cantidad}" 
                               value="${item.cantidad}" onchange="actualizarCantidadCarrito(${index}, this.value)" onclick="event.stopPropagation()"
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

    if (itemsResumen) itemsResumen.textContent = String(carrito.length);
    if (dolaresResumen) dolaresResumen.textContent = `$${totalDolares.toFixed(2)}`;
    if (bolivaresResumen) bolivaresResumen.textContent = `Bs ${totalBs.toFixed(2)}`;

    // Actualizar resumen de pagos
    actualizarResumenPagos(totalDolares, totalBs);
    actualizarSeleccionCarritoVisual();
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
    carrito[index].subtotal_dolares = carrito[index].precio_dolares * cantidad;
    actualizarCarrito();
}

function actualizarPrecioCarrito(index, precio) {
    if (!puedeEditarPrecioVenta() || !carrito[index]) {
        actualizarCarrito();
        return;
    }

    const nuevoPrecio = parseFloat(precio);

    const producto = productos[carrito[index].productoIndex];
    const precioCosto = obtenerCostoProducto(producto);

    if (Number.isNaN(nuevoPrecio) || nuevoPrecio < 0) {
        mostrarNotificacion('❌ Ingrese un precio valido');
        actualizarCarrito();
        return;
    }

    if (nuevoPrecio < precioCosto) {
        mostrarNotificacion(`❌ El precio no puede ser menor al costo ($${precioCosto.toFixed(2)})`);
        actualizarCarrito();
        return;
    }

    carrito[index].lista_precio = 0;
    carrito[index].lista_precio_nombre = obtenerEtiquetaListaPrecio(0);
    carrito[index].precio_dolares = nuevoPrecio;
    carrito[index].subtotal_dolares = nuevoPrecio * carrito[index].cantidad;
    actualizarCarrito();
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    if (indiceCarritoSeleccionado >= carrito.length) {
        indiceCarritoSeleccionado = carrito.length - 1;
    }
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

function obtenerSaldoFavorAplicadoVenta(totalVenta = 0) {
    const cliente = obtenerClienteSeleccionado();
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
    const saldoFavorAplicado = obtenerSaldoFavorAplicadoVenta(totalVenta);

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
    const clienteSeleccionado = obtenerClienteSeleccionado();
    if (pendienteDolares <= 0.01 || (pendienteDolares > 0.01 && clienteSeleccionado)) {
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

    const tipoVentaPreview = document.getElementById('tipoVentaPreview');
    if (tipoVentaPreview) tipoVentaPreview.textContent = pendienteDolares > 0.01 ? 'Credito' : 'Contado';

    const saldoPendientePreview = document.getElementById('saldoPendienteCreditoPreview');
    if (saldoPendientePreview) saldoPendientePreview.textContent = `$${pendienteDolares.toFixed(2)}`;

    const saldoFavorGeneradoPreview = document.getElementById('saldoFavorGeneradoPreview');
    if (saldoFavorGeneradoPreview) saldoFavorGeneradoPreview.textContent = `$${saldoFavorGenerado.toFixed(2)}`;

    const mostrarPanelesCliente = Boolean(obtenerClienteSeleccionado());
    const panelSaldoFavor = document.getElementById('panelSaldoFavorCliente');
    const panelCredito = document.getElementById('panelCreditoCliente');
    if (panelSaldoFavor) panelSaldoFavor.style.display = mostrarPanelesCliente ? 'block' : 'none';
    if (panelCredito) panelCredito.style.display = mostrarPanelesCliente ? 'block' : 'none';

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

    if (pagos.length === 0 && totalVenta > 0 && !obtenerClienteSeleccionado()) { // Si hay venta en 0 (regalo), pasa
        mostrarNotificacion('❌ Debe agregar al menos un pago o seleccionar un cliente para credito');
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
    const clienteSeleccionado = obtenerClienteSeleccionado();
    const saldoFavorAplicado = obtenerSaldoFavorAplicadoVenta(totalVenta);

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

    totalReconocidoDolares += saldoFavorAplicado;

    const saldoPendienteUsd = Math.max(0, totalVenta - totalReconocidoDolares);
    if (saldoPendienteUsd > 0.05 && !clienteSeleccionado) {
        mostrarNotificacion('❌ Debe seleccionar un cliente para registrar credito');
        return;
    }

    // Calcular excedente total reconocido para la lógica de entrega de vuelto
    const excedenteTotalUSD = Math.max(0, totalReconocidoDolares - totalVenta);

    // Crear el objeto de venta base
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
        if (clienteSeleccionado) {
            abrirModalExcedenteTotalizacion(ventaEnProgreso);
        } else {
            const monedaSugerida = document.getElementById('btnProcesarVenta').getAttribute('data-moneda-sugerida') || 'USD';
            abrirModalGestionVuelto(ventaEnProgreso, monedaSugerida);
        }
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
        if (ventaEnProgreso?.cliente_id && ventaEnProgreso?.excedenteTotalUSD > 0.01) {
            ventaEnProgreso.saldo_a_favor_generado_usd = ventaEnProgreso.excedenteTotalUSD;
            ventaEnProgreso.excedenteTotalUSD = 0;
            ventaEnProgreso.excedenteReconocido = 0;
            ventaEnProgreso.excedenteUSD = 0;
            ventaEnProgreso.excedenteBS = 0;
        }
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
            const ventaGuardada = await res.json();
            cerrarModalExcedenteTotalizacion();
            cerrarModalTotalizacion();
            document.getElementById('modalGestionVuelto').style.display = 'none';
            mostrarNotificacion('✅ Venta guardada en servidor');
            await cargarProductos(); // Sincronizar stock real desde backend
            await cargarDatosVentas();
            await cargarClientes();
            await cargarCuentasPorCobrar();
            // Guardar para mostrar recibo después
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
    indiceCarritoSeleccionado = -1;

    // Limpiar campos de entrada
    const elCliente = document.getElementById('cliente');
    if (elCliente) elCliente.value = '';
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

    // Resetear textos de totales y ahorros explícitamente
    const elAhorro = document.getElementById('ahorroVentaRealTime');
    if (elAhorro) elAhorro.textContent = '-$0.00';

    const elTotalReal = document.getElementById('totalAPagarRealTime');
    if (elTotalReal) elTotalReal.textContent = '$0.00';

    const elVueltoBs = document.getElementById('montoCalculadoBs');
    if (elVueltoBs) elVueltoBs.textContent = 'Bs 0.00';

    // Actualizar interfaz
    actualizarInfoClienteSeleccionado();
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
            <td style="text-align: center;">${obtenerEtiquetaListaPrecio(p.lista_precio || 1)}</td>
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

function cambiarTab(tabName, actualizarHash = true) {
    if (usuarioLogueado && !obtenerTabsPermitidos().includes(tabName)) {
        mostrarNotificacion('🔒 Este usuario solo puede usar el POS de ventas');
        return;
    }

    if (!obtenerTabsDisponibles().includes(tabName)) {
        return;
    }

    if (actualizarHash && window.location.hash !== `#${tabName}`) {
        window.location.hash = tabName;
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
        case 'clientes':
            panelId = 'panelClientes';
            setTimeout(() => cargarClientes(), 100);
            break;
        case 'cuentas':
            panelId = 'panelCuentas';
            setTimeout(() => cargarCuentasPorCobrar(), 100);
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
            setTimeout(() => cargarTodasLasVentas(), 100);
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
        if (tabName === 'ventas') {
            setTimeout(() => enfocarCampoVentas('buscarProducto'), 80);
        }
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

async function cargarVentasDelDia() {
    await InformesService.cargarVentasDelDia();
}

async function cargarTodasLasVentas() {
    await InformesService.cargarTodasLasVentas();
}

async function filtrarInformesPorFecha() {
    await InformesService.filtrarPorFecha();
}

async function limpiarFiltrosFecha() {
    await InformesService.limpiarFiltros();
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

    const numeroDocumento = venta.numero_venta || numeroVenta || venta.id || 'S/N';

    let detalleHTML = `
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

    const numeroDocumento = venta.numero_venta || numeroVenta || venta.id || 'S/N';

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
                <div style="font-size: 0.9em;">Venta #${numeroDocumento}</div>
                <div style="font-size: 0.85em; margin-top: 3px;">${venta.fecha || 'S/F'}</div>
            </div>
            
            <!-- Cliente -->
            <div style="margin-bottom: 10px; font-size: 0.9em;">
                <strong>Cliente:</strong> ${venta.cliente}
            </div>
            <div style="margin-bottom: 10px; font-size: 0.9em;">
                <strong>Tipo:</strong> ${(venta.tipo_venta || 'contado').toUpperCase()}
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
                            <span>${p.cantidad} x $${p.precio_unitario_dolares.toFixed(2)} - ${obtenerEtiquetaListaPrecio(p.lista_precio || 1)}</span>
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

function abrirModalCliente(clienteId = null, seleccionarDespues = false) {
    const cliente = clienteId ? clientes.find(item => item.id === clienteId) : null;
    document.getElementById('modalClienteId').value = cliente ? cliente.id : -1;
    document.getElementById('modalClienteSeleccionarDespues').value = seleccionarDespues ? 'true' : 'false';
    document.getElementById('modalTituloCliente').textContent = cliente ? '✏️ Editar Cliente' : '👥 Nuevo Cliente';
    document.getElementById('clienteNombreModal').value = cliente ? cliente.nombre || '' : '';
    document.getElementById('clienteDocumentoModal').value = cliente ? cliente.documento || '' : '';
    document.getElementById('clienteTelefonoModal').value = cliente ? cliente.telefono || '' : '';
    document.getElementById('clienteEmailModal').value = cliente ? cliente.email || '' : '';
    document.getElementById('clienteDireccionModal').value = cliente ? cliente.direccion || '' : '';
    resetearFotosCliente(cliente);
    document.getElementById('modalCliente').style.display = 'block';
}

function cerrarModalCliente() {
    resetearFotosCliente(null);
    document.getElementById('modalCliente').style.display = 'none';
}

function crearClienteRapidoDesdeVenta(seleccionarDespues = true) {
    abrirModalCliente(null, seleccionarDespues);
}

async function guardarClienteDesdeModal() {
    const id = parseInt(document.getElementById('modalClienteId').value || '-1', 10);
    const seleccionarDespues = document.getElementById('modalClienteSeleccionarDespues').value === 'true';
    const payload = new FormData();
    payload.append('nombre', document.getElementById('clienteNombreModal').value.trim());
    payload.append('documento', document.getElementById('clienteDocumentoModal').value.trim());
    payload.append('telefono', document.getElementById('clienteTelefonoModal').value.trim());
    payload.append('email', document.getElementById('clienteEmailModal').value.trim());
    payload.append('direccion', document.getElementById('clienteDireccionModal').value.trim());
    payload.append('remove_foto_perfil', document.getElementById('clienteFotoPerfilEliminar').value);
    payload.append('remove_foto_cedula', document.getElementById('clienteFotoCedulaEliminar').value);

    const fotoPerfil = document.getElementById('clienteFotoPerfilModal').files?.[0];
    const fotoCedula = document.getElementById('clienteFotoCedulaModal').files?.[0];
    if (fotoPerfil) payload.append('foto_perfil', fotoPerfil);
    if (fotoCedula) payload.append('foto_cedula', fotoCedula);

    if (!String(payload.get('nombre') || '').trim()) {
        mostrarNotificacion('❌ El nombre del cliente es obligatorio');
        return;
    }

    try {
        let respuesta = null;
        if (id === -1) {
            respuesta = await ApiService.crearCliente(payload);
            mostrarNotificacion('✅ Cliente creado');
        } else {
            respuesta = await ApiService.actualizarCliente(id, payload);
            mostrarNotificacion('✅ Cliente actualizado');
        }

        await cargarClientes();
        await cargarCuentasPorCobrar();

        const clienteGuardadoId = respuesta?.cliente?.id || id;
        if (seleccionarDespues && clienteGuardadoId) {
            document.getElementById('cliente').value = String(clienteGuardadoId);
            document.getElementById('clienteId').value = String(clienteGuardadoId);
            actualizarInfoClienteSeleccionado();
            actualizarListaPagos();
        }

        cerrarModalCliente();
    } catch (e) {
        mostrarNotificacion(`❌ ${e.message || 'No se pudo guardar el cliente'}`);
    }
}

function editarCliente(clienteId) {
    const cliente = clientes.find(item => item.id === clienteId);
    if (!cliente) return;
    abrirModalCliente(clienteId, false);
}

function construirBloqueFotosCliente(cliente) {
    const fotoPerfil = construirUrlFotoCliente(cliente?.foto_perfil_url || cliente?.foto_perfil_path || '');
    const fotoCedula = construirUrlFotoCliente(cliente?.foto_cedula_url || cliente?.foto_cedula_path || '');

    return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom: 14px;">
            <div style="background:#fff; border:1px solid #e6e6e6; border-radius:14px; padding:12px;">
                <small style="display:block; color:#5b6470; margin-bottom:8px;">Foto de perfil</small>
                <div class="cliente-foto-preview${fotoPerfil ? '' : ' cliente-foto-preview-empty'}" style="margin-top:0; aspect-ratio: 1;">
                    ${fotoPerfil ? `<img src="${fotoPerfil}" alt="Foto de perfil de ${cliente.nombre}">` : 'Sin foto de perfil'}
                </div>
            </div>
            <div style="background:#fff; border:1px solid #e6e6e6; border-radius:14px; padding:12px;">
                <small style="display:block; color:#5b6470; margin-bottom:8px;">Foto de cedula</small>
                <div class="cliente-foto-preview${fotoCedula ? '' : ' cliente-foto-preview-empty'}" style="margin-top:0; aspect-ratio: 1;">
                    ${fotoCedula ? `<img src="${fotoCedula}" alt="Foto de cedula de ${cliente.nombre}">` : 'Sin foto de cedula'}
                </div>
            </div>
        </div>
    `;
}

async function verEstadoCuentaCliente(clienteId) {
    try {
        const data = await ApiService.obtenerEstadoCuentaCliente(clienteId);
        const cliente = data.cliente || {};
        const cuentas = data.cuentas_por_cobrar || [];

        document.getElementById('tituloEstadoCuentaCliente').textContent = `Estado de Cuenta - ${cliente.nombre || 'Cliente'}`;
        document.getElementById('estadoCuentaClienteDocumento').textContent = cliente.documento || 'Sin documento';
        document.getElementById('estadoCuentaClienteFavor').textContent = `$${(cliente.saldo_a_favor_usd || 0).toFixed(2)}`;
        document.getElementById('estadoCuentaClienteCobrar').textContent = `$${(cliente.saldo_por_cobrar_usd || 0).toFixed(2)}`;

        const lista = document.getElementById('estadoCuentaClienteLista');
        if (!cuentas.length) {
            lista.innerHTML = `${construirBloqueFotosCliente(cliente)}<div class="mensaje-vacio">Este cliente no tiene cuentas por cobrar.</div>`;
        } else {
            lista.innerHTML = construirBloqueFotosCliente(cliente) + cuentas.map(cuenta => `
                <div style="background: white; border: 1px solid #e8e8e8; border-left: 4px solid ${cuenta.estado === 'pagada' ? '#198754' : '#dc3545'}; border-radius: 10px; padding: 14px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px;">
                        <strong>Venta #${cuenta.numero_venta || cuenta.venta_id}</strong>
                        <span style="text-transform: capitalize; color: #5b6470;">${cuenta.estado}</span>
                    </div>
                    <div style="font-size: 0.92em; color: #5b6470; margin-bottom: 10px;">Emitida: ${cuenta.fecha_emision || 'Sin fecha'}</div>
                    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; font-size: 0.95em;">
                        <div><small>Original</small><br><strong>$${(cuenta.monto_original_usd || 0).toFixed(2)}</strong></div>
                        <div><small>Abonado</small><br><strong>$${(cuenta.monto_abonado_usd || 0).toFixed(2)}</strong></div>
                        <div><small>Pendiente</small><br><strong>$${(cuenta.saldo_pendiente_usd || 0).toFixed(2)}</strong></div>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('modalEstadoCuentaCliente').style.display = 'block';
    } catch (e) {
        mostrarNotificacion('❌ No se pudo cargar el estado de cuenta');
    }
}

function cerrarModalEstadoCuentaCliente() {
    document.getElementById('modalEstadoCuentaCliente').style.display = 'none';
}

function registrarAbonoCuentaPrompt(cuentaId) {
    const cuenta = cuentasPorCobrar.find(item => item.id === cuentaId);
    if (!cuenta) return;

    const clienteEstado = AppState.estadoCuentaClienteActual?.cliente || null;
    const cliente = clienteEstado && Number(clienteEstado.id) === Number(cuenta.cliente_id)
        ? clienteEstado
        : (clientes.find(item => Number(item.id) === Number(cuenta.cliente_id)) || clienteEstado);
    document.getElementById('abonoCuentaId').value = String(cuenta.id);
    document.getElementById('tituloModalAbonoCuenta').textContent = `Registrar Abono - Cuenta #${cuenta.id}`;
    document.getElementById('abonoCuentaResumenCliente').textContent = cuenta.cliente_nombre || cliente?.nombre || 'Cliente';
    document.getElementById('abonoCuentaResumenVenta').textContent = `Venta #${cuenta.numero_venta || cuenta.venta_id} | Estado: ${cuenta.estado}`;
    document.getElementById('abonoCuentaResumenPendiente').textContent = `$${(cuenta.saldo_pendiente_usd || 0).toFixed(2)}`;
    document.getElementById('abonoCuentaResumenFavor').textContent = `$${((cliente?.saldo_a_favor_usd) || 0).toFixed(2)}`;
    document.getElementById('abonoCuentaResumenOriginal').textContent = `$${(cuenta.monto_original_usd || 0).toFixed(2)}`;
    document.getElementById('abonoUsarSaldoFavor').checked = false;
    document.getElementById('abonoMontoSaldoFavor').value = Math.max(0, Math.min(cuenta.saldo_pendiente_usd || 0, cliente?.saldo_a_favor_usd || 0)).toFixed(2);
    document.getElementById('abonoMedioPago').value = 'Efectivo en Dólares';
    document.getElementById('abonoMoneda').value = 'USD';
    document.getElementById('abonoMonto').value = '0';
    document.getElementById('abonoUsarTasaSistema').checked = true;
    document.getElementById('abonoTasaUsada').value = tasaDolar.toFixed(4);
    document.getElementById('abonoObservacion').value = '';

    toggleModoAbonoCuenta();
    toggleMonedaAbonoCuenta();
    toggleTasaAbonoCuenta();
    actualizarResumenAbonoCuenta();
    document.getElementById('modalAbonoCuenta').style.display = 'block';
}

function cerrarModalAbonoCuenta() {
    document.getElementById('modalAbonoCuenta').style.display = 'none';
}

function obtenerCuentaAbonoActual() {
    const cuentaId = parseInt(document.getElementById('abonoCuentaId').value || '0', 10);
    return cuentasPorCobrar.find(item => item.id === cuentaId) || null;
}

function toggleModoAbonoCuenta() {
    const usarSaldoFavor = document.getElementById('abonoUsarSaldoFavor')?.checked;
    const panelSaldo = document.getElementById('panelAbonoSaldoFavor');
    const panelNormal = document.getElementById('panelAbonoNormal');
    if (panelSaldo) panelSaldo.style.display = usarSaldoFavor ? 'block' : 'none';
    if (panelNormal) panelNormal.style.display = usarSaldoFavor ? 'none' : 'block';
    actualizarResumenAbonoCuenta();
}

function toggleMonedaAbonoCuenta() {
    const moneda = document.getElementById('abonoMoneda')?.value || 'USD';
    const panelTasa = document.getElementById('panelTasaAbonoCuenta');
    if (panelTasa) panelTasa.style.display = moneda === 'BS' ? 'block' : 'none';
}

function toggleTasaAbonoCuenta() {
    const usarSistema = document.getElementById('abonoUsarTasaSistema')?.checked;
    const inputTasa = document.getElementById('abonoTasaUsada');
    if (!inputTasa) return;
    if (usarSistema) {
        inputTasa.value = tasaDolar.toFixed(4);
        inputTasa.setAttribute('disabled', 'disabled');
    } else {
        inputTasa.removeAttribute('disabled');
    }
    actualizarResumenAbonoCuenta();
}

function actualizarResumenAbonoCuenta() {
    const cuenta = obtenerCuentaAbonoActual();
    if (!cuenta) return;

    const clienteEstado = AppState.estadoCuentaClienteActual?.cliente || null;
    const cliente = clienteEstado && Number(clienteEstado.id) === Number(cuenta.cliente_id)
        ? clienteEstado
        : (clientes.find(item => Number(item.id) === Number(cuenta.cliente_id)) || clienteEstado);
    const usarSaldoFavor = document.getElementById('abonoUsarSaldoFavor')?.checked;
    let equivalenteUsd = 0;

    if (usarSaldoFavor) {
        const disponible = parseFloat(cliente?.saldo_a_favor_usd || 0) || 0;
        const pendiente = parseFloat(cuenta.saldo_pendiente_usd || 0) || 0;
        const inputSaldo = document.getElementById('abonoMontoSaldoFavor');
        const montoSolicitado = parseFloat(inputSaldo?.value || '0') || 0;
        const montoAplicable = Math.max(0, Math.min(montoSolicitado, disponible, pendiente));
        if (inputSaldo && Math.abs(montoAplicable - montoSolicitado) > 0.001) {
            inputSaldo.value = montoAplicable.toFixed(2);
        }
        equivalenteUsd = montoAplicable;
    } else {
        const moneda = document.getElementById('abonoMoneda')?.value || 'USD';
        const monto = parseFloat(document.getElementById('abonoMonto')?.value || '0') || 0;
        if (moneda === 'USD') {
            equivalenteUsd = monto;
        } else {
            const tasaUsada = parseFloat(document.getElementById('abonoTasaUsada')?.value || '0') || 0;
            equivalenteUsd = tasaUsada > 0 ? (monto / tasaUsada) : 0;
        }
    }

    const excedente = Math.max(0, equivalenteUsd - (parseFloat(cuenta.saldo_pendiente_usd || 0) || 0));
    const elEquivalente = document.getElementById('abonoEquivalenteUsd');
    const elExcedente = document.getElementById('abonoExcedenteFavor');
    if (elEquivalente) elEquivalente.textContent = `$${equivalenteUsd.toFixed(2)}`;
    if (elExcedente) elExcedente.textContent = `$${excedente.toFixed(2)}`;
}

async function guardarAbonoCuentaDesdeModal() {
    const cuenta = obtenerCuentaAbonoActual();
    if (!cuenta) return;

    const usarSaldoFavor = document.getElementById('abonoUsarSaldoFavor')?.checked;

    try {
        if (usarSaldoFavor) {
            const montoSaldo = parseFloat(document.getElementById('abonoMontoSaldoFavor')?.value || '0') || 0;
            if (montoSaldo <= 0) {
                mostrarNotificacion('❌ Debe indicar un monto valido de saldo a favor');
                return;
            }

            await ApiService.registrarAbonoCuenta(cuenta.id, {
                usar_saldo_a_favor: true,
                monto_saldo_a_favor_usd: montoSaldo,
                observacion: document.getElementById('abonoObservacion')?.value?.trim() || 'Aplicacion manual de saldo a favor'
            });
        } else {
            const medio = document.getElementById('abonoMedioPago')?.value || '';
            const moneda = document.getElementById('abonoMoneda')?.value || 'USD';
            const monto = parseFloat(document.getElementById('abonoMonto')?.value || '0') || 0;
            const usarSistema = document.getElementById('abonoUsarTasaSistema')?.checked;
            const tasaUsada = moneda === 'USD' ? 1 : (parseFloat(document.getElementById('abonoTasaUsada')?.value || '0') || 0);
            const equivalenteUsd = parseFloat((document.getElementById('abonoEquivalenteUsd')?.textContent || '$0').replace('$', '')) || 0;

            if (!medio.trim()) {
                mostrarNotificacion('❌ Debe seleccionar un medio de pago');
                return;
            }
            if (monto <= 0) {
                mostrarNotificacion('❌ Debe indicar un monto valido');
                return;
            }
            if (moneda === 'BS' && tasaUsada <= 0) {
                mostrarNotificacion('❌ Debe indicar una tasa valida');
                return;
            }

            await ApiService.registrarAbonoCuenta(cuenta.id, {
                medio,
                moneda,
                monto,
                tasa_usada: tasaUsada,
                origen_tasa: moneda === 'USD' ? 'sistema' : (usarSistema ? 'sistema' : 'manual'),
                equivalente_usd: equivalenteUsd,
                observacion: document.getElementById('abonoObservacion')?.value?.trim() || ''
            });
        }

        mostrarNotificacion('✅ Abono registrado');
        cerrarModalAbonoCuenta();
        await cargarClientes();
        await cargarCuentasPorCobrar({ clienteId: cuenta.cliente_id });
        await cargarDatosVentas();
    } catch (e) {
        mostrarNotificacion(`❌ ${e.message || 'No se pudo registrar el abono'}`);
    }
}
