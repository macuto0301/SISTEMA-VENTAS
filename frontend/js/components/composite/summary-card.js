(function initSalesSummaryCardComponent() {
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    window.SVSummaryCard = {
        createHtml(options = {}) {
            const {
                title = '',
                value = '',
                meta = '',
                variant = 'neutral',
                content = ''
            } = options;

            return `
                <div class="sv-summary-card" data-variant="${escapeHtml(variant)}">
                    ${content ? `<div class="sv-summary-card-content">${content}</div>` : ''}
                    ${title ? `<small class="sv-summary-card-title">${escapeHtml(title)}</small>` : ''}
                    ${value ? `<strong class="sv-summary-card-value">${escapeHtml(value)}</strong>` : ''}
                    ${meta ? `<div class="sv-summary-card-meta">${meta}</div>` : ''}
                </div>
            `;
        }
    };
})();
