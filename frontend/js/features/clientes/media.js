const ClientesMediaFeature = {
    _uploaders: {},

    inicializarMediaUploaders() {
        if (!this._uploaders.perfil && window.SVMediaUploader) {
            this._uploaders.perfil = window.SVMediaUploader.enhance('clientePerfilUploader', {
                inputSelector: '#clienteFotoPerfilModal',
                previewSelector: '#clienteFotoPerfilPreview',
                clearSelector: '#btnLimpiarFotoClientePerfil',
                badgeSelector: '[data-role="badge"]',
                emptyLabel: 'Sin foto de perfil'
            });
        }

        if (!this._uploaders.cedula && window.SVMediaUploader) {
            this._uploaders.cedula = window.SVMediaUploader.enhance('clienteCedulaUploader', {
                inputSelector: '#clienteFotoCedulaModal',
                previewSelector: '#clienteFotoCedulaPreview',
                clearSelector: '#btnLimpiarFotoClienteCedula',
                badgeSelector: '[data-role="badge"]',
                emptyLabel: 'Sin foto de cédula'
            });
        }
    },

    construirUrlFotoCliente(path) {
        return window.MediaUtils?.construirUrlFotoCliente?.(path) || window.MediaUtils?.construirUrl?.(path, window.API_ORIGIN || window.location.origin) || '';
    },

    obtenerInicialesCliente(nombre) {
        return window.Utils?.obtenerInicialesCliente?.(nombre) || String(nombre || 'CL').trim().split(/\s+/).slice(0, 2).map(parte => parte.charAt(0).toUpperCase()).join('') || 'CL';
    },

    clienteFotosState: {
        perfil: { currentUrl: '', currentPath: '', objectUrl: '', remove: false },
        cedula: { currentUrl: '', currentPath: '', objectUrl: '', remove: false }
    },

    liberarObjectUrlCliente(tipo) {
        const state = this.clienteFotosState[tipo];
        if (state?.objectUrl) {
            URL.revokeObjectURL(state.objectUrl);
            state.objectUrl = '';
        }
    },

    actualizarPreviewFotoCliente(tipo) {
        this.inicializarMediaUploaders();
        const preview = document.getElementById(tipo === 'perfil' ? 'clienteFotoPerfilPreview' : 'clienteFotoCedulaPreview');
        const state = this.clienteFotosState[tipo];
        const uploader = this._uploaders[tipo];
        if (!preview || !state) return;

        const url = state.objectUrl || state.currentUrl;
        if (url) {
            preview.className = 'cliente-foto-preview';
            preview.innerHTML = `<img src="${url}" alt="Foto de ${tipo === 'perfil' ? 'perfil' : 'cedula'} del cliente">`;
            uploader?.setFilled(1, tipo === 'perfil' ? 'Foto de perfil lista' : 'Foto de cédula lista');
            return;
        }

        preview.className = 'cliente-foto-preview cliente-foto-preview-empty';
        preview.textContent = tipo === 'perfil' ? 'Sin foto de perfil' : 'Sin foto de cedula';
        uploader?.setEmpty(tipo === 'perfil' ? 'Sin foto de perfil' : 'Sin foto de cédula');
    },

    resetearFotosCliente(cliente = null) {
        ['perfil', 'cedula'].forEach(tipo => {
            this.liberarObjectUrlCliente(tipo);
            const state = this.clienteFotosState[tipo];
            const pathKey = tipo === 'perfil' ? 'foto_perfil_path' : 'foto_cedula_path';
            const urlKey = tipo === 'perfil' ? 'foto_perfil_url' : 'foto_cedula_url';
            const inputId = tipo === 'perfil' ? 'clienteFotoPerfilModal' : 'clienteFotoCedulaModal';
            const removeId = tipo === 'perfil' ? 'clienteFotoPerfilEliminar' : 'clienteFotoCedulaEliminar';

            state.currentPath = cliente?.[pathKey] || '';
            state.currentUrl = this.construirUrlFotoCliente(cliente?.[urlKey] || cliente?.[pathKey] || '');
            state.remove = false;

            const input = document.getElementById(inputId);
            const removeInput = document.getElementById(removeId);
            if (input) input.value = '';
            if (removeInput) removeInput.value = 'false';

            this.actualizarPreviewFotoCliente(tipo);
        });
    },

    manejarCambioFotoCliente(tipo, event) {
        const file = event.target.files?.[0];
        const state = this.clienteFotosState[tipo];
        const removeInput = document.getElementById(tipo === 'perfil' ? 'clienteFotoPerfilEliminar' : 'clienteFotoCedulaEliminar');
        if (!state) return;

        this.liberarObjectUrlCliente(tipo);

        if (!file) {
            this.actualizarPreviewFotoCliente(tipo);
            return;
        }

        if (!file.type.startsWith('image/')) {
            mostrarNotificacion('⚠️ Selecciona una imagen valida');
            event.target.value = '';
            this.actualizarPreviewFotoCliente(tipo);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            mostrarNotificacion('⚠️ La imagen no puede superar 5 MB');
            event.target.value = '';
            this.actualizarPreviewFotoCliente(tipo);
            return;
        }

        state.objectUrl = URL.createObjectURL(file);
        state.remove = false;
        if (removeInput) removeInput.value = 'false';
        this.actualizarPreviewFotoCliente(tipo);
    },

    limpiarFotoCliente(tipo) {
        const state = this.clienteFotosState[tipo];
        const input = document.getElementById(tipo === 'perfil' ? 'clienteFotoPerfilModal' : 'clienteFotoCedulaModal');
        const removeInput = document.getElementById(tipo === 'perfil' ? 'clienteFotoPerfilEliminar' : 'clienteFotoCedulaEliminar');
        if (!state) return;

        this.liberarObjectUrlCliente(tipo);
        if (input) input.value = '';
        state.remove = Boolean(state.currentPath);
        state.currentPath = '';
        state.currentUrl = '';
        if (removeInput) removeInput.value = state.remove ? 'true' : 'false';
        this.actualizarPreviewFotoCliente(tipo);
    },

    renderAvatarCliente(cliente, className = 'cliente-card-avatar') {
        const foto = this.construirUrlFotoCliente(cliente?.foto_perfil_url || cliente?.foto_perfil_path || '');
        if (foto) {
            return `<div class="${className}"><img src="${foto}" alt="${cliente?.nombre || 'Cliente'}"></div>`;
        }
        return `<div class="${className}">${this.obtenerInicialesCliente(cliente?.nombre)}</div>`;
    }
};

window.ClientesMediaFeature = ClientesMediaFeature;
