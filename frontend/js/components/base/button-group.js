(function initSalesButtonGroupComponent() {
    const REGISTRY = new Map();

    function resolveElement(target) {
        if (!target) return null;
        if (typeof target === 'string') return document.getElementById(target);
        return target instanceof HTMLElement ? target : null;
    }

    function getKey(button) {
        return button.id || button.dataset.role || button.textContent.trim();
    }

    function enhance(target) {
        const container = resolveElement(target);
        if (!container) return null;

        const groupId = container.id || `sv-button-group-${REGISTRY.size + 1}`;
        if (REGISTRY.has(groupId)) return REGISTRY.get(groupId);

        container.classList.add('sv-button-group');

        const buttons = new Map();
        Array.from(container.querySelectorAll('button')).forEach(button => {
            const key = getKey(button);
            buttons.set(key, button);
            button.dataset.svButtonKey = key;
        });

        const api = {
            id: groupId,
            element: container,
            getButton(key) {
                return buttons.get(key) || null;
            },
            setDisabled(key, disabled) {
                const button = api.getButton(key);
                if (!button) return api;
                button.disabled = Boolean(disabled);
                button.classList.toggle('is-disabled', Boolean(disabled));
                return api;
            },
            setLoading(key, loading, loadingText = 'Procesando...') {
                const button = api.getButton(key);
                if (!button) return api;

                if (loading) {
                    if (!button.dataset.originalHtml) {
                        button.dataset.originalHtml = button.innerHTML;
                    }
                    button.innerHTML = `<span class="sv-button-spinner" aria-hidden="true"></span><span>${loadingText}</span>`;
                    api.setDisabled(key, true);
                    button.classList.add('is-loading');
                    return api;
                }

                if (button.dataset.originalHtml) {
                    button.innerHTML = button.dataset.originalHtml;
                    delete button.dataset.originalHtml;
                }
                button.classList.remove('is-loading');
                button.disabled = false;
                button.classList.remove('is-disabled');
                return api;
            }
        };

        REGISTRY.set(groupId, api);
        return api;
    }

    window.SVButtonGroup = {
        enhance,
        get(id) {
            return REGISTRY.get(id) || null;
        }
    };
})();
