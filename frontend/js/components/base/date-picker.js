(function initSalesDatePickerComponent() {
    const REGISTRY = new Map();
    const DEFAULT_OPTIONS = {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd/m/Y',
        locale: 'es',
        allowInput: true
    };

    function resolveElement(target) {
        if (!target) return null;
        if (typeof target === 'string') return document.getElementById(target);
        return target instanceof HTMLElement ? target : null;
    }

    function enhance(target, options = {}) {
        const input = resolveElement(target);
        if (!input || typeof flatpickr !== 'function') return null;

        const pickerId = input.id || options.id || `sv-date-picker-${REGISTRY.size + 1}`;
        if (REGISTRY.has(pickerId)) return REGISTRY.get(pickerId);

        const instance = flatpickr(input, {
            ...DEFAULT_OPTIONS,
            ...options
        });

        const api = {
            id: pickerId,
            element: input,
            instance,
            getValue() {
                return input.value || '';
            },
            setValue(value, triggerChange = false) {
                if (!value) {
                    instance.clear(triggerChange);
                    return api;
                }
                instance.setDate(value, triggerChange, DEFAULT_OPTIONS.dateFormat);
                return api;
            },
            clear(triggerChange = false) {
                instance.clear(triggerChange);
                return api;
            },
            focus() {
                instance.altInput?.focus?.();
                return api;
            }
        };

        REGISTRY.set(pickerId, api);
        return api;
    }

    function get(target) {
        const input = resolveElement(target);
        if (!input) return null;
        return REGISTRY.get(input.id) || null;
    }

    window.SVDatePicker = {
        enhance,
        get
    };
})();
