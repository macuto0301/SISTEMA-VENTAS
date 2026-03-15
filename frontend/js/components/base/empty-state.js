(function initSalesEmptyStateComponent() {
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    window.SVEmptyState = {
        createHtml(options = {}) {
            const {
                title = 'Sin datos disponibles',
                description = '',
                icon = '::'
            } = options;

            return `
                <div class="sv-empty-state">
                    <div class="sv-empty-state-icon" aria-hidden="true">${escapeHtml(icon)}</div>
                    <strong>${escapeHtml(title)}</strong>
                    ${description ? `<p>${escapeHtml(description)}</p>` : ''}
                </div>
            `;
        }
    };
})();
