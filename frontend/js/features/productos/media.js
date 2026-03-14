const ProductosMediaFeature = {
    productoFotosSeleccionadas: [],
    productoFotosExistentes: [],

    liberarObjectUrlFotoProducto() {
        const preview = document.getElementById('productoFotoPreview');
        if (!preview) return;

        (preview.dataset.objectUrls || '')
            .split('|')
            .filter(Boolean)
            .forEach(url => URL.revokeObjectURL(url));
        delete preview.dataset.objectUrls;
    },

    obtenerFotosProductoParaPreview() {
        const existentes = this.productoFotosExistentes.map(foto => ({
            tipo: 'existente',
            path: foto.path,
            url: foto.url
        }));

        const nuevas = this.productoFotosSeleccionadas.map((foto, index) => ({
            tipo: 'nueva',
            index,
            nombre: foto.file.name,
            url: foto.url
        }));

        return [...existentes, ...nuevas];
    },

    actualizarPreviewFotoProducto() {
        const preview = document.getElementById('productoFotoPreview');
        if (!preview) return;

        const fotos = this.obtenerFotosProductoParaPreview();

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
    },

    sincronizarInputFotosProducto() {
        const input = document.getElementById('productoFoto');
        if (!input) return;

        try {
            const dataTransfer = new DataTransfer();
            this.productoFotosSeleccionadas.forEach(item => dataTransfer.items.add(item.file));
            input.files = dataTransfer.files;
        } catch (e) {
            input.value = '';
        }
    },

    resetearEstadoFotoProducto(currentPhotos = []) {
        const input = document.getElementById('productoFoto');
        const removeInput = document.getElementById('productoFotoEliminar');

        this.liberarObjectUrlFotoProducto();
        this.productoFotosSeleccionadas.length = 0;
        this.productoFotosExistentes.length = 0;

        (Array.isArray(currentPhotos) ? currentPhotos : []).forEach((foto, index) => {
            if (typeof foto === 'string') {
                this.productoFotosExistentes.push({
                    path: foto,
                    url: construirUrlFotoProducto(foto)
                });
                return;
            }

            if (foto && typeof foto === 'object') {
                const path = foto.path || foto.foto_path || foto.raw || foto.url || '';
                const fallbackUrl = Array.isArray(currentPhotos) && Array.isArray(foto.urls)
                    ? foto.urls[index] || ''
                    : '';

                const item = {
                    path,
                    url: foto.url || fallbackUrl || construirUrlFotoProducto(path)
                };

                if (item.path && item.url) {
                    this.productoFotosExistentes.push(item);
                }
            }
        });

        if (input) {
            input.value = '';
        }

        if (removeInput) {
            removeInput.value = 'false';
        }

        this.sincronizarInputFotosProducto();
        this.actualizarPreviewFotoProducto();
    },

    manejarCambioFotoProducto(event) {
        const files = Array.from(event.target.files || []);
        const removeInput = document.getElementById('productoFotoEliminar');
        const preview = document.getElementById('productoFotoPreview');

        if (!files.length) {
            return;
        }

        const totalActual = this.productoFotosExistentes.length + this.productoFotosSeleccionadas.length;
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
            this.productoFotosSeleccionadas.push({ file, url: objectUrl });
        }

        if (preview) {
            const actuales = (preview.dataset.objectUrls || '').split('|').filter(Boolean);
            preview.dataset.objectUrls = [...actuales, ...objectUrls].join('|');
        }
        if (removeInput) {
            removeInput.value = 'false';
        }

        this.sincronizarInputFotosProducto();
        this.actualizarPreviewFotoProducto();
        event.target.value = '';
    },

    limpiarFotoProductoSeleccionada() {
        const removeInput = document.getElementById('productoFotoEliminar');
        const hadExistingPhotos = this.productoFotosExistentes.length > 0;

        this.liberarObjectUrlFotoProducto();
        this.productoFotosSeleccionadas.length = 0;
        this.productoFotosExistentes.length = 0;

        const input = document.getElementById('productoFoto');
        if (input) {
            input.value = '';
        }

        if (removeInput) {
            removeInput.value = hadExistingPhotos ? 'true' : 'false';
        }

        this.sincronizarInputFotosProducto();
        this.actualizarPreviewFotoProducto();
    },

    quitarFotoProducto(tipo, index) {
        const removeInput = document.getElementById('productoFotoEliminar');

        if (tipo === 'existente') {
            this.productoFotosExistentes.splice(index, 1);
            if (removeInput && this.productoFotosExistentes.length === 0) {
                removeInput.value = 'true';
            }
        } else {
            const foto = this.productoFotosSeleccionadas[index];
            if (foto?.url) {
                URL.revokeObjectURL(foto.url);
            }
            this.productoFotosSeleccionadas.splice(index, 1);
            const preview = document.getElementById('productoFotoPreview');
            if (preview) {
                preview.dataset.objectUrls = this.productoFotosSeleccionadas.map(item => item.url).join('|');
            }
        }

        this.sincronizarInputFotosProducto();
        this.actualizarPreviewFotoProducto();
    }
};

window.ProductosMediaFeature = ProductosMediaFeature;
