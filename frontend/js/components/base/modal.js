(function initSalesModalComponent() {
    const REGISTRY = new Map();

    function getOpenModalCount() {
        return document.querySelectorAll('.modal[data-sv-open="true"]').length;
    }

    function syncBodyState() {
        if (getOpenModalCount() > 0) {
            document.body.classList.add('modal-open');
            return;
        }
        document.body.classList.remove('modal-open');
    }

    function resolveElement(target) {
        if (!target) return null;
        if (typeof target === 'string') return document.getElementById(target);
        return target instanceof HTMLElement ? target : null;
    }

    function enhance(target, options = {}) {
        const modal = resolveElement(target);
        if (!modal) return null;

        const modalId = modal.id || options.id || `sv-modal-${REGISTRY.size + 1}`;
        if (REGISTRY.has(modalId)) return REGISTRY.get(modalId);

        const content = modal.querySelector(options.contentSelector || '.modal-content');
        const title = modal.querySelector(options.titleSelector || 'h2, h3');
        const closeButton = modal.querySelector(options.closeSelector || '.close');
        const dismissible = options.dismissible !== false;
        const backdropDismissible = options.backdropDismissible !== false && dismissible;
        const escapeDismissible = options.escapeDismissible !== false && dismissible;

        const api = {
            id: modalId,
            element: modal,
            content,
            title,
            closeButton,
            open() {
                modal.style.display = 'block';
                modal.dataset.svOpen = 'true';
                modal.setAttribute('aria-hidden', 'false');
                syncBodyState();
                if (typeof options.onOpen === 'function') {
                    options.onOpen(api);
                }
                return api;
            },
            close() {
                modal.style.display = 'none';
                modal.dataset.svOpen = 'false';
                modal.setAttribute('aria-hidden', 'true');
                api.setBusy(false);
                syncBodyState();
                if (typeof options.onClose === 'function') {
                    options.onClose(api);
                }
                return api;
            },
            isOpen() {
                return modal.dataset.svOpen === 'true';
            },
            setTitle(text) {
                if (title) title.textContent = text;
                return api;
            },
            setBusy(isBusy, message = 'Procesando...') {
                if (!content) return api;
                content.classList.toggle('sv-modal-content-busy', Boolean(isBusy));
                content.setAttribute('data-busy-message', message);
                return api;
            },
            focusFirstField() {
                const field = modal.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
                if (field && typeof field.focus === 'function') {
                    field.focus();
                }
                return api;
            }
        };

        if (closeButton) {
            closeButton.addEventListener('click', () => api.close());
        }

        if (backdropDismissible) {
            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    api.close();
                }
            });
        }

        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            if (!escapeDismissible || !api.isOpen()) return;
            event.preventDefault();
            api.close();
        });

        modal.classList.add('sv-modal');
        modal.setAttribute('aria-hidden', modal.style.display === 'block' ? 'false' : 'true');
        modal.dataset.svOpen = modal.style.display === 'block' ? 'true' : 'false';

        REGISTRY.set(modalId, api);
        return api;
    }

    window.SVModal = {
        enhance,
        get(id) {
            return REGISTRY.get(id) || null;
        }
    };
})();
