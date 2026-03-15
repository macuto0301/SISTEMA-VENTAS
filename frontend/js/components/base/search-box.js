(function initSalesSearchBoxComponent() {
    const REGISTRY = new Map();

    function resolveElement(target) {
        if (!target) return null;
        if (typeof target === 'string') return document.getElementById(target);
        return target instanceof HTMLElement ? target : null;
    }

    function enhance(target, options = {}) {
        const input = resolveElement(target);
        if (!input) return null;

        const searchId = input.id || options.id || `sv-search-${REGISTRY.size + 1}`;
        if (REGISTRY.has(searchId)) return REGISTRY.get(searchId);

        const wrapper = document.createElement('div');
        wrapper.className = 'sv-searchbox';
        wrapper.style.width = options.fullWidth ? '100%' : '';

        const parent = input.parentNode;
        parent.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        input.classList.add('sv-searchbox-input');

        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'sv-searchbox-clear';
        clearButton.setAttribute('aria-label', 'Limpiar busqueda');
        clearButton.textContent = '×';
        wrapper.appendChild(clearButton);

        const syncClearState = () => {
            clearButton.style.display = input.value ? 'inline-flex' : 'none';
        };

        clearButton.addEventListener('click', () => {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
            syncClearState();
        });

        input.addEventListener('input', syncClearState);
        syncClearState();

        const api = {
            id: searchId,
            element: input,
            wrapper,
            clear() {
                input.value = '';
                syncClearState();
                return api;
            },
            setValue(value) {
                input.value = value ?? '';
                syncClearState();
                return api;
            }
        };

        REGISTRY.set(searchId, api);
        return api;
    }

    window.SVSearchBox = {
        enhance,
        get(id) {
            return REGISTRY.get(id) || null;
        }
    };
})();
