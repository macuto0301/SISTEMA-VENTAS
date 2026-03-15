(function initSalesMediaUploaderComponent() {
    const REGISTRY = new Map();

    function resolveElement(target) {
        if (!target) return null;
        if (typeof target === 'string') return document.getElementById(target);
        return target instanceof HTMLElement ? target : null;
    }

    function enhance(target, options = {}) {
        const root = resolveElement(target);
        if (!root) return null;

        const uploaderId = root.id || options.id || `sv-media-uploader-${REGISTRY.size + 1}`;
        if (REGISTRY.has(uploaderId)) return REGISTRY.get(uploaderId);

        const input = root.querySelector(options.inputSelector || 'input[type="file"]');
        const preview = root.querySelector(options.previewSelector || '[data-role="preview"]');
        const clearButton = root.querySelector(options.clearSelector || '[data-role="clear"]');
        const hint = root.querySelector(options.hintSelector || '[data-role="hint"]');
        const badge = root.querySelector(options.badgeSelector || '[data-role="badge"]');
        const emptyLabel = options.emptyLabel || 'Sin archivos cargados';
        const filledLabel = options.filledLabel || 'Archivos listos';

        root.classList.add('sv-media-uploader');
        if (preview) preview.classList.add('sv-media-uploader-preview');
        if (input) input.classList.add('sv-media-uploader-input');

        const api = {
            id: uploaderId,
            root,
            input,
            preview,
            clearButton,
            hint,
            badge,
            setCount(count = 0, label = '') {
                if (!badge) return api;
                const total = Number(count || 0);
                badge.textContent = label || (total > 0 ? `${total} archivo${total === 1 ? '' : 's'}` : filledLabel);
                badge.style.display = 'inline-flex';
                return api;
            },
            setEmpty(message = emptyLabel) {
                root.dataset.hasMedia = 'false';
                if (badge) {
                    badge.textContent = message;
                    badge.style.display = 'inline-flex';
                }
                return api;
            },
            setFilled(count = 1, label = '') {
                root.dataset.hasMedia = 'true';
                return api.setCount(count, label);
            },
            setHint(text = '') {
                if (!hint) return api;
                hint.textContent = text;
                return api;
            }
        };

        if (clearButton) {
            clearButton.classList.add('sv-media-uploader-clear');
        }

        api.setEmpty();
        REGISTRY.set(uploaderId, api);
        return api;
    }

    window.SVMediaUploader = {
        enhance,
        get(id) {
            return REGISTRY.get(id) || null;
        }
    };
})();
