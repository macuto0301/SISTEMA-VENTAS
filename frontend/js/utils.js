// ============================================
// UTILIDADES GENERALES
// ============================================

const Utils = {
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
    }
};
