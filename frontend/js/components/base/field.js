(function initSalesFieldComponent() {
    const REGISTRY = new Map();

    function resolveElement(target) {
        if (!target) return null;
        if (typeof target === 'string') return document.getElementById(target);
        return target instanceof HTMLElement ? target : null;
    }

    function ensureHelper(wrapper, className) {
        let node = wrapper.querySelector(`.${className}`);
        if (!node) {
            node = document.createElement('div');
            node.className = className;
            wrapper.appendChild(node);
        }
        return node;
    }

    function enhance(target, options = {}) {
        const input = resolveElement(target);
        if (!input) return null;

        const fieldId = input.id || options.id || `sv-field-${REGISTRY.size + 1}`;
        if (REGISTRY.has(fieldId)) return REGISTRY.get(fieldId);

        const wrapper = input.closest(options.wrapperSelector || '.form-group') || input.parentElement;
        const label = wrapper?.querySelector(`label[for="${input.id}"]`) || null;
        const help = ensureHelper(wrapper, 'sv-field-help');
        const error = ensureHelper(wrapper, 'sv-field-error');

        if (wrapper) wrapper.classList.add('sv-field');
        if (label) label.classList.add('sv-field-label');
        input.classList.add('sv-field-control');

        const api = {
            id: fieldId,
            element: input,
            wrapper,
            label,
            getValue() {
                return input.value;
            },
            setValue(value) {
                input.value = value ?? '';
                api.clearError();
                return api;
            },
            setHelp(text = '') {
                help.textContent = text;
                help.style.display = text ? 'block' : 'none';
                return api;
            },
            setError(text = '') {
                error.textContent = text;
                error.style.display = text ? 'block' : 'none';
                input.classList.toggle('sv-field-control-error', Boolean(text));
                if (wrapper) wrapper.classList.toggle('sv-field-has-error', Boolean(text));
                return api;
            },
            clearError() {
                return api.setError('');
            },
            setDisabled(disabled) {
                input.disabled = Boolean(disabled);
                return api;
            },
            focus() {
                input.focus();
                return api;
            }
        };

        input.addEventListener('input', () => api.clearError());

        help.style.display = 'none';
        error.style.display = 'none';

        REGISTRY.set(fieldId, api);
        return api;
    }

    window.SVField = {
        enhance,
        get(id) {
            return REGISTRY.get(id) || null;
        }
    };
})();
