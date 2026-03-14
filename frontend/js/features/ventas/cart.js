const VentasCartFeature = {
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

    obtenerListaPrecioVentaSeleccionada() {
        const lista = parseInt(document.getElementById('listaPrecioVenta')?.value || '1', 10);
        return this.obtenerListasPrecioDisponibles().includes(lista) ? lista : 1;
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

        if (producto.cantidad <= 0) {
            alert('❌ Producto sin stock disponible');
            return;
        }

        const existente = indiceExistente >= 0 ? carrito[indiceExistente] : null;

        if (existente) {
            if (existente.cantidad < producto.cantidad) {
                existente.cantidad++;
                existente.subtotal_dolares = existente.precio_dolares * existente.cantidad;
            } else {
                alert('❌ No hay suficiente stock');
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
        const itemsResumen = document.getElementById('posItemsCount');
        const dolaresResumen = document.getElementById('posResumenDolares');
        const bolivaresResumen = document.getElementById('posResumenBolivares');
        let totalDolares = 0;

        if (carrito.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">🛒 Carrito vacío</td></tr>';
            indiceCarritoSeleccionado = -1;
        } else {
            this.normalizarIndiceCarrito();
            tbody.innerHTML = carrito.map((item, index) => {
                totalDolares += item.subtotal_dolares;
                const prodOriginal = productos[item.productoIndex];
                const metodo = prodOriginal?.metodo_redondeo || 'none';

                const precioBs = this.aplicarRedondeoBsSeguro(item.precio_dolares * tasaDolar, metodo);
                const subtotalBs = this.aplicarRedondeoBsSeguro(item.subtotal_dolares * tasaDolar, metodo);
                const precioEditable = this.puedeEditarPrecioVentaSeguro();

                return `
                    <tr data-carrito-index="${index}" class="${index === indiceCarritoSeleccionado ? 'carrito-seleccionado' : ''}" onclick="seleccionarFilaCarrito(${index})">
                        <td>${item.nombre}<br><small style="color:#64748b;">${item.lista_precio_nombre || this.obtenerEtiquetaListaPrecioSegura(item.lista_precio || 1)}</small></td>
                        <td>
                            ${precioEditable
                                ? `<button type="button" class="btn-selector-precio-carrito" onclick="event.stopPropagation(); abrirSelectorPrecioCarrito(${index})">$${item.precio_dolares.toFixed(2)}</button>`
                                : `$${item.precio_dolares.toFixed(2)}`}
                        </td>
                        <td>Bs ${precioBs.toFixed(2)}</td>
                        <td>
                            <input type="number" min="1" max="${productos[item.productoIndex].cantidad}" 
                                   value="${item.cantidad}" onchange="actualizarCantidadCarrito(${index}, this.value)" onclick="event.stopPropagation()"
                                   style="width: 60px; padding: 5px;">
                        </td>
                        <td style="font-weight: bold;">$${item.subtotal_dolares.toFixed(2)}</td>
                        <td style="font-weight: bold; color: #007bff;">Bs ${subtotalBs.toFixed(2)}</td>
                        <td>
                            <button class="btn-eliminar-item" onclick="eliminarDelCarrito(${index})">🗑️</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        const totalBs = carrito.reduce((sum, item) => {
            const prodOriginal = productos[item.productoIndex];
            return sum + this.aplicarRedondeoBsSeguro(item.subtotal_dolares * tasaDolar, prodOriginal.metodo_redondeo || 'none');
        }, 0);

        document.getElementById('totalDolares').textContent = `$${totalDolares.toFixed(2)}`;
        document.getElementById('totalBolivares').textContent = `Bs ${totalBs.toFixed(2)}`;

        if (itemsResumen) itemsResumen.textContent = String(carrito.length);
        if (dolaresResumen) dolaresResumen.textContent = `$${totalDolares.toFixed(2)}`;
        if (bolivaresResumen) bolivaresResumen.textContent = `Bs ${totalBs.toFixed(2)}`;

        if (typeof window.actualizarResumenPagos === 'function') {
            window.actualizarResumenPagos(totalDolares, totalBs);
        } else {
            window.VentasPaymentsFeature?.actualizarResumenPagos?.(totalDolares, totalBs);
        }
        this.actualizarSeleccionCarritoVisual();
    },

    actualizarCantidadCarrito(index, cantidad) {
        cantidad = parseInt(cantidad, 10);
        const producto = productos[carrito[index].productoIndex];

        if (cantidad > producto.cantidad) {
            alert(`❌ Solo hay ${producto.cantidad} unidades disponibles`);
            cantidad = producto.cantidad;
        }

        if (cantidad < 1) {
            this.eliminarDelCarrito(index);
            return;
        }

        carrito[index].cantidad = cantidad;
        carrito[index].subtotal_dolares = carrito[index].precio_dolares * cantidad;
        this.actualizarCarrito();
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
