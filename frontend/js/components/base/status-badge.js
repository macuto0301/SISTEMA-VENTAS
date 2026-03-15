(function initSalesStatusBadgeComponent() {
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    window.SVStatusBadge = {
        createHtml(label, variant = 'neutral') {
            return `<span class="sv-status-badge" data-variant="${escapeHtml(variant)}">${escapeHtml(label)}</span>`;
        }
    };
})();
