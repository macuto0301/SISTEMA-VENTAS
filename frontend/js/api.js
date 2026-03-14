// ============================================
// FUNCIONES DE API
// ============================================

const API = {
    baseUrl: "http://localhost:5000/api",

    buildQuery(params = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value);
            }
        });
        const query = searchParams.toString();
        return query ? `?${query}` : '';
    },

    getAuthHeaders() {
        try {
            const sesion = JSON.parse(localStorage.getItem('sesion_ventas') || 'null');
            if (sesion?.username) {
                return { 'X-Auth-Username': sesion.username };
            }
        } catch (e) {
            console.warn('No se pudo leer la sesion local', e);
        }
        return {};
    },

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        try {
            const headers = { ...this.getAuthHeaders(), ...options.headers };
            if (options.body instanceof FormData) {
                delete headers['Content-Type'];
            } else if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }

            const res = await fetch(url, {
                headers,
                ...options
            });
            if (!res.ok) {
                let mensaje = `HTTP ${res.status}`;
                try {
                    const data = await res.json();
                    mensaje = data?.error || data?.message || mensaje;
                } catch (parseError) {
                    // noop
                }
                throw new Error(mensaje);
            }
            return await res.json();
        } catch (e) {
            console.warn(`API Error: ${endpoint}`, e);
            throw e;
        }
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, data) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) });
    },

    async postForm(endpoint, formData) {
        return this.request(endpoint, {
            method: 'POST',
            headers: {},
            body: formData
        });
    },

    async put(endpoint, data) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
    },

    async putForm(endpoint, formData) {
        return this.request(endpoint, {
            method: 'PUT',
            headers: {},
            body: formData
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

const ApiService = {
    buildListParams(options = {}) {
        const params = {
            page: options.page || 1,
            page_size: options.pageSize || 10
        };

        if (options.search) {
            params.q = options.search;
        }

        Object.entries(options.filters || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params[key] = value;
            }
        });

        Object.entries(options.extraParams || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params[key] = value;
            }
        });

        return params;
    },

    normalizarRespuestaListado(data, fallbackPage = 1, fallbackPageSize = 10) {
        if (Array.isArray(data)) {
            return {
                items: data,
                pagination: {
                    page: fallbackPage,
                    page_size: fallbackPageSize,
                    total: data.length,
                    total_pages: data.length > 0 ? 1 : 0,
                    has_next: false,
                    has_prev: false
                }
            };
        }

        return {
            items: Array.isArray(data?.items) ? data.items : [],
            pagination: {
                page: data?.pagination?.page || fallbackPage,
                page_size: data?.pagination?.page_size || fallbackPageSize,
                total: data?.pagination?.total || 0,
                total_pages: data?.pagination?.total_pages || 0,
                has_next: Boolean(data?.pagination?.has_next),
                has_prev: Boolean(data?.pagination?.has_prev)
            }
        };
    },

    async cargarConfiguracion() {
        try {
            const data = await API.get('/config/');
            if (data && Object.keys(data).length > 0) {
                return {
                    tasaDolar: data.tasaDolar || 36.5,
                    tasaVuelto: data.tasaVuelto || data.tasaDolar || 36.5,
                    porcentajeGananciaDefecto: data.porcentajeGananciaDefecto || 30,
                    porcentajeDescuentoDolares: data.porcentajeDescuentoDolares || 0,
                    metodoRedondeoBs: data.metodoRedondeoBs || 'none',
                    precioVentaLibre: Boolean(data.precioVentaLibre),
                    nombreEmpresa: data.nombreEmpresa || '',
                    rifEmpresa: data.rifEmpresa || '',
                    direccionEmpresa: data.direccionEmpresa || ''
                };
            }
        } catch (e) {
            console.warn('No se pudo cargar la configuracion desde el backend', e);
        }
        return null;
    },

    async guardarConfiguracion(config) {
        try {
            await API.post('/config/', config);
            return true;
        } catch (e) {
            console.error('No se pudo guardar la configuracion en el backend', e);
            return false;
        }
    },

    async cargarProductos(options = {}) {
        try {
            const page = options.page || 1;
            const pageSize = options.pageSize || 20;
            const query = API.buildQuery(this.buildListParams({ ...options, page, pageSize }));
            const data = await API.get(`/productos/${query}`);
            return this.normalizarRespuestaListado(data, page, pageSize);
        } catch (e) {
            console.error('Error cargando productos:', e);
            alert('Error de conexión con el servidor.');
            return this.normalizarRespuestaListado([], options.page || 1, options.pageSize || 20);
        }
    },

    async guardarProducto(producto) {
        try {
            const res = await fetch(`${API.baseUrl}/productos/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...API.getAuthHeaders() },
                body: JSON.stringify(producto)
            });
            if (!res.ok) throw new Error('Error guardando');
            return await res.json();
        } catch (e) {
            console.error('Error:', e);
            alert('Error de conexión. No se pudo guardar.');
            throw e;
        }
    },

    async actualizarProducto(id, producto) {
        try {
            await API.put(`/productos/${id}`, producto);
            return true;
        } catch (e) {
            console.error('No se pudo actualizar el producto en el backend', e);
            return false;
        }
    },

    async eliminarProducto(id) {
        try {
            await API.delete(`/productos/${id}`);
            return true;
        } catch (e) {
            console.error('No se pudo eliminar el producto en el backend', e);
            return false;
        }
    },

    async cargarVentas(options = {}) {
        try {
            const page = options.page || 1;
            const pageSize = options.pageSize || 10;
            const query = API.buildQuery(this.buildListParams({ ...options, page, pageSize }));
            const data = await API.get(`/ventas/${query}`);
            return this.normalizarRespuestaListado(data, page, pageSize);
        } catch (e) {
            console.error('Error cargando ventas:', e);
            alert('Error de conexión con el servidor.');
            return this.normalizarRespuestaListado([], options.page || 1, options.pageSize || 10);
        }
    },

    async guardarVenta(venta) {
        try {
            const res = await fetch(`${API.baseUrl}/ventas/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...API.getAuthHeaders() },
                body: JSON.stringify(venta)
            });
            if (!res.ok) throw new Error('Error guardando');
            return await res.json();
        } catch (e) {
            console.error('Error:', e);
            alert('Error de conexión. No se pudo guardar.');
            throw e;
        }
    },

    async registrarDevolucionVenta(ventaId, devolucion) {
        try {
            const res = await fetch(`${API.baseUrl}/ventas/${ventaId}/devoluciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...API.getAuthHeaders() },
                body: JSON.stringify(devolucion)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'No se pudo registrar la devolución');
            }

            return data;
        } catch (e) {
            console.error('Error registrando devolución:', e);
            throw e;
        }
    },

    async cargarClientes(options = {}) {
        try {
            const page = options.page || 1;
            const pageSize = options.pageSize || 10;
            const query = API.buildQuery(this.buildListParams({ ...options, page, pageSize }));
            const data = await API.get(`/clientes/${query}`);
            return this.normalizarRespuestaListado(data, page, pageSize);
        } catch (e) {
            console.error('Error cargando clientes:', e);
            alert('Error de conexion con el servidor.');
            return this.normalizarRespuestaListado([], options.page || 1, options.pageSize || 10);
        }
    },

    async crearCliente(cliente) {
        if (cliente instanceof FormData) {
            return API.postForm('/clientes/', cliente);
        }
        return API.post('/clientes/', cliente);
    },

    async actualizarCliente(id, cliente) {
        if (cliente instanceof FormData) {
            return API.putForm(`/clientes/${id}`, cliente);
        }
        return API.put(`/clientes/${id}`, cliente);
    },

    async obtenerEstadoCuentaCliente(clienteId) {
        return API.get(`/clientes/${clienteId}/estado-cuenta`);
    },

    async cargarCuentasPorCobrar(options = {}) {
        try {
            const page = options.page || 1;
            const pageSize = options.pageSize || 10;
            const query = API.buildQuery(this.buildListParams({ ...options, page, pageSize }));
            const data = await API.get(`/cuentas-por-cobrar/${query}`);
            return this.normalizarRespuestaListado(data, page, pageSize);
        } catch (e) {
            console.error('Error cargando cuentas por cobrar:', e);
            alert('Error de conexion con el servidor.');
            return this.normalizarRespuestaListado([], options.page || 1, options.pageSize || 10);
        }
    },

    async registrarAbonoCuenta(cuentaId, payload) {
        return API.post(`/cuentas-por-cobrar/${cuentaId}/abonos`, payload);
    },

    async tasaBCV() {
        try {
            const res = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar?moneda=bcv');
            const data = await res.json();
            return data?.monto || 36.5;
        } catch (e) {
            return null;
        }
    },

    // Proveedores
    async cargarProveedores(options = {}) {
        try {
            const page = options.page || 1;
            const pageSize = options.pageSize || 10;
            const query = API.buildQuery(this.buildListParams({ ...options, page, pageSize }));
            const data = await API.get(`/proveedores/${query}`);
            return this.normalizarRespuestaListado(data, page, pageSize);
        } catch (e) {
            console.error('Error cargando proveedores:', e);
            alert('Error de conexión con el servidor. Verifique que el backend esté corriendo.');
            return this.normalizarRespuestaListado([], options.page || 1, options.pageSize || 10);
        }
    },

    async guardarProveedor(proveedor) {
        try {
            console.log('Enviando proveedor al servidor:', proveedor);
            const res = await fetch(`${API.baseUrl}/proveedores/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...API.getAuthHeaders() },
                body: JSON.stringify(proveedor)
            });
            console.log('Respuesta:', res.status);
            if (!res.ok) {
                const error = await res.text();
                console.error('Error:', error);
                throw new Error(error);
            }
            return await res.json();
        } catch (e) {
            console.error('Error al guardar proveedor:', e);
            alert('Error de conexión. No se pudo guardar en el servidor.');
            throw e;
        }
    },

    async actualizarProveedor(id, proveedor) {
        try {
            await API.put(`/proveedores/${id}`, proveedor);
            return true;
        } catch (e) {
            console.error('No se pudo actualizar el proveedor en el backend', e);
            return false;
        }
    },

    async eliminarProveedor(id) {
        try {
            await API.delete(`/proveedores/${id}`);
            return true;
        } catch (e) {
            console.error('No se pudo eliminar el proveedor en el backend', e);
            return false;
        }
    },

    // Compras
    async cargarCompras(options = {}) {
        try {
            const page = options.page || 1;
            const pageSize = options.pageSize || 10;
            const query = API.buildQuery(this.buildListParams({ ...options, page, pageSize }));
            const data = await API.get(`/compras/${query}`);
            console.log('Compras desde API:', data);
            return this.normalizarRespuestaListado(data, page, pageSize);
        } catch (e) {
            console.error('Error cargando compras:', e);
            alert('Error de conexión con el servidor. Verifique que el backend esté corriendo.');
            return this.normalizarRespuestaListado([], options.page || 1, options.pageSize || 10);
        }
    },

    async guardarCompra(compra) {
        try {
            console.log('Enviando compra al servidor:', compra);
            const res = await fetch(`${API.baseUrl}/compras/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...API.getAuthHeaders() },
                body: JSON.stringify(compra)
            });
            console.log('Respuesta compra:', res.status);
            if (!res.ok) {
                const error = await res.text();
                console.error('Error:', error);
                throw new Error(error);
            }
            const data = await res.json();
            console.log('Compra guardada:', data);
            return data;
        } catch (e) {
            console.error('Error guardando compra:', e);
            alert('Error de conexión. No se pudo guardar en el servidor.');
            throw e;
        }
    },

    async actualizarEstadoCompra(id, estado) {
        try {
            await API.put(`/compras/${id}/estado`, { estado });
            return true;
        } catch (e) {
            return false;
        }
    },

    async getCompra(id) {
        try {
            const res = await fetch(`http://localhost:5000/api/compras/${id}`, {
                headers: API.getAuthHeaders()
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error('Error fetching compra:', e);
            throw e;
        }
    },

    async getHistorialPrecios(productoId) {
        try {
            return await API.get(`/productos/${productoId}/historial-precios/`);
        } catch (e) {
            return [];
        }
    }
};

window.ApiService = ApiService;
