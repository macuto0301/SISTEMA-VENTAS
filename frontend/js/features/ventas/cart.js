const VentasCartFeature = {
    renderResumenPos(totalItems = 0, totalDolares = 0, totalBs = 0) {
        const container = document.getElementById('ventasPosSummaryCards');
        if (!container) return;

        if (!window.SVSummaryCard?.createHtml) {
            container.innerHTML = `
                <div class="ventas-pos-summary-card">
                    <div class="ventas-pos-summary-grid">
                        <span class="ventas-pos-summary-label">Items</span>
                        <strong>${totalItems}</strong>
                        <span class="ventas-pos-summary-label">Total USD</span>
                        <strong>$${totalDolares.toFixed(2)}</strong>
                        <span class="ventas-pos-summary-label">Total Bs</span>
                        <strong>Bs ${totalBs.toFixed(2)}</strong>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = [
            window.SVSummaryCard.createHtml({
                title: 'Items',
                value: String(totalItems),
                variant: 'info'
            }),
            window.SVSummaryCard.createHtml({
                title: 'Total USD',
                value: `$${totalDolares.toFixed(2)}`,
                variant: 'warning'
            }),
            window.SVSummaryCard.createHtml({
                title: 'Total Bs',
                value: `Bs ${totalBs.toFixed(2)}`,
                variant: 'success'
            })
        ].join('');
    },

    obtenerListasPrecioDisponibles() {
        if (Array.isArray(window.PRICE_LIST_NUMBERS) && window.PRICE_LIST_NUMBERS.length) {
            return window.PRICE_LIST_NUMBERS;
        }
        return [1, 2, 3];
    },

    obtenerPrecioProductoSeguro(producto, lista = 1) {
        if (typeof window.obtenerPrecioProducto === 'function') {
            return window.obtenerPrecioProducto(producto, lista);
        }
        return window.PricingUtils?.obtenerPrecioProducto?.(producto, lista) || 0;
    },

    obtenerEtiquetaListaPrecioSegura(lista = 1) {
        if (typeof window.obtenerEtiquetaListaPrecio === 'function') {
            return window.obtenerEtiquetaListaPrecio(lista);
        }
        return lista === 0 ? 'Libre' : `Precio ${lista}`;
    },

    productoManejaExistencia(producto) {
        if (typeof producto?.maneja_existencia === 'boolean') {
            return producto.maneja_existencia;
        }
        return String(producto?.tipo || 'producto').trim().toLowerCase() !== 'servicio';
    },

    obtenerCostoProductoSeguro(producto) {
        if (typeof window.obtenerCostoProducto === 'function') {
            return window.obtenerCostoProducto(producto);
        }
        return Number(producto?.precio_costo || 0);
    },

    roundAmountSeguro(value) {
        if (typeof window.roundAmount === 'function') {
            return window.roundAmount(value);
        }
        return Math.round((Number(value) || 0) * 100) / 100;
    },

    puedeEditarPrecioVentaSeguro() {
        if (typeof window.puedeEditarPrecioVenta === 'function') {
            return window.puedeEditarPrecioVenta();
        }
        return window.ConfigCore?.puedeEditarPrecioVenta?.() || false;
    },

    aplicarRedondeoBsSeguro(monto, metodo = 'none') {
        if (typeof window.aplicarRedondeoBs === 'function') {
            return window.aplicarRedondeoBs(monto, metodo);
        }
        return window.PricingUtils?.aplicarRedondeoBs?.(monto, metodo) ?? monto;
    },

    mostrarNotificacionSegura(mensaje) {
        if (typeof window.mostrarNotificacion === 'function') {
            return window.mostrarNotificacion(mensaje);
        }
        console.warn(mensaje);
    },

    mostrarAlertaSegura(mensaje, opciones = {}) {
        if (typeof window.Utils?.alertaModal === 'function') {
            return window.Utils.alertaModal(mensaje, opciones);
        }
        return this.mostrarNotificacionSegura(mensaje);
    },

    obtenerListaPrecioVentaSeleccionada() {
        const lista = parseInt(document.getElementById('listaPrecioVenta')?.value || '1', 10);
        return this.obtenerListasPrecioDisponibles().includes(lista) ? lista : 1;
    },

    actualizarEstadoListaPrecioVenta() {
        const selectListaPrecio = document.getElementById('listaPrecioVenta');
        if (!selectListaPrecio) return;

        const precioVentaLibreActivo = Boolean(window.AppState?.precioVentaLibre ?? window.precioVentaLibre);
        const debeBloquearse = carrito.length > 0 && !precioVentaLibreActivo;

        selectListaPrecio.disabled = debeBloquearse;
        selectListaPrecio.title = debeBloquearse
            ? 'La lista de precio se bloquea cuando ya hay productos en el carrito y el precio libre esta desactivado'
            : '';
    },

    obtenerPrecioCarritoDesdeProducto(producto, lista = 1) {
        return this.roundAmountSeguro(this.obtenerPrecioProductoSeguro(producto, lista));
    },

    obtenerOpcionesListaPrecioProducto(producto) {
        return this.obtenerListasPrecioDisponibles().map(lista => ({
            lista,
            etiqueta: this.obtenerEtiquetaListaPrecioSegura(lista),
            precio: this.obtenerPrecioProductoSeguro(producto, lista)
        }));
    },

    aplicarListaPrecioEnCarrito(index, listaPrecio) {
        const item = carrito[index];
        if (!item) return;
        const producto = productos[item.productoIndex];
        if (!producto) return;

        const precio = this.obtenerPrecioCarritoDesdeProducto(producto, listaPrecio);
        item.lista_precio = listaPrecio;
        item.lista_precio_nombre = this.obtenerEtiquetaListaPrecioSegura(listaPrecio);
        item.precio_dolares = precio;
        item.precio_original_dolares = precio;
        item.subtotal_dolares = precio * item.cantidad;
        this.actualizarCarrito();
    },

    aplicarPrecioLibreEnCarrito(index, precioLibre) {
        const item = carrito[index];
        if (!item) return false;
        const producto = productos[item.productoIndex];
        if (!producto) return false;

        const nuevoPrecio = this.roundAmountSeguro(parseFloat(precioLibre) || 0);
        const precioCosto = this.obtenerCostoProductoSeguro(producto);

        if (Number.isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
            this.mostrarNotificacionSegura('❌ Ingrese un precio libre valido');
            return false;
        }

        if (nuevoPrecio < precioCosto) {
            this.mostrarNotificacionSegura(`❌ El precio libre no puede ser menor al costo ($${precioCosto.toFixed(2)})`);
            return false;
        }

        item.lista_precio = 0;
        item.lista_precio_nombre = this.obtenerEtiquetaListaPrecioSegura(0);
        item.precio_dolares = nuevoPrecio;
        item.precio_original_dolares = nuevoPrecio;
        item.subtotal_dolares = nuevoPrecio * item.cantidad;
        this.actualizarCarrito();
        return true;
    },

    abrirSelectorPrecioCarrito(index) {
        if (!this.puedeEditarPrecioVentaSeguro() || !carrito[index]) return;

        this.cerrarSelectorPrecioCarrito();

        const item = carrito[index];
        const producto = productos[item.productoIndex];
        if (!producto) return;
        const precioCosto = this.obtenerCostoProductoSeguro(producto);

        const opciones = this.obtenerOpcionesListaPrecioProducto(producto).map(opcion => `
            <button
                type="button"
                class="selector-precio-option${(item.lista_precio || 1) === opcion.lista ? ' active' : ''}"
                onclick="seleccionarPrecioCarrito(${index}, ${opcion.lista})"
            >
                <span>${opcion.precio.toFixed(2)}</span>
                <small>${opcion.etiqueta}</small>
            </button>
        `).join('');

        const modal = document.createElement('div');
        modal.id = 'modalSelectorPrecioCarrito';
        modal.className = 'modal modal-selector-precio';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content modal-selector-precio-content">
                <button type="button" class="close" onclick="cerrarSelectorPrecioCarrito()">&times;</button>
                <h3>Seleccionar precio</h3>
                <p>${item.nombre}</p>
                <div class="selector-precio-grid">
                    ${opciones}
                </div>
                <div class="selector-precio-libre-box">
                    <label for="selectorPrecioLibreInput">Precio libre</label>
                    <small>No puede ser menor al costo: $${precioCosto.toFixed(2)}</small>
                    <div class="selector-precio-libre-row">
                        <input type="number" id="selectorPrecioLibreInput" min="${precioCosto.toFixed(2)}" step="0.01" value="${item.precio_dolares.toFixed(2)}">
                        <button type="button" class="btn-primary" onclick="confirmarPrecioLibreCarrito(${index})">Aplicar</button>
                    </div>
                </div>
            </div>
        `;
        modal.onclick = event => {
            if (event.target === modal) this.cerrarSelectorPrecioCarrito();
        };
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('selectorPrecioLibreInput')?.focus(), 40);
    },

    seleccionarPrecioCarrito(index, listaPrecio) {
        this.aplicarListaPrecioEnCarrito(index, listaPrecio);
        this.cerrarSelectorPrecioCarrito();
        this.mostrarNotificacionSegura(`💲 ${this.obtenerEtiquetaListaPrecioSegura(listaPrecio)} aplicada en la venta`);
    },

    confirmarPrecioLibreCarrito(index) {
        const input = document.getElementById('selectorPrecioLibreInput');
        if (!input) return;

        const ok = this.aplicarPrecioLibreEnCarrito(index, input.value);
        if (!ok) {
            input.focus();
            input.select?.();
            return;
        }

        this.cerrarSelectorPrecioCarrito();
        this.mostrarNotificacionSegura('💲 Precio libre aplicado en la venta');
    },

    cerrarSelectorPrecioCarrito() {
        const modal = document.getElementById('modalSelectorPrecioCarrito');
        if (modal) {
            document.body.removeChild(modal);
        }
    },

    normalizarIndiceCarrito() {
        if (carrito.length === 0) {
            indiceCarritoSeleccionado = -1;
            return;
        }

        if (indiceCarritoSeleccionado < 0) {
            indiceCarritoSeleccionado = 0;
            return;
        }

        if (indiceCarritoSeleccionado >= carrito.length) {
            indiceCarritoSeleccionado = carrito.length - 1;
        }
    },

    seleccionarFilaCarrito(index) {
        if (carrito.length === 0) {
            indiceCarritoSeleccionado = -1;
            return;
        }

        indiceCarritoSeleccionado = Math.max(0, Math.min(index, carrito.length - 1));
        this.actualizarSeleccionCarritoVisual();
    },

    enfocarCantidadItemSeleccionado() {
        if (indiceCarritoSeleccionado < 0 || !carrito[indiceCarritoSeleccionado]) return false;

        const fila = document.querySelector(`#carritoBody tr[data-carrito-index="${indiceCarritoSeleccionado}"]`);
        const inputCantidad = fila?.querySelector('input[type="number"]');
        if (!inputCantidad) return false;

        inputCantidad.focus();
        inputCantidad.select?.();
        return true;
    },

    moverSeleccionCarrito(direccion) {
        if (carrito.length === 0) return;
        this.normalizarIndiceCarrito();
        this.seleccionarFilaCarrito(indiceCarritoSeleccionado + direccion);
    },

    actualizarSeleccionCarritoVisual() {
        const filas = document.querySelectorAll('#carritoBody tr[data-carrito-index]');
        filas.forEach((fila, index) => {
            const activa = index === indiceCarritoSeleccionado;
            fila.classList.toggle('carrito-seleccionado', activa);
            fila.setAttribute('aria-selected', activa ? 'true' : 'false');

            if (activa) {
                fila.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        });
    },

    ajustarCantidadItemSeleccionado(delta) {
        if (indiceCarritoSeleccionado < 0 || !carrito[indiceCarritoSeleccionado]) return;
        this.actualizarCantidadCarrito(indiceCarritoSeleccionado, carrito[indiceCarritoSeleccionado].cantidad + delta);
    },

    agregarAlCarrito(productoIndex) {
        const producto = productos[productoIndex];
        const listaPrecio = this.obtenerListaPrecioVentaSeleccionada();
        const precioSeleccionado = this.obtenerPrecioCarritoDesdeProducto(producto, listaPrecio);
        const indiceExistente = carrito.findIndex(item => item.productoIndex === productoIndex && item.lista_precio === listaPrecio);
        const manejaExistencia = this.productoManejaExistencia(producto);

        if (manejaExistencia && producto.cantidad <= 0) {
            this.mostrarAlertaSegura('Producto sin stock disponible', {
                titulo: 'Sin stock',
                variante: 'warning'
            });
            return;
        }

        const existente = indiceExistente >= 0 ? carrito[indiceExistente] : null;

        if (existente) {
            if (!manejaExistencia || existente.cantidad < producto.cantidad) {
                existente.cantidad++;
                existente.subtotal_dolares = existente.precio_dolares * existente.cantidad;
            } else {
                const stockLabel = producto.permite_decimal ? producto.cantidad.toFixed(3) : producto.cantidad;
                this.mostrarAlertaSegura('No hay suficiente stock para agregar otra unidad.', {
                    titulo: 'Stock insuficiente',
                    variante: 'warning',
                    detalle: `Disponibles: ${stockLabel}`
                });
                return;
            }
        } else {
            carrito.push({
                productoIndex: productoIndex,
                producto_id: producto.id,
                nombre: producto.nombre,
                lista_precio: listaPrecio,
                lista_precio_nombre: this.obtenerEtiquetaListaPrecioSegura(listaPrecio),
                precio_dolares: precioSeleccionado,
                precio_original_dolares: precioSeleccionado,
                cantidad: 1,
                subtotal_dolares: precioSeleccionado
            });
        }

        this.actualizarCarrito();
        this.seleccionarFilaCarrito(indiceExistente >= 0 ? indiceExistente : carrito.length - 1);
        this.mostrarNotificacionSegura(`🛒 Producto agregado al carrito con ${this.obtenerEtiquetaListaPrecioSegura(listaPrecio)}`);
    },

    actualizarCarrito() {
        const tbody = document.getElementById('carritoBody');
        let totalDolares = 0;

        if (carrito.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">🛒 Carrito vacío</td></tr>';
            indiceCarritoSeleccionado = -1;
        } else {
            this.normalizarIndiceCarrito();
            tbody.innerHTML = carrito.map((item, index) => {
                totalDolares += item.subtotal_dolares;
                const prodOriginal = productos[item.productoIndex];
                const precioEditable = this.puedeEditarPrecioVentaSeguro();
                const codigo = prodOriginal?.codigo || '-';
                const maxCantidad = this.productoManejaExistencia(prodOriginal) ? ` max="${prodOriginal.cantidad}"` : '';
                const esDecimal = prodOriginal?.permite_decimal;
                const stepAttr = esDecimal ? ' step="0.001"' : ' step="1"';
                const minCantidad = esDecimal ? '0.001' : '1';

                return `
                    <tr data-carrito-index="${index}" class="${index === indiceCarritoSeleccionado ? 'carrito-seleccionado' : ''}" onclick="seleccionarFilaCarrito(${index})">
                        <td class="carrito-col-codigo">${codigo}</td>
                        <td class="carrito-col-producto">
                            <div class="carrito-producto-info">
                                <span class="carrito-producto-nombre">${item.nombre}</span>
                                <small class="carrito-producto-lista">${item.lista_precio_nombre || this.obtenerEtiquetaListaPrecioSegura(item.lista_precio || 1)}</small>
                            </div>
                            <button class="btn-eliminar-item" onclick="event.stopPropagation(); eliminarDelCarrito(${index})" aria-label="Eliminar producto">x</button>
                        </td>
                        <td class="carrito-col-cantidad">
                            <input type="number" min="${minCantidad}"${maxCantidad}${stepAttr}
                                   value="${item.cantidad}" onchange="actualizarCantidadCarrito(${index}, this.value)" onclick="event.stopPropagation()"
                                   class="carrito-cantidad-input">
                        </td>
                        <td class="carrito-col-precio">
                            ${precioEditable
                                ? `<input type="number" min="0" step="0.01" value="${item.precio_dolares.toFixed(2)}" class="carrito-precio-input" onclick="event.stopPropagation()" onchange="actualizarPrecioCarrito(${index}, this.value)">`
                                : `$${item.precio_dolares.toFixed(2)}`}
                        </td>
                        <td class="carrito-col-precio-bs">
                            ${precioEditable
                                ? `<input type="number" min="0" step="0.01" value="${this.aplicarRedondeoBsSeguro(item.precio_dolares * tasaDolar, prodOriginal?.metodo_redondeo || 'none').toFixed(2)}" class="carrito-precio-input" onclick="event.stopPropagation()" onchange="actualizarPrecioCarritoDesdebs(${index}, this.value)">`
                                : `Bs ${this.aplicarRedondeoBsSeguro(item.precio_dolares * tasaDolar, prodOriginal?.metodo_redondeo || 'none').toFixed(2)}`}
                        </td>
                        <td class="carrito-col-total">$${item.subtotal_dolares.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');
        }

        const totalBs = carrito.reduce((sum, item) => {
            const prodOriginal = productos[item.productoIndex];
            return sum + this.aplicarRedondeoBsSeguro(item.subtotal_dolares * tasaDolar, prodOriginal.metodo_redondeo || 'none');
        }, 0);

        const totalCantidad = carrito.reduce((sum, item) => {
            const prod = productos[item.productoIndex];
            return sum + (prod?.permite_decimal ? 1 : (item.cantidad || 0));
        }, 0);
        document.getElementById('totalDolares').textContent = `$${totalDolares.toFixed(2)}`;
        this.renderResumenPos(totalCantidad, totalDolares, totalBs);

        if (typeof window.actualizarResumenPagos === 'function') {
            window.actualizarResumenPagos(totalDolares, totalBs);
        } else {
            window.VentasPaymentsFeature?.actualizarResumenPagos?.(totalDolares, totalBs);
        }
        this.actualizarEstadoListaPrecioVenta();
        this.actualizarSeleccionCarritoVisual();
    },

    actualizarCantidadCarrito(index, cantidad) {
        const producto = productos[carrito[index].productoIndex];
        const esDecimal = producto?.permite_decimal;
        cantidad = esDecimal ? parseFloat(cantidad) : parseInt(cantidad, 10);

        if (isNaN(cantidad) || cantidad <= 0) {
            this.eliminarDelCarrito(index);
            return;
        }

        if (!esDecimal && cantidad !== Math.floor(cantidad)) {
            this.mostrarAlertaSegura('Este producto no permite cantidades decimales.', {
                titulo: 'Cantidad invalida',
                variante: 'warning'
            });
            cantidad = Math.floor(cantidad);
            if (cantidad < 1) {
                this.eliminarDelCarrito(index);
                return;
            }
        }

        if (this.productoManejaExistencia(producto) && cantidad > producto.cantidad) {
            const stockLabel = esDecimal ? producto.cantidad.toFixed(3) : producto.cantidad;
            this.mostrarAlertaSegura(`Solo hay ${stockLabel} disponibles.`, {
                titulo: 'Stock insuficiente',
                variante: 'warning'
            });
            cantidad = producto.cantidad;
        }

        const minCantidad = esDecimal ? 0.001 : 1;
        if (cantidad < minCantidad) {
            this.eliminarDelCarrito(index);
            return;
        }

        carrito[index].cantidad = cantidad;
        carrito[index].subtotal_dolares = carrito[index].precio_dolares * cantidad;
        this.actualizarCarrito();
    },

    actualizarPrecioCarritoDesdebs(index, precioBs) {
        if (!this.puedeEditarPrecioVentaSeguro() || !carrito[index]) {
            this.actualizarCarrito();
            return;
        }
        const tasa = tasaDolar || window.AppState?.tasaDolar || 1;
        if (!tasa || tasa <= 0) {
            this.mostrarNotificacionSegura('❌ Tasa del dolar no disponible');
            return;
        }
        const usd = parseFloat(precioBs) / tasa;
        if (Number.isNaN(usd) || usd < 0) {
            this.mostrarNotificacionSegura('❌ Ingrese un precio valido en Bs');
            this.actualizarCarrito();
            return;
        }
        this.actualizarPrecioCarrito(index, usd);
    },

    actualizarPrecioCarrito(index, precio) {
        if (!this.puedeEditarPrecioVentaSeguro() || !carrito[index]) {
            this.actualizarCarrito();
            return;
        }

        const nuevoPrecio = parseFloat(precio);

        const producto = productos[carrito[index].productoIndex];
        const precioCosto = this.obtenerCostoProductoSeguro(producto);

        if (Number.isNaN(nuevoPrecio) || nuevoPrecio < 0) {
            this.mostrarNotificacionSegura('❌ Ingrese un precio valido');
            this.actualizarCarrito();
            return;
        }

        if (nuevoPrecio < precioCosto) {
            this.mostrarNotificacionSegura(`❌ El precio no puede ser menor al costo ($${precioCosto.toFixed(2)})`);
            this.actualizarCarrito();
            return;
        }

        carrito[index].lista_precio = 0;
        carrito[index].lista_precio_nombre = this.obtenerEtiquetaListaPrecioSegura(0);
        carrito[index].precio_dolares = nuevoPrecio;
        carrito[index].subtotal_dolares = nuevoPrecio * carrito[index].cantidad;
        this.actualizarCarrito();
    },

    eliminarDelCarrito(index) {
        carrito.splice(index, 1);
        if (indiceCarritoSeleccionado >= carrito.length) {
            indiceCarritoSeleccionado = carrito.length - 1;
        }
        this.actualizarCarrito();
    },

    limpiarCarrito() {
        if (confirm('¿Vaciar el carrito y pagos?')) {
            reiniciarVenta();
        }
    }
};

window.VentasCartFeature = VentasCartFeature;
