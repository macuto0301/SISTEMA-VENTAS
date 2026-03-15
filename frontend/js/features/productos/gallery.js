const ProductoGaleria = {
    imagenes: [],
    titulo: '',
    indice: 0,
    _eventsBound: false,
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
        this.inicializarEventosDom();
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

    inicializarEventosDom() {
        if (this._eventsBound) return;

        const modal = document.getElementById('modalGaleriaProducto');
        const closeButton = document.getElementById('btnCerrarGaleriaProducto');
        const image = document.getElementById('galeriaProductoImagen');
        const thumbs = document.getElementById('galeriaProductoThumbs');

        modal?.addEventListener('click', event => {
            if (event.target === modal) {
                this.cerrar();
                return;
            }

            const actionButton = event.target.closest('[data-gallery-action]');
            if (!actionButton) return;

            const action = actionButton.dataset.galleryAction;
            if (action === 'zoom-out') {
                this.zoomOut();
            } else if (action === 'reset-zoom') {
                this.resetZoom();
            } else if (action === 'zoom-in') {
                this.zoomIn();
            } else if (action === 'prev') {
                this.anterior();
            } else if (action === 'next') {
                this.siguiente();
            }
        });

        closeButton?.addEventListener('click', () => this.cerrar());
        image?.addEventListener('dblclick', () => this.toggleZoom());
        thumbs?.addEventListener('click', event => {
            const thumb = event.target.closest('[data-gallery-index]');
            if (!thumb) return;
            const index = Number(thumb.dataset.galleryIndex);
            if (Number.isInteger(index)) {
                this.irA(index);
            }
        });

        this._eventsBound = true;
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
                data-gallery-index="${index}"
                aria-label="Ver imagen ${index + 1}"
            >
                <img src="${src}" alt="Miniatura ${index + 1}">
            </button>
        `).join('');
    }
};

const ProductosGalleryFeature = {
    ProductoGaleria,

    abrirGaleriaProductoPorIndice(index, imageIndex = 0) {
        const producto = productos[index];
        if (!producto) return;

        const imagenes = obtenerUrlsGaleriaProducto(producto);
        if (!imagenes.length) {
            mostrarNotificacion('⚠️ Este producto no tiene imagenes disponibles');
            return;
        }
        ProductoGaleria.abrir(imagenes, imageIndex, producto.nombre);
    },

    manejarTecladoGaleriaProducto(event) {
        const modal = document.getElementById('modalGaleriaProducto');
        if (!modal || modal.style.display !== 'block') return;

        if (event.key === 'ArrowRight') {
            ProductoGaleria.siguiente();
        } else if (event.key === 'ArrowLeft') {
            ProductoGaleria.anterior();
        } else if (event.key === '+') {
            ProductoGaleria.zoomIn();
        } else if (event.key === '-') {
            ProductoGaleria.zoomOut();
        } else if (event.key === '0') {
            ProductoGaleria.resetZoom();
        } else if (event.key === 'Escape') {
            ProductoGaleria.cerrar();
        }
    },

    manejarWheelGaleriaProducto(event) {
        const modal = document.getElementById('modalGaleriaProducto');
        if (!modal || modal.style.display !== 'block') return;

        event.preventDefault();
        if (event.deltaY < 0) {
            ProductoGaleria.zoomIn();
        } else {
            ProductoGaleria.zoomOut();
        }
    },

    iniciarArrastreGaleriaProducto(event) {
        const modal = document.getElementById('modalGaleriaProducto');
        if (!modal || modal.style.display !== 'block') return;
        ProductoGaleria.iniciarArrastre(event);
    },

    moverArrastreGaleriaProducto(event) {
        ProductoGaleria.moverArrastre(event);
    },

    terminarArrastreGaleriaProducto() {
        ProductoGaleria.terminarArrastre();
    }
};

window.ProductoGaleria = ProductoGaleria;
window.ProductosGalleryFeature = ProductosGalleryFeature;
