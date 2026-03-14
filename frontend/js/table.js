// ============================================
// MODELO REUTILIZABLE DE TABLAS
// ============================================

(function initSalesTableSystem() {
    const TABLES = new Map();
    const STORAGE_PREFIX = 'sv_table_';
    let activeTableId = null;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function slugify(value) {
        return String(value || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'vista';
    }

    function readStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn('No se pudo guardar estado de tabla', error);
        }
    }

    function getValueByPath(row, path) {
        if (!path) return undefined;
        return String(path).split('.').reduce((current, segment) => {
            if (current == null) return undefined;
            return current[segment];
        }, row);
    }

    function normalizeText(value) {
        return String(value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function formatNumber(value, decimals = 2) {
        const number = Number(value || 0);
        return Number.isFinite(number) ? number.toFixed(decimals) : '0.00';
    }

    function formatDate(value) {
        if (!value) return '-';
        if (typeof Utils !== 'undefined' && typeof Utils.formatearFechaHora === 'function') {
            const parsed = Utils.formatearFechaHora(value);
            if (parsed && parsed !== 'Invalid Date') return parsed;
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('es-ES');
    }

    function buildCsv(rows, columns) {
        const header = columns.map(column => `"${String(column.label || '').replace(/"/g, '""')}"`).join(',');
        const lines = rows.map(row => columns.map(column => {
            const raw = getExportValue(column, row);
            return `"${String(raw ?? '').replace(/"/g, '""')}"`;
        }).join(','));
        return [header, ...lines].join('\n');
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function getRawValue(column, row) {
        if (typeof column.value === 'function') return column.value(row);
        if (column.key) return getValueByPath(row, column.key);
        return undefined;
    }

    function getSortValue(column, row) {
        if (typeof column.sortValue === 'function') return column.sortValue(row);
        return getRawValue(column, row);
    }

    function getFilterValue(column, row) {
        if (typeof column.filterValue === 'function') return column.filterValue(row);
        return getRawValue(column, row);
    }

    function getSearchValue(column, row) {
        if (typeof column.searchValue === 'function') return column.searchValue(row);
        const raw = getRawValue(column, row);
        if (Array.isArray(raw)) return raw.join(' ');
        return raw;
    }

    function getExportValue(column, row) {
        if (typeof column.exportValue === 'function') return column.exportValue(row);
        const raw = getRawValue(column, row);
        if (Array.isArray(raw)) return raw.join(', ');
        return raw;
    }

    function compareValues(left, right) {
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;

        const leftNumber = Number(left);
        const rightNumber = Number(right);
        if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
            return leftNumber - rightNumber;
        }

        return String(left).localeCompare(String(right), 'es', { numeric: true, sensitivity: 'base' });
    }

    function getRemotePagination(instance) {
        if (!instance.config.remotePagination || instance.config.remotePagination.enabled !== true) {
            return null;
        }

        const remote = instance.config.remotePagination;
        return {
            page: Number(remote.page || instance.state.page || 1),
            pageSize: Number(remote.pageSize || instance.state.pageSize || 10),
            total: Number(remote.total || 0),
            totalPages: Number(remote.totalPages || 0),
            onPageChange: typeof remote.onPageChange === 'function' ? remote.onPageChange : null,
            onPageSizeChange: typeof remote.onPageSizeChange === 'function' ? remote.onPageSizeChange : null,
            onQueryChange: typeof remote.onQueryChange === 'function' ? remote.onQueryChange : null
        };
    }

    function getRemoteQueryPayload(instance) {
        return {
            page: instance.state.page,
            pageSize: instance.state.pageSize,
            search: instance.state.search,
            filters: { ...instance.state.filters },
            instance
        };
    }

    function getDefaultState(config, persisted) {
        const visibleColumns = {};
        (config.columns || []).forEach(column => {
            visibleColumns[column.id] = column.visible !== false;
        });

        return {
            search: persisted?.search || '',
            draftSearch: persisted?.search || '',
            sort: persisted?.sort || { columnId: config.defaultSort?.columnId || null, direction: config.defaultSort?.direction || 'asc' },
            page: 1,
            pageSize: persisted?.pageSize || config.pageSize || 10,
            filters: persisted?.filters || {},
            draftFilters: { ...(persisted?.filters || {}) },
            visibleColumns: { ...visibleColumns, ...(persisted?.visibleColumns || {}) },
            selectedIds: new Set(),
            showColumnPanel: false,
            showAuditPanel: false,
            activeView: persisted?.activeView || 'default'
        };
    }

    function getViewStorageKey(config) {
        return `${STORAGE_PREFIX}${config.id}_views`;
    }

    function getStateStorageKey(config) {
        return `${STORAGE_PREFIX}${config.id}_state`;
    }

    function getAuditStorageKey(config) {
        return `${STORAGE_PREFIX}${config.id}_audit`;
    }

    function getSavedViews(config) {
        return readStorage(getViewStorageKey(config), []);
    }

    function saveSavedViews(config, views) {
        writeStorage(getViewStorageKey(config), views);
    }

    function getAuditEntries(config) {
        return readStorage(getAuditStorageKey(config), []);
    }

    function saveAuditEntries(config, entries) {
        writeStorage(getAuditStorageKey(config), entries.slice(0, 25));
    }

    function buildViewPayload(instance) {
        return {
            search: instance.state.search,
            sort: instance.state.sort,
            pageSize: instance.state.pageSize,
            filters: instance.state.filters,
            visibleColumns: instance.state.visibleColumns
        };
    }

    function applyViewState(instance, view) {
        instance.state.search = view.search || '';
        instance.state.draftSearch = view.search || '';
        instance.state.sort = view.sort || { columnId: null, direction: 'asc' };
        instance.state.pageSize = view.pageSize || 10;
        instance.state.filters = view.filters || {};
        instance.state.draftFilters = { ...(view.filters || {}) };
        instance.state.visibleColumns = {
            ...instance.state.visibleColumns,
            ...(view.visibleColumns || {})
        };
        instance.state.page = 1;
    }

    function logAudit(instance, action, detail) {
        if (instance.config.audit === false) return;

        const entries = getAuditEntries(instance.config);
        entries.unshift({
            action,
            detail,
            at: new Date().toLocaleString('es-ES')
        });
        saveAuditEntries(instance.config, entries);
    }

    function getVisibleColumns(instance) {
        return instance.config.columns.filter(column => instance.state.visibleColumns[column.id] !== false);
    }

    function getFilterOptions(instance, column) {
        if (typeof column.filterOptions === 'function') return column.filterOptions(instance.rows);
        const values = new Set();
        instance.rows.forEach(row => {
            const value = getFilterValue(column, row);
            if (value != null && value !== '') values.add(String(value));
        });
        return Array.from(values).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    }

    function filterRows(instance) {
        const searchableColumns = instance.config.columns.filter(column => column.searchable !== false && column.type !== 'actions');
        const search = normalizeText(instance.state.search);

        return instance.rows.filter(row => {
            const passesGlobalSearch = !search || searchableColumns.some(column => normalizeText(getSearchValue(column, row)).includes(search));
            if (!passesGlobalSearch) return false;

            return instance.config.columns.every(column => {
                if (!column.filterable) return true;
                const currentFilter = instance.state.filters[column.id];
                if (!currentFilter) return true;

                const value = getFilterValue(column, row);
                if (column.filterType === 'select') {
                    return String(value ?? '') === String(currentFilter);
                }

                return normalizeText(value).includes(normalizeText(currentFilter));
            });
        });
    }

    function sortRows(instance, rows) {
        const { columnId, direction } = instance.state.sort;
        if (!columnId) return rows;

        const column = instance.config.columns.find(item => item.id === columnId);
        if (!column) return rows;

        const multiplier = direction === 'desc' ? -1 : 1;
        return [...rows].sort((left, right) => compareValues(getSortValue(column, left), getSortValue(column, right)) * multiplier);
    }

    function paginateRows(instance, rows) {
        const remote = getRemotePagination(instance);
        if (remote) {
            const totalPages = Math.max(1, remote.totalPages || 1);
            instance.state.page = Math.min(Math.max(remote.page, 1), totalPages);
            instance.state.pageSize = remote.pageSize;
            return {
                totalPages,
                totalRows: remote.total,
                pageRows: rows
            };
        }

        const pageSize = Number(instance.state.pageSize || 10);
        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        if (instance.state.page > totalPages) instance.state.page = totalPages;
        const start = (instance.state.page - 1) * pageSize;
        return {
            totalPages,
            totalRows: rows.length,
            pageRows: rows.slice(start, start + pageSize)
        };
    }

    function persistState(instance) {
        writeStorage(getStateStorageKey(instance.config), {
            ...buildViewPayload(instance),
            activeView: instance.state.activeView
        });
    }

    function renderBadge(value, tone) {
        const safeValue = escapeHtml(value);
        const toneClass = tone ? ` sv-table-badge--${escapeHtml(tone)}` : '';
        return `<span class="sv-table-badge${toneClass}">${safeValue}</span>`;
    }

    function renderCell(instance, column, row) {
        if (column.type === 'actions') {
            const html = typeof column.render === 'function' ? column.render(row, instance) : '';
            return `<div class="sv-table-actions">${html}</div>`;
        }

        if (column.editable) {
            const rawValue = getRawValue(column, row);
            const inputType = column.editable.type || 'text';
            if (inputType === 'select') {
                const options = (column.editable.options || []).map(option => {
                    const optionValue = typeof option === 'object' ? option.value : option;
                    const optionLabel = typeof option === 'object' ? option.label : option;
                    const selected = String(optionValue) === String(rawValue) ? ' selected' : '';
                    return `<option value="${escapeHtml(optionValue)}"${selected}>${escapeHtml(optionLabel)}</option>`;
                }).join('');
                return `<select class="sv-table-inline-input" data-inline-edit="${escapeHtml(column.id)}">${options}</select>`;
            }

            return `<input class="sv-table-inline-input" data-inline-edit="${escapeHtml(column.id)}" type="${escapeHtml(inputType)}" value="${escapeHtml(rawValue ?? '')}">`;
        }

        if (typeof column.render === 'function') {
            return column.allowHtml ? column.render(row, instance) : escapeHtml(column.render(row, instance));
        }

        const rawValue = getRawValue(column, row);
        if (column.type === 'badge') {
            const tone = typeof column.badgeTone === 'function' ? column.badgeTone(row) : column.badgeTone;
            return renderBadge(rawValue ?? '-', tone);
        }

        if (column.type === 'money') {
            return `<span class="sv-table-money">${escapeHtml(column.currency || '$')} ${formatNumber(rawValue, column.decimals ?? 2)}</span>`;
        }

        if (column.type === 'date') {
            return escapeHtml(formatDate(rawValue));
        }

        return escapeHtml(rawValue ?? '-');
    }

    function renderFilters(instance) {
        const filterableColumns = instance.config.columns.filter(column => column.filterable);
        if (filterableColumns.length === 0) return '';

        return `
            <div class="sv-table-filters" aria-label="Filtros por columna">
                ${filterableColumns.map(column => {
                    const currentValue = instance.state.filters[column.id] || '';
                    const draftValue = instance.state.draftFilters[column.id] || '';
                    if (column.filterType === 'select') {
                        const options = getFilterOptions(instance, column).map(option => `
                            <option value="${escapeHtml(option)}"${String(currentValue) === String(option) ? ' selected' : ''}>${escapeHtml(option)}</option>
                        `).join('');
                        return `
                            <label class="sv-table-filter-field">
                                <span>${escapeHtml(column.label)}</span>
                                <select data-filter-column="${escapeHtml(column.id)}" aria-label="Filtrar por ${escapeHtml(column.label)}">
                                    <option value="">Todos</option>
                                    ${options}
                                </select>
                            </label>
                        `;
                    }

                    return `
                        <label class="sv-table-filter-field">
                            <span>${escapeHtml(column.label)}</span>
                            <input type="text" value="${escapeHtml(draftValue)}" data-filter-column="${escapeHtml(column.id)}" placeholder="Filtrar ${escapeHtml(column.label.toLowerCase())}" aria-label="Filtrar por ${escapeHtml(column.label)}">
                        </label>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderColumnPanel(instance) {
        if (instance.config.columnConfig === false) return '';

        const hiddenClass = instance.state.showColumnPanel ? '' : ' sv-table-panel--hidden';
        return `
            <div class="sv-table-panel${hiddenClass}" data-panel="columns">
                <div class="sv-table-panel-header">
                    <strong>Columnas</strong>
                    <button type="button" class="sv-table-chip" data-close-panel="columns">Cerrar</button>
                </div>
                <div class="sv-table-column-list">
                    ${instance.config.columns.filter(column => column.hideable !== false).map(column => `
                        <label class="sv-table-checkline">
                            <input type="checkbox" data-toggle-column="${escapeHtml(column.id)}"${instance.state.visibleColumns[column.id] !== false ? ' checked' : ''}>
                            <span>${escapeHtml(column.label)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderAuditPanel(instance) {
        const hiddenClass = instance.state.showAuditPanel ? '' : ' sv-table-panel--hidden';
        const entries = getAuditEntries(instance.config);

        return `
            <div class="sv-table-panel${hiddenClass}" data-panel="audit">
                <div class="sv-table-panel-header">
                    <strong>Auditoria basica</strong>
                    <button type="button" class="sv-table-chip" data-close-panel="audit">Cerrar</button>
                </div>
                <div class="sv-table-audit-list">
                    ${entries.length === 0 ? '<div class="sv-table-empty-inline">Sin registros recientes.</div>' : entries.slice(0, 10).map(entry => `
                        <div class="sv-table-audit-item">
                            <strong>${escapeHtml(entry.action)}</strong>
                            <span>${escapeHtml(entry.detail)}</span>
                            <small>${escapeHtml(entry.at)}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderToolbar(instance, rows) {
        const remote = getRemotePagination(instance);
        const views = getSavedViews(instance.config);
        const selectedCount = instance.state.selectedIds.size;
        const totalLabel = remote ? `${rows.length} en pagina / ${remote.total} total` : `${rows.length} registros`;
        const viewOptions = [`<option value="default">Vista actual</option>`]
            .concat(views.map(view => `<option value="${escapeHtml(view.id)}"${instance.state.activeView === view.id ? ' selected' : ''}>${escapeHtml(view.name)}</option>`))
            .join('');

        return `
            <div class="sv-table-toolbar">
                <div class="sv-table-toolbar-group">
                    <label class="sv-table-search">
                        <span class="sv-sr-only">Busqueda global</span>
                        <input type="search" value="${escapeHtml(instance.state.draftSearch)}" data-search-input placeholder="${escapeHtml(instance.config.searchPlaceholder || 'Buscar en la tabla')}" aria-label="Busqueda global en tabla">
                    </label>
                    <span class="sv-table-counter" title="Filas visibles tras aplicar filtros">${escapeHtml(totalLabel)}</span>
                    <span class="sv-table-counter${selectedCount > 0 ? ' is-active' : ''}" title="Filas seleccionadas">${selectedCount} seleccionados</span>
                </div>
                <div class="sv-table-toolbar-group">
                    <select data-view-select aria-label="Vistas guardadas">
                        ${viewOptions}
                    </select>
                    <button type="button" class="sv-table-chip" data-save-view title="Guardar vista actual">Guardar vista</button>
                    <button type="button" class="sv-table-chip" data-delete-view${instance.state.activeView === 'default' ? ' disabled' : ''} title="Eliminar vista guardada">Eliminar vista</button>
                    <button type="button" class="sv-table-chip" data-toggle-panel="columns" title="Configurar columnas">Columnas</button>
                    <button type="button" class="sv-table-chip" data-toggle-panel="audit" title="Ver auditoria basica">Auditoria</button>
                    <button type="button" class="sv-table-chip" data-export="csv" title="Exportar CSV">CSV</button>
                    <button type="button" class="sv-table-chip" data-export="excel" title="Exportar Excel">Excel</button>
                    <label class="sv-table-page-size">
                        <span>Filas</span>
                        <select data-page-size aria-label="Filas por pagina">
                            ${(instance.config.pageSizeOptions || [10, 25, 50, 100]).map(option => `
                                <option value="${option}"${Number(instance.state.pageSize) === Number(option) ? ' selected' : ''}>${option}</option>
                            `).join('')}
                        </select>
                    </label>
                </div>
            </div>
        `;
    }

    function renderBulkActions(instance, selectedRows) {
        const actions = instance.config.bulkActions || [];
        if (actions.length === 0) return '';

        return `
            <div class="sv-table-bulkbar${selectedRows.length === 0 ? ' sv-table-bulkbar--disabled' : ''}">
                <span>${selectedRows.length} filas seleccionadas</span>
                <div class="sv-table-toolbar-group">
                    ${actions.map(action => `
                        <button type="button" class="sv-table-chip" data-bulk-action="${escapeHtml(action.id)}"${selectedRows.length === 0 ? ' disabled' : ''} title="${escapeHtml(action.label)}">
                            ${escapeHtml(action.label)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderTable(instance) {
        const filteredRows = sortRows(instance, filterRows(instance));
        const { totalPages, totalRows, pageRows } = paginateRows(instance, filteredRows);
        const visibleColumns = getVisibleColumns(instance);
        const selectedRows = filteredRows.filter(row => instance.state.selectedIds.has(String(instance.getRowId(row))));

        persistState(instance);

        const headers = visibleColumns.map(column => {
            const isSorted = instance.state.sort.columnId === column.id;
            const nextDirection = isSorted && instance.state.sort.direction === 'asc' ? 'desc' : 'asc';
            const ariaSort = isSorted ? (instance.state.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
            const sortable = column.sortable !== false && column.type !== 'actions';
            const alignClass = column.align ? ` sv-table-cell--${escapeHtml(column.align)}` : '';
            return `
                <th scope="col" class="${alignClass}" aria-sort="${ariaSort}">
                    ${sortable ? `
                        <button type="button" class="sv-table-sort" data-sort-column="${escapeHtml(column.id)}" data-sort-direction="${escapeHtml(nextDirection)}" title="Ordenar por ${escapeHtml(column.label)}">
                            <span>${escapeHtml(column.label)}</span>
                            <span class="sv-table-sort-icon">${isSorted ? (instance.state.sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </button>
                    ` : `<span title="${escapeHtml(column.label)}">${escapeHtml(column.label)}</span>`}
                </th>
            `;
        }).join('');

        const body = instance.loading ? `
            <tr>
                <td colspan="${visibleColumns.length + (instance.config.selectable ? 1 : 0)}">
                    <div class="sv-table-loading">${escapeHtml(instance.config.loadingText || 'Cargando datos...')}</div>
                </td>
            </tr>
        ` : pageRows.length === 0 ? `
            <tr>
                <td colspan="${visibleColumns.length + (instance.config.selectable ? 1 : 0)}">
                    <div class="sv-table-empty">${escapeHtml(instance.config.emptyState || 'No hay datos para mostrar')}</div>
                </td>
            </tr>
        ` : pageRows.map(row => {
            const rowId = String(instance.getRowId(row));
            const checked = instance.state.selectedIds.has(rowId);
            return `
                <tr data-row-id="${escapeHtml(rowId)}" class="${checked ? 'is-selected' : ''}">
                    ${instance.config.selectable ? `
                        <td class="sv-table-selection-cell">
                            <input type="checkbox" data-select-row="${escapeHtml(rowId)}" aria-label="Seleccionar fila"${checked ? ' checked' : ''}>
                        </td>
                    ` : ''}
                    ${visibleColumns.map(column => {
                        const alignClass = column.align ? ` sv-table-cell--${escapeHtml(column.align)}` : '';
                        const tooltip = getExportValue(column, row);
                        return `<td class="${alignClass}" title="${escapeHtml(tooltip ?? '')}">${renderCell(instance, column, row)}</td>`;
                    }).join('')}
                </tr>
            `;
        }).join('');

        const allPageSelected = pageRows.length > 0 && pageRows.every(row => instance.state.selectedIds.has(String(instance.getRowId(row))));

        const pagination = `
            <div class="sv-table-pagination">
                <span>Pagina ${instance.state.page} de ${totalPages} - ${totalRows} registros</span>
                <div class="sv-table-toolbar-group">
                    <button type="button" class="sv-table-chip" data-page="first"${instance.state.page === 1 ? ' disabled' : ''}>Inicio</button>
                    <button type="button" class="sv-table-chip" data-page="prev"${instance.state.page === 1 ? ' disabled' : ''}>Anterior</button>
                    <button type="button" class="sv-table-chip" data-page="next"${instance.state.page === totalPages ? ' disabled' : ''}>Siguiente</button>
                    <button type="button" class="sv-table-chip" data-page="last"${instance.state.page === totalPages ? ' disabled' : ''}>Fin</button>
                </div>
            </div>
        `;

        instance.container.innerHTML = `
            <section class="sv-table-shell" data-table-id="${escapeHtml(instance.config.id)}">
                ${renderToolbar(instance, filteredRows)}
                ${renderFilters(instance)}
                ${renderBulkActions(instance, selectedRows)}
                <div class="sv-table-panels">
                    ${renderColumnPanel(instance)}
                    ${renderAuditPanel(instance)}
                </div>
                <div class="sv-table-wrap" tabindex="0" aria-label="${escapeHtml(instance.config.ariaLabel || instance.config.title || 'Tabla de datos')}">
                    <table class="sv-table" role="grid" aria-label="${escapeHtml(instance.config.ariaLabel || instance.config.title || 'Tabla de datos')}">
                        <thead>
                            <tr>
                                ${instance.config.selectable ? `
                                    <th scope="col" class="sv-table-selection-cell">
                                        <input type="checkbox" data-select-all aria-label="Seleccionar todas las filas visibles"${allPageSelected ? ' checked' : ''}>
                                    </th>
                                ` : ''}
                                ${headers}
                            </tr>
                        </thead>
                        <tbody>
                            ${body}
                        </tbody>
                    </table>
                </div>
                ${pagination}
                <div class="sv-table-shortcuts">
                    Atajos: <kbd>/</kbd> buscar, <kbd>Esc</kbd> limpiar, <kbd>Alt</kbd> + <kbd>←</kbd>/<kbd>→</kbd> navegar.
                </div>
            </section>
        `;
    }

    function updateRows(instance, rows, loading) {
        instance.rows = Array.isArray(rows) ? rows : [];
        instance.loading = Boolean(loading);
        renderTable(instance);
    }

    function exportRows(instance, type, selectedOnly) {
        const visibleColumns = getVisibleColumns(instance).filter(column => column.exportable !== false && column.type !== 'actions');
        const baseRows = selectedOnly
            ? instance.rows.filter(row => instance.state.selectedIds.has(String(instance.getRowId(row))))
            : sortRows(instance, filterRows(instance));

        if (baseRows.length === 0) {
            if (typeof mostrarNotificacion === 'function') mostrarNotificacion('⚠️ No hay filas para exportar');
            return;
        }

        const filenameBase = `${instance.config.exportFileName || instance.config.id}-${new Date().toISOString().slice(0, 10)}`;
        if (type === 'csv') {
            const csv = buildCsv(baseRows, visibleColumns);
            downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filenameBase}.csv`);
        } else {
            const headerHtml = visibleColumns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('');
            const bodyHtml = baseRows.map(row => `
                <tr>${visibleColumns.map(column => `<td>${escapeHtml(getExportValue(column, row) ?? '')}</td>`).join('')}</tr>
            `).join('');
            const html = `
                <table>
                    <thead><tr>${headerHtml}</tr></thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            `;
            downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel' }), `${filenameBase}.xls`);
        }

        logAudit(instance, 'Exportacion', `${type.toUpperCase()}${selectedOnly ? ' seleccion' : ' completa'}`);
    }

    function handleBulkAction(instance, actionId) {
        const action = (instance.config.bulkActions || []).find(item => item.id === actionId);
        if (!action) return;

        const selectedRows = instance.rows.filter(row => instance.state.selectedIds.has(String(instance.getRowId(row))));
        action.handler(selectedRows, instance);
        logAudit(instance, 'Accion masiva', action.label);
        renderTable(instance);
    }

    function saveView(instance) {
        const viewName = prompt('Nombre para la vista guardada:');
        if (!viewName) return;

        const views = getSavedViews(instance.config);
        const viewId = slugify(viewName);
        const payload = buildViewPayload(instance);
        const existingIndex = views.findIndex(view => view.id === viewId);
        const newView = { id: viewId, name: viewName, ...payload };

        if (existingIndex >= 0) {
            views[existingIndex] = newView;
        } else {
            views.push(newView);
        }

        saveSavedViews(instance.config, views);
        instance.state.activeView = viewId;
        logAudit(instance, 'Vista guardada', viewName);
        renderTable(instance);
    }

    function deleteView(instance) {
        if (instance.state.activeView === 'default') return;
        const views = getSavedViews(instance.config).filter(view => view.id !== instance.state.activeView);
        saveSavedViews(instance.config, views);
        instance.state.activeView = 'default';
        logAudit(instance, 'Vista eliminada', 'Vista guardada removida');
        renderTable(instance);
    }

    function bindEvents(instance) {
        if (instance.bound) return;
        instance.bound = true;

        instance.container.addEventListener('input', event => {
            const searchInput = event.target.closest('[data-search-input]');
            if (searchInput) {
                instance.state.draftSearch = searchInput.value;
                return;
            }

            const filterInput = event.target.closest('[data-filter-column]');
            if (filterInput) {
                if (filterInput.tagName === 'INPUT') {
                    instance.state.draftFilters[filterInput.dataset.filterColumn] = filterInput.value;
                    return;
                }

                instance.state.draftFilters[filterInput.dataset.filterColumn] = filterInput.value;
                instance.state.filters[filterInput.dataset.filterColumn] = filterInput.value;
                instance.state.page = 1;
                logAudit(instance, 'Filtro', `${filterInput.dataset.filterColumn}: ${filterInput.value || 'todos'}`);
                const remote = getRemotePagination(instance);
                if (remote && remote.onQueryChange) {
                    remote.onQueryChange(getRemoteQueryPayload(instance));
                    return;
                }
                renderTable(instance);
                return;
            }

            const inlineInput = event.target.closest('[data-inline-edit]');
            if (inlineInput) {
                const rowElement = inlineInput.closest('[data-row-id]');
                const row = instance.rows.find(item => String(instance.getRowId(item)) === rowElement?.dataset.rowId);
                const column = instance.config.columns.find(item => item.id === inlineInput.dataset.inlineEdit);
                if (!row || !column?.editable || typeof column.editable.update !== 'function') return;
                column.editable.update(row, inlineInput.value, instance);
                logAudit(instance, 'Edicion inline', column.label);
                renderTable(instance);
            }
        });

        instance.container.addEventListener('change', event => {
            const pageSizeSelect = event.target.closest('[data-page-size]');
            if (pageSizeSelect) {
                const nextPageSize = Number(pageSizeSelect.value);
                const remote = getRemotePagination(instance);
                if (remote && remote.onPageSizeChange) {
                    remote.onPageSizeChange({
                        ...getRemoteQueryPayload(instance),
                        page: 1,
                        pageSize: nextPageSize
                    });
                    return;
                }

                instance.state.pageSize = nextPageSize;
                instance.state.page = 1;
                logAudit(instance, 'Paginacion', `${instance.state.pageSize} filas`);
                renderTable(instance);
                return;
            }

            const selectRow = event.target.closest('[data-select-row]');
            if (selectRow) {
                if (selectRow.checked) {
                    instance.state.selectedIds.add(selectRow.dataset.selectRow);
                } else {
                    instance.state.selectedIds.delete(selectRow.dataset.selectRow);
                }
                renderTable(instance);
                return;
            }

            const selectAll = event.target.closest('[data-select-all]');
            if (selectAll) {
                const filteredRows = sortRows(instance, filterRows(instance));
                const { pageRows } = paginateRows(instance, filteredRows);
                pageRows.forEach(row => {
                    const rowId = String(instance.getRowId(row));
                    if (selectAll.checked) {
                        instance.state.selectedIds.add(rowId);
                    } else {
                        instance.state.selectedIds.delete(rowId);
                    }
                });
                logAudit(instance, 'Seleccion', selectAll.checked ? 'Selecciono pagina completa' : 'Deselecciono pagina');
                renderTable(instance);
                return;
            }

            const viewSelect = event.target.closest('[data-view-select]');
            if (viewSelect) {
                instance.state.activeView = viewSelect.value;
                if (viewSelect.value === 'default') {
                    const persisted = readStorage(getStateStorageKey(instance.config), null);
                    if (persisted) applyViewState(instance, persisted);
                } else {
                    const view = getSavedViews(instance.config).find(item => item.id === viewSelect.value);
                    if (view) applyViewState(instance, view);
                }
                logAudit(instance, 'Vista aplicada', viewSelect.value);
                renderTable(instance);
                return;
            }

            const toggleColumn = event.target.closest('[data-toggle-column]');
            if (toggleColumn) {
                instance.state.visibleColumns[toggleColumn.dataset.toggleColumn] = toggleColumn.checked;
                logAudit(instance, 'Columnas', `${toggleColumn.dataset.toggleColumn}: ${toggleColumn.checked ? 'visible' : 'oculta'}`);
                renderTable(instance);
            }
        });

        instance.container.addEventListener('click', event => {
            activeTableId = instance.config.id;

            const sortButton = event.target.closest('[data-sort-column]');
            if (sortButton) {
                instance.state.sort = {
                    columnId: sortButton.dataset.sortColumn,
                    direction: sortButton.dataset.sortDirection
                };
                logAudit(instance, 'Ordenamiento', `${sortButton.dataset.sortColumn} ${sortButton.dataset.sortDirection}`);
                renderTable(instance);
                return;
            }

            const pageButton = event.target.closest('[data-page]');
            if (pageButton) {
                const remote = getRemotePagination(instance);
                const filteredRows = filterRows(instance);
                const totalPages = remote
                    ? Math.max(1, Number(remote.totalPages || 1))
                    : Math.max(1, Math.ceil(filteredRows.length / Number(instance.state.pageSize || 10)));
                let nextPage = instance.state.page;
                if (pageButton.dataset.page === 'first') nextPage = 1;
                if (pageButton.dataset.page === 'prev') nextPage = Math.max(1, instance.state.page - 1);
                if (pageButton.dataset.page === 'next') nextPage = Math.min(totalPages, instance.state.page + 1);
                if (pageButton.dataset.page === 'last') nextPage = totalPages;

                if (remote && remote.onPageChange) {
                    remote.onPageChange({
                        ...getRemoteQueryPayload(instance),
                        page: nextPage,
                        pageSize: instance.state.pageSize
                    });
                    return;
                }

                instance.state.page = nextPage;
                renderTable(instance);
                return;
            }

            const togglePanel = event.target.closest('[data-toggle-panel]');
            if (togglePanel) {
                const panel = togglePanel.dataset.togglePanel;
                if (panel === 'columns') instance.state.showColumnPanel = !instance.state.showColumnPanel;
                if (panel === 'audit') instance.state.showAuditPanel = !instance.state.showAuditPanel;
                renderTable(instance);
                return;
            }

            const closePanel = event.target.closest('[data-close-panel]');
            if (closePanel) {
                if (closePanel.dataset.closePanel === 'columns') instance.state.showColumnPanel = false;
                if (closePanel.dataset.closePanel === 'audit') instance.state.showAuditPanel = false;
                renderTable(instance);
                return;
            }

            const exportButton = event.target.closest('[data-export]');
            if (exportButton) {
                exportRows(instance, exportButton.dataset.export, false);
                return;
            }

            const bulkActionButton = event.target.closest('[data-bulk-action]');
            if (bulkActionButton) {
                handleBulkAction(instance, bulkActionButton.dataset.bulkAction);
                return;
            }

            if (event.target.closest('[data-save-view]')) {
                saveView(instance);
                return;
            }

            if (event.target.closest('[data-delete-view]')) {
                deleteView(instance);
            }
        });

        instance.container.addEventListener('keydown', event => {
            const searchInput = event.target.closest('[data-search-input]');
            if (searchInput && event.key === 'Enter') {
                event.preventDefault();
                instance.state.draftSearch = searchInput.value;
                instance.state.search = searchInput.value;
                instance.state.page = 1;
                logAudit(instance, 'Busqueda', instance.state.search || 'Busqueda limpiada');
                const remote = getRemotePagination(instance);
                if (remote && remote.onQueryChange) {
                    remote.onQueryChange(getRemoteQueryPayload(instance));
                    return;
                }
                renderTable(instance);
                return;
            }

            if (searchInput && event.key === 'Escape') {
                event.preventDefault();
                instance.state.draftSearch = '';
                instance.state.search = '';
                instance.state.page = 1;
                renderTable(instance);
                return;
            }

            const filterInput = event.target.closest('[data-filter-column]');
            if (filterInput && filterInput.tagName === 'INPUT' && event.key === 'Enter') {
                event.preventDefault();
                const columnId = filterInput.dataset.filterColumn;
                instance.state.draftFilters[columnId] = filterInput.value;
                instance.state.filters[columnId] = filterInput.value;
                instance.state.page = 1;
                logAudit(instance, 'Filtro', `${columnId}: ${filterInput.value || 'todos'}`);
                const remote = getRemotePagination(instance);
                if (remote && remote.onQueryChange) {
                    remote.onQueryChange(getRemoteQueryPayload(instance));
                    return;
                }
                renderTable(instance);
                return;
            }

            if (filterInput && filterInput.tagName === 'INPUT' && event.key === 'Escape') {
                event.preventDefault();
                const columnId = filterInput.dataset.filterColumn;
                instance.state.draftFilters[columnId] = '';
                instance.state.filters[columnId] = '';
                instance.state.page = 1;
                const remote = getRemotePagination(instance);
                if (remote && remote.onQueryChange) {
                    remote.onQueryChange(getRemoteQueryPayload(instance));
                    return;
                }
                renderTable(instance);
            }
        });

        instance.container.addEventListener('mouseenter', () => {
            activeTableId = instance.config.id;
        });
    }

    document.addEventListener('keydown', event => {
        if (!activeTableId || !TABLES.has(activeTableId)) return;
        const instance = TABLES.get(activeTableId);
        if (!instance) return;

        if (event.key === '/') {
            const input = instance.container.querySelector('[data-search-input]');
            if (input) {
                event.preventDefault();
                input.focus();
                input.select();
            }
        }

        if (event.key === 'Escape') {
            if (instance.state.search) {
                instance.state.search = '';
                instance.state.draftSearch = '';
                instance.state.page = 1;
                const remote = getRemotePagination(instance);
                if (remote && remote.onQueryChange) {
                    remote.onQueryChange(getRemoteQueryPayload(instance));
                    return;
                }
                renderTable(instance);
            }
        }

        if (event.altKey && event.key === 'ArrowRight') {
            const remote = getRemotePagination(instance);
            const filteredRows = filterRows(instance);
            const totalPages = remote
                ? Math.max(1, Number(remote.totalPages || 1))
                : Math.max(1, Math.ceil(filteredRows.length / Number(instance.state.pageSize || 10)));

            if (remote && remote.onPageChange) {
                remote.onPageChange({
                    ...getRemoteQueryPayload(instance),
                    page: Math.min(totalPages, instance.state.page + 1),
                    pageSize: instance.state.pageSize,
                });
                return;
            }

            instance.state.page = Math.min(totalPages, instance.state.page + 1);
            renderTable(instance);
        }

        if (event.altKey && event.key === 'ArrowLeft') {
            const remote = getRemotePagination(instance);
            if (remote && remote.onPageChange) {
                remote.onPageChange({
                    ...getRemoteQueryPayload(instance),
                    page: Math.max(1, instance.state.page - 1),
                    pageSize: instance.state.pageSize
                });
                return;
            }

            instance.state.page = Math.max(1, instance.state.page - 1);
            renderTable(instance);
        }
    });

    function createInstance(config) {
        const container = typeof config.container === 'string'
            ? document.getElementById(config.container)
            : config.container;

        if (!container) {
            console.warn('Contenedor de tabla no encontrado', config.id);
            return null;
        }

        const columns = (config.columns || []).map((column, index) => ({
            sortable: true,
            searchable: true,
            exportable: true,
            hideable: column.type !== 'actions',
            ...column,
            id: column.id || column.key || `column_${index}`
        }));

        const persistedState = readStorage(getStateStorageKey(config), null);
        const instance = {
            config: {
                pageSizeOptions: [10, 25, 50, 100],
                selectable: true,
                searchPlaceholder: 'Buscar registros',
                emptyState: 'No hay datos disponibles',
                loadingText: 'Cargando datos...',
                audit: true,
                ...config,
                columns
            },
            container,
            rows: Array.isArray(config.rows) ? config.rows : [],
            loading: Boolean(config.loading),
            bound: false,
            getRowId: config.rowId || (row => row.id)
        };

        instance.state = getDefaultState(instance.config, persistedState);
        TABLES.set(instance.config.id, instance);
        bindEvents(instance);
        renderTable(instance);
        return instance;
    }

    window.SVTable = {
        mount(config) {
            const existing = TABLES.get(config.id);
            if (existing) {
                const nextContainer = typeof config.container === 'string'
                    ? document.getElementById(config.container)
                    : config.container;

                if (nextContainer && nextContainer !== existing.container) {
                    existing.container = nextContainer;
                    existing.bound = false;
                    bindEvents(existing);
                }

                existing.config = {
                    ...existing.config,
                    ...config,
                    columns: (config.columns || existing.config.columns).map((column, index) => ({
                        sortable: true,
                        searchable: true,
                        exportable: true,
                        hideable: column.type !== 'actions',
                        ...column,
                        id: column.id || column.key || `column_${index}`
                    }))
                };
                if (config.remotePagination) {
                    existing.state.page = Number(config.remotePagination.page || existing.state.page || 1);
                    existing.state.pageSize = Number(config.remotePagination.pageSize || existing.state.pageSize || 10);
                }
                existing.rows = Array.isArray(config.rows) ? config.rows : existing.rows;
                existing.loading = Boolean(config.loading);
                existing.getRowId = config.rowId || existing.getRowId;
                renderTable(existing);
                return existing;
            }
            return createInstance(config);
        },
        setRows(id, rows, loading = false) {
            const instance = TABLES.get(id);
            if (!instance) return null;
            updateRows(instance, rows, loading);
            return instance;
        },
        setLoading(id, loading = true) {
            const instance = TABLES.get(id);
            if (!instance) return null;
            instance.loading = Boolean(loading);
            renderTable(instance);
            return instance;
        },
        exportSelected(id, type = 'csv') {
            const instance = TABLES.get(id);
            if (!instance) return;
            exportRows(instance, type, true);
        },
        clearSelection(id) {
            const instance = TABLES.get(id);
            if (!instance) return;
            instance.state.selectedIds.clear();
            renderTable(instance);
        },
        getInstance(id) {
            return TABLES.get(id) || null;
        }
    };
})();
