// ============================================
// UTILIDADES GENERALES
// ============================================

const Utils = {
    _modalAlerta: null,
    _modalAlertaResolver: null,

    formatearNumero(numero, decimales = 2) {
        return numero.toFixed(decimales);
    },

    formatearFecha(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('es-ES');
    },

    formatearFechaHora(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleString('es-ES');
    },

    obtenerFechaHoy() {
        const hoy = new Date();
        return `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
    },

    parsearFecha(fechaStr) {
        if (!fechaStr) return null;
        const partes = fechaStr.split(/[\/\s:]/);
        if (partes.length < 3) return null;
        
        let dia = parseInt(partes[0], 10);
        let mes = parseInt(partes[1], 10) - 1;
        let anio = parseInt(partes[2], 10);
        if (anio < 100) anio += 2000;
        
        const hora = partes.length > 3 ? parseInt(partes[3], 10) : 0;
        const min = partes.length > 4 ? parseInt(partes[4], 10) : 0;
        
        return new Date(anio, mes, dia, hora, min);
    },

    obtenerTimestampFecha(fechaStr) {
        const fecha = this.parsearFecha(fechaStr);
        return fecha ? fecha.getTime() : 0;
    },

    aplicarRedondeoBs(monto, metodo = 'none') {
        if (metodo === 'none') return monto;
        if (metodo === 'entero') return Math.round(monto);
        if (metodo === 'decena') return Math.ceil(monto / 10) * 10;
        if (metodo === 'centena') return Math.ceil(monto / 100) * 100;
        return monto;
    },

    mostrarNotificacion(mensaje, tipo = 'info') {
        if (window.SVToast?.show) {
            window.SVToast.show(mensaje, tipo);
            return;
        }

        const existente = document.getElementById('notificacion');
        if (existente) existente.remove();

        const colores = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#f44336'
        };

        const div = document.createElement('div');
        div.id = 'notificacion';
        div.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: ${colores[tipo] || colores.info}; color: white;
            padding: 15px 25px; border-radius: 5px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out; max-width: 350px;
        `;
        div.textContent = mensaje;
        document.body.appendChild(div);

        setTimeout(() => {
            div.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => div.remove(), 300);
        }, 3000);
    },

    limpiarInputs(formId) {
        const form = document.getElementById(formId);
        if (form) form.reset();
    },

    confirmar(mensaje) {
        return confirm(mensaje);
    },

    asegurarModalAlerta() {
        if (this._modalAlerta) return this._modalAlerta;

        const modal = document.createElement('div');
        modal.id = 'modalAlertaGlobal';
        modal.className = 'modal modal-alerta-global';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="modal-content modal-alerta" role="dialog" aria-modal="true" aria-labelledby="modalAlertaTitulo" aria-describedby="modalAlertaMensaje">
                <span id="modalAlertaBadge" class="modal-alerta-badge">Aviso</span>
                <h2 id="modalAlertaTitulo">Confirmar accion</h2>
                <p id="modalAlertaMensaje" class="modal-alerta-texto"></p>
                <p id="modalAlertaDetalle" class="modal-alerta-ayuda" style="display: none;"></p>
                <div class="modal-alerta-acciones">
                    <button id="modalAlertaCancelar" type="button" class="btn-secondary">Cancelar</button>
                    <button id="modalAlertaConfirmar" type="button" class="btn-primary">Aceptar</button>
                </div>
            </div>
        `;

        const cerrarSiOverlay = (event) => {
            if (event.target === modal && modal.dataset.dismissible === 'true') {
                this.resolverModalAlerta(false);
            }
        };

        modal.addEventListener('click', cerrarSiOverlay);

        const btnCancelar = modal.querySelector('#modalAlertaCancelar');
        const btnConfirmar = modal.querySelector('#modalAlertaConfirmar');

        btnCancelar.addEventListener('click', () => this.resolverModalAlerta(false));
        btnConfirmar.addEventListener('click', () => this.resolverModalAlerta(true));

        document.addEventListener('keydown', (event) => {
            if (!this._modalAlerta || this._modalAlerta.style.display !== 'block') return;
            if (event.key === 'Escape' && this._modalAlerta.dataset.dismissible === 'true') {
                event.preventDefault();
                this.resolverModalAlerta(false);
            }
        });

        document.body.appendChild(modal);
        this._modalAlerta = modal;
        return modal;
    },

    resolverModalAlerta(resultado) {
        if (!this._modalAlerta) return;

        this._modalAlerta.style.display = 'none';
        this._modalAlerta.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');

        const resolver = this._modalAlertaResolver;
        this._modalAlertaResolver = null;
        if (typeof resolver === 'function') {
            resolver(resultado);
        }
    },

    mostrarModalAlerta(opciones = {}) {
        const modal = this.asegurarModalAlerta();
        if (typeof this._modalAlertaResolver === 'function') {
            this._modalAlertaResolver(false);
        }

        const {
            titulo = 'Aviso',
            mensaje = '',
            detalle = '',
            confirmarTexto = 'Aceptar',
            cancelarTexto = 'Cancelar',
            mostrarCancelar = true,
            variante = 'info',
            dismissible = true
        } = opciones;

        const badge = modal.querySelector('#modalAlertaBadge');
        const tituloEl = modal.querySelector('#modalAlertaTitulo');
        const mensajeEl = modal.querySelector('#modalAlertaMensaje');
        const detalleEl = modal.querySelector('#modalAlertaDetalle');
        const cancelarEl = modal.querySelector('#modalAlertaCancelar');
        const confirmarEl = modal.querySelector('#modalAlertaConfirmar');

        modal.dataset.dismissible = dismissible ? 'true' : 'false';
        modal.querySelector('.modal-alerta').dataset.variant = variante;
        badge.textContent = variante === 'warning' ? 'Atencion' : variante === 'danger' ? 'Importante' : 'Aviso';
        tituloEl.textContent = titulo;
        mensajeEl.textContent = mensaje;
        detalleEl.textContent = detalle;
        detalleEl.style.display = detalle ? 'block' : 'none';
        cancelarEl.textContent = cancelarTexto;
        cancelarEl.style.display = mostrarCancelar ? 'inline-flex' : 'none';
        confirmarEl.textContent = confirmarTexto;
        confirmarEl.className = variante === 'danger' ? 'btn-danger' : 'btn-primary';

        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        return new Promise((resolve) => {
            this._modalAlertaResolver = resolve;
            setTimeout(() => {
                (mostrarCancelar ? cancelarEl : confirmarEl).focus();
            }, 0);
        });
    },

    confirmarModal(mensaje, opciones = {}) {
        return this.mostrarModalAlerta({
            ...opciones,
            mensaje,
            mostrarCancelar: true
        });
    },

    alertaModal(mensaje, opciones = {}) {
        return this.mostrarModalAlerta({
            ...opciones,
            mensaje,
            mostrarCancelar: false,
            confirmarTexto: opciones.confirmarTexto || 'Entendido'
        });
    }
};

window.Utils = Utils;
