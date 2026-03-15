(function initSalesEntityPickerComponent() {
    const REGISTRY = new Map();

    function resolveElement(target) {
        if (!target) return null;
        if (typeof target === 'string') return document.getElementById(target);
        return target instanceof HTMLElement ? target : null;
    }

    function enhance(target, options = {}) {
        const root = resolveElement(target);
        if (!root) return null;

        const pickerId = root.id || options.id || `sv-entity-picker-${REGISTRY.size + 1}`;
        if (REGISTRY.has(pickerId)) return REGISTRY.get(pickerId);

        const input = root.querySelector(options.inputSelector || 'input[type="text"]');
        const clearButton = root.querySelector(options.clearSelector || '[data-role="clear"]');
        const detail = root.querySelector(options.detailSelector || '[data-role="detail"]');
        const status = root.querySelector(options.statusSelector || '[data-role="status"]');

        root.classList.add('sv-entity-picker');
        if (input) {
            input.classList.add('sv-entity-picker-input');
        }

        const defaultLabel = options.defaultLabel || (input?.value || 'Sin seleccion');

        const api = {
            id: pickerId,
            element: root,
            input,
            clearButton,
            detail,
            status,
            setEntity(entity = null) {
                const hasEntity = Boolean(entity);
                if (input) {
                    input.value = hasEntity
                        ? (options.getLabel ? options.getLabel(entity) : (entity.nombre || entity.label || 'Seleccionado'))
                        : defaultLabel;
                }

                if (status) {
                    status.textContent = hasEntity
                        ? (options.getStatus ? options.getStatus(entity) : 'Cliente seleccionado')
                        : (options.emptyStatus || 'Venta a contado');
                }

                if (detail) {
                    detail.innerHTML = hasEntity
                        ? (options.renderDetail ? options.renderDetail(entity) : '')
                        : (options.emptyDetail || '');
                    detail.classList.toggle('is-empty', !hasEntity);
                }

                if (clearButton) {
                    clearButton.textContent = hasEntity
                        ? (options.clearLabel || 'Limpiar')
                        : (options.emptyActionLabel || clearButton.textContent || 'Contado');
                }

                root.dataset.hasEntity = hasEntity ? 'true' : 'false';
                return api;
            }
        };

        REGISTRY.set(pickerId, api);
        api.setEntity(null);
        return api;
    }

    window.SVEntityPicker = {
        enhance,
        get(id) {
            return REGISTRY.get(id) || null;
        }
    };
})();
