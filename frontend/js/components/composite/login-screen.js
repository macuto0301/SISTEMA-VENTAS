(function initSalesLoginScreenComponent() {
    function createElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (typeof text === 'string') {
            element.textContent = text;
        }
        return element;
    }

    function createFeatureCard(label, title, description, accent) {
        const card = createElement('article', `login-feature-card${accent ? ' login-feature-card-accent' : ''}`);
        const kicker = createElement('span', 'login-feature-label', label);
        const heading = createElement('strong', '', title);
        const text = createElement('p', '', description);
        card.append(kicker, heading, text);
        return card;
    }

    function createMetricCard(label, value, description) {
        const card = createElement('article', 'login-metric-card');
        const kicker = createElement('span', 'login-metric-label', label);
        const strong = createElement('strong', 'login-metric-value', value);
        const text = createElement('p', '', description);
        card.append(kicker, strong, text);
        return card;
    }

    function buildShowcase() {
        const showcase = createElement('section', 'login-showcase');
        const header = createElement('div', 'login-showcase-header');
        const kicker = createElement('span', 'login-kicker', 'Sistema de Ventas');
        const title = createElement('h2', '', 'Control comercial con una entrada clara, rapida y segura.');
        const lead = createElement('p', 'login-lead', 'Accede al panel operativo para gestionar inventario, caja, clientes e indicadores del dia desde una misma vista.');
        header.append(kicker, title, lead);

        const grid = createElement('div', 'login-showcase-grid');
        grid.append(
            createFeatureCard('Operacion', 'Inventario, ventas y compras', 'Un flujo continuo para registrar movimientos sin perder contexto.', false),
            createFeatureCard('Visibilidad', 'Indicadores y trazabilidad', 'Consulta actividad diaria y usuarios activos desde el tablero principal.', true)
        );

        const footer = createElement('div', 'login-showcase-footer');
        const metrics = createElement('div', 'login-metric-list');
        metrics.append(
            createMetricCard('Acceso', '24/7', 'Sesion persistente con control por roles.'),
            createMetricCard('Vista', 'Modular', 'Estructura lista para crecer en JS puro.'),
            createMetricCard('Seguridad', 'Interna', 'Credenciales validadas contra la API del sistema.')
        );
        footer.appendChild(metrics);

        showcase.append(header, grid, footer);
        return showcase;
    }

    function buildPanel() {
        const panel = createElement('section', 'login-panel');
        panel.setAttribute('aria-labelledby', 'loginTitle');

        const brand = createElement('div', 'login-brand-mark');
        const logo = document.createElement('img');
        logo.src = 'assets/logo-sistema-ventas.webp';
        logo.alt = 'Logo Sistema de Ventas';
        logo.className = 'login-brand-logo';
        brand.appendChild(logo);

        const copy = createElement('div', 'login-panel-copy');
        copy.append(
            createElement('span', 'login-panel-kicker', 'Acceso interno')
        );

        const title = createElement('h1', '', 'Iniciar sesion');
        title.id = 'loginTitle';
        const description = createElement('p', '', 'Ingresa tus credenciales para continuar al centro de operaciones.');
        copy.append(title, description);

        const form = createElement('form', 'login-form');
        form.id = 'formLogin';
        form.noValidate = true;

        const userGroup = createElement('div', 'form-group login-form-group');
        const userLabel = createElement('label', '', 'Usuario');
        userLabel.htmlFor = 'loginUser';
        const userInput = document.createElement('input');
        userInput.type = 'text';
        userInput.id = 'loginUser';
        userInput.name = 'loginUser';
        userInput.required = true;
        userInput.placeholder = 'Nombre de usuario';
        userInput.autocomplete = 'username';
        userGroup.append(userLabel, userInput);

        const passGroup = createElement('div', 'form-group login-form-group');
        const passLabel = createElement('label', '', 'Contrasena');
        passLabel.htmlFor = 'loginPass';
        const passInput = document.createElement('input');
        passInput.type = 'password';
        passInput.id = 'loginPass';
        passInput.name = 'loginPass';
        passInput.required = true;
        passInput.placeholder = '••••••••';
        passInput.autocomplete = 'current-password';
        passGroup.append(passLabel, passInput);

        const feedback = createElement('div', 'login-feedback');
        feedback.id = 'loginFeedback';
        feedback.setAttribute('aria-live', 'polite');

        const actions = createElement('div', 'login-panel-actions');
        actions.id = 'loginActions';

        const submitButton = createElement('button', 'btn-primary btn-login');
        submitButton.type = 'submit';
        submitButton.id = 'btnLoginSubmit';
        const submitLabel = createElement('span', 'btn-login-label', 'Entrar al sistema');
        submitButton.appendChild(submitLabel);

        const demoButton = createElement('button', 'btn-secondary btn-login-demo');
        demoButton.type = 'button';
        demoButton.id = 'btnLoginDemo';
        demoButton.textContent = 'Usar acceso demo';
        demoButton.addEventListener('click', function () {
            userInput.value = 'demo-admin';
            passInput.value = '1234';
            feedback.textContent = 'Credenciales demo cargadas. Presiona entrar para continuar.';
            feedback.dataset.state = 'success';
            window.SVField?.get('loginUser')?.clearError();
            window.SVField?.get('loginPass')?.clearError();
            passInput.focus();
        });

        actions.append(submitButton, demoButton);

        const note = createElement('div', 'login-panel-note');
        const noteTitle = createElement('strong', '', 'Accesos de prueba');
        const chips = createElement('div', 'login-demo-list');
        const adminChip = createElement('span', 'login-demo-chip', 'demo-admin / 1234');
        const cashierChip = createElement('span', 'login-demo-chip', 'demo-cajero / 1234');
        chips.append(adminChip, cashierChip);
        note.append(noteTitle, chips);

        form.append(userGroup, passGroup, feedback, actions);
        panel.append(brand, copy, form, note);
        return panel;
    }

    function enhanceLoginControls() {
        window.SVField?.enhance('loginUser')?.setHelp('Usuario registrado para acceso interno.');
        window.SVField?.enhance('loginPass')?.setHelp('Tu sesion se mantendra activa en este navegador.');
        window.SVButtonGroup?.enhance('loginActions');
    }

    function render() {
        const host = document.getElementById('panelLogin');
        if (!host) {
            return null;
        }

        host.replaceChildren();

        const shell = createElement('div', 'login-shell');
        shell.append(buildShowcase(), buildPanel());
        host.appendChild(shell);

        enhanceLoginControls();
        return host;
    }

    window.LoginScreenComponent = {
        render
    };
})();
