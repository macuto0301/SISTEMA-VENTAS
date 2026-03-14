// ============================================
// FUNCIONES DE API
// ============================================

const API = {
    baseUrl: "http://localhost:5000/api",

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        try {
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

    async put(endpoint, data) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

const ApiService = {
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

    async cargarProductos() {
        try {
            const data = await API.get('/productos/');
            return data;
        } catch (e) {
            console.error('Error cargando productos:', e);
            alert('Error de conexión con el servidor.');
            return [];
        }
    },

    async guardarProducto(producto) {
        try {
            const res = await fetch(`${API.baseUrl}/productos/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    async cargarVentas() {
        try {
            return await API.get('/ventas/');
        } catch (e) {
            console.error('Error cargando ventas:', e);
            alert('Error de conexión con el servidor.');
            return [];
        }
    },

    async guardarVenta(venta) {
        try {
            const res = await fetch(`${API.baseUrl}/ventas/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
    async cargarProveedores() {
        try {
            return await API.get('/proveedores/');
        } catch (e) {
            console.error('Error cargando proveedores:', e);
            alert('Error de conexión con el servidor. Verifique que el backend esté corriendo.');
            return [];
        }
    },

    async guardarProveedor(proveedor) {
        try {
            console.log('Enviando proveedor al servidor:', proveedor);
            const res = await fetch(`${API.baseUrl}/proveedores/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
    async cargarCompras() {
        try {
            const data = await API.get('/compras/');
            console.log('Compras desde API:', data);
            return data;
        } catch (e) {
            console.error('Error cargando compras:', e);
            alert('Error de conexión con el servidor. Verifique que el backend esté corriendo.');
            return [];
        }
    },

    async guardarCompra(compra) {
        try {
            console.log('Enviando compra al servidor:', compra);
            const res = await fetch(`${API.baseUrl}/compras/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch(`http://localhost:5000/api/compras/${id}`);
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
