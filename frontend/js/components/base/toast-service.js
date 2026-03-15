(function initSalesToastService() {
    let activeToast = null;
    let activeTimer = null;

    function normalizeType(type = 'info') {
        if (['success', 'warning', 'error', 'info'].includes(type)) return type;
        return 'info';
    }

    function inferType(message = '', fallback = 'info') {
        if (/^✅/.test(message)) return 'success';
        if (/^⚠️/.test(message)) return 'warning';
        if (/^❌/.test(message)) return 'error';
        return normalizeType(fallback);
    }

    function removeToast() {
        if (activeTimer) {
            clearTimeout(activeTimer);
            activeTimer = null;
        }
        if (activeToast) {
            activeToast.remove();
            activeToast = null;
        }
    }

    function show(message, type = 'info') {
        removeToast();

        const toast = document.createElement('div');
        toast.className = 'sv-toast';
        toast.dataset.variant = inferType(message, type);
        toast.innerHTML = `
            <div class="sv-toast-content">
                <span class="sv-toast-message"></span>
            </div>
        `;
        toast.querySelector('.sv-toast-message').textContent = String(message || '');
        document.body.appendChild(toast);

        activeToast = toast;
        activeTimer = window.setTimeout(() => {
            toast.classList.add('is-leaving');
            window.setTimeout(removeToast, 220);
        }, 3000);
    }

    window.SVToast = {
        show,
        clear: removeToast
    };
})();
