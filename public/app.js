// Configuración - REEMPLAZAR CON TU URL DE API BACKEND
const API_URL = '/api'; // En producción: 'https://tu-backend.clever-cloud.com/api'

let isAdmin = false;
let adminToken = null;
let currentProducts = [];
let currentOrders = [];
let cart = [];
let currentSection = 'products';
let orderFilter = 'all';

// ============= FUNCIONES DE API =============

async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Error al cargar productos');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function saveProduct(product) {
    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(product)
        });
        
        if (!response.ok) throw new Error('Error al guardar producto');
        const data = await response.json();
        alert('Producto guardado exitosamente');
        return data;
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar producto');
        throw error;
    }
}

async function updateProduct(id, product) {
    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(product)
        });
        
        if (!response.ok) throw new Error('Error al actualizar producto');
        const data = await response.json();
        alert('Producto actualizado exitosamente');
        return data;
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar producto');
        throw error;
    }
}

async function deleteProduct(id) {
    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) throw new Error('Error al eliminar producto');
        const data = await response.json();
        alert('Producto eliminado exitosamente');
        return data;
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar producto');
        throw error;
    }
}

async function createOrder(orderData) {
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) throw new Error('Error al crear orden');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function loginAdmin(username, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) throw new Error('Credenciales incorrectas');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function fetchOrders() {
    try {
        const response = await fetch(`${API_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        if (!response.ok) throw new Error('Error al cargar pedidos');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function fetchOrderDetail(orderId) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        if (!response.ok) throw new Error('Error al cargar detalle');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) throw new Error('Error al actualizar estado');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// ============= FUNCIONES DE CARRITO =============

function addToCart(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert('No hay más stock disponible');
            return;
        }
    } else {
        if (product.stock > 0) {
            cart.push({ ...product, quantity: 1 });
        } else {
            alert('Producto sin stock');
            return;
        }
    }
    
    updateCartCount();
    alert('Producto añadido al carrito');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCount();
    renderCart();
}

function updateQuantity(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    const product = currentProducts.find(p => p.id === productId);
    const newQuantity = item.quantity + delta;

    if (newQuantity <= 0) {
        removeFromCart(productId);
    } else if (newQuantity <= product.stock) {
        item.quantity = newQuantity;
        updateCartCount();
        renderCart();
    } else {
        alert('No hay suficiente stock disponible');
    }
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function clearCart() {
    cart = [];
    updateCartCount();
}

// ============= FUNCIONES DE RENDERIZADO =============

function renderHeader() {
    const actions = document.getElementById('headerActions');
    const adminNav = document.getElementById('adminNav');
    
    if (isAdmin) {
        actions.innerHTML = `
            <button class="btn btn-cart" onclick="openModal('cartModal')">
                🛒 Carrito (<span id="cartCount">0</span>)
            </button>
            <button class="btn btn-secondary" onclick="showSection('products'); openProductModal()">+ Nueva Prenda</button>
            <button class="btn btn-danger" onclick="logout()">Cerrar Sesión</button>
        `;
        adminNav.style.display = 'flex';
    } else {
        actions.innerHTML = `
            <button class="btn btn-cart" onclick="openModal('cartModal')">
                🛒 Carrito (<span id="cartCount">0</span>)
            </button>
            <button class="btn btn-primary" onclick="openModal('loginModal')">Login Admin</button>
        `;
        adminNav.style.display = 'none';
    }
    updateCartCount();
}

function renderCatalog() {
    const content = document.getElementById('catalogContent');
    
    if (currentProducts.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <h3>No hay productos disponibles</h3>
                <p>Vuelve pronto para ver nuestras novedades</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="catalog-grid">
            ${currentProducts.map(product => {
                let stockClass = '';
                let stockText = `Stock: ${product.stock} unidades`;
                
                if (product.stock === 0) {
                    stockClass = 'out';
                    stockText = 'Sin stock';
                } else if (product.stock <= 5) {
                    stockClass = 'low';
                    stockText = `¡Últimas ${product.stock} unidades!`;
                }

                return `
                    <div class="product-card">
                        <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/400x400?text=Sin+Imagen'">
                        <div class="product-info">
                            <div class="product-name">${product.name}</div>
                            <div class="product-description">${product.description}</div>
                            <div class="product-price">$${product.price.toLocaleString('es-CO')}</div>
                            <div class="product-stock ${stockClass}">${stockText}</div>
                            ${product.stock > 0 ? `
                                <button class="btn btn-add-to-cart" onclick="addToCart(${product.id})">
                                    Añadir al Carrito
                                </button>
                            ` : `
                                <button class="btn btn-add-to-cart" disabled style="opacity: 0.5; cursor: not-allowed;">
                                    Sin Stock
                                </button>
                            `}
                            ${isAdmin ? `
                                <div class="admin-actions">
                                    <button class="btn btn-primary" onclick="editProduct(${product.id})">Editar</button>
                                    <button class="btn btn-danger" onclick="confirmDelete(${product.id})">Eliminar</button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderCart() {
    const content = document.getElementById('cartContent');
    
    if (cart.length === 0) {
        content.innerHTML = `
            <div class="cart-empty">
                <h3>Tu carrito está vacío</h3>
                <p>¡Añade algunos productos para comenzar!</p>
            </div>
        `;
        return;
    }

    const subtotal = getCartTotal();
    const shipping = subtotal > 150000 ? 0 : 15000;
    const total = subtotal + shipping;

    content.innerHTML = `
        <div class="cart-items">
            ${cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">$${item.price.toLocaleString('es-CO')} c/u</div>
                        <div class="cart-item-quantity">
                            <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                            <span style="padding: 0 1rem;">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                            <span style="margin-left: 1rem; color: #fff;">
                                Subtotal: $${(item.price * item.quantity).toLocaleString('es-CO')}
                            </span>
                        </div>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                        🗑️
                    </button>
                </div>
            `).join('')}
        </div>
        
        <div class="cart-summary">
            <div class="cart-summary-row">
                <span>Subtotal:</span>
                <span>$${subtotal.toLocaleString('es-CO')}</span>
            </div>
            <div class="cart-summary-row">
                <span>Envío:</span>
                <span>${shipping === 0 ? '¡Gratis!' : '$' + shipping.toLocaleString('es-CO')}</span>
            </div>
            ${shipping === 0 ? '' : `
                <div class="cart-summary-row" style="color: #2ecc71; font-size: 0.85rem;">
                    <span>💡 Envío gratis en compras superiores a $150.000</span>
                </div>
            `}
            <div class="cart-summary-row total">
                <span>Total:</span>
                <span>$${total.toLocaleString('es-CO')}</span>
            </div>
        </div>
        
        <div class="cart-actions">
            <button class="btn btn-danger" onclick="clearCartConfirm()">Vaciar Carrito</button>
            <button class="btn btn-primary" onclick="proceedToCheckout()">Proceder al Pago</button>
        </div>
    `;
}

function renderOrders() {
    const content = document.getElementById('ordersContent');
    
    if (currentOrders.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <h3>No hay pedidos</h3>
                <p>Los pedidos de los clientes aparecerán aquí</p>
            </div>
        `;
        return;
    }

    const filteredOrders = orderFilter === 'all' 
        ? currentOrders 
        : currentOrders.filter(o => o.status === orderFilter);

    const stats = {
        total: currentOrders.length,
        pending: currentOrders.filter(o => o.status === 'pending').length,
        processing: currentOrders.filter(o => o.status === 'processing').length,
        shipped: currentOrders.filter(o => o.status === 'shipped').length,
        delivered: currentOrders.filter(o => o.status === 'delivered').length,
        totalRevenue: currentOrders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + parseFloat(o.total), 0)
    };

    const statusNames = {
        pending: 'Pendiente',
        processing: 'Procesando',
        shipped: 'Enviado',
        delivered: 'Entregado',
        cancelled: 'Cancelado'
    };

    content.innerHTML = `
        <div class="orders-header">
            <h2>📋 Gestión de Pedidos</h2>
            <div class="orders-stats">
                <div class="stat-card">
                    <div class="stat-number">${stats.total}</div>
                    <div class="stat-label">Total Pedidos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.pending}</div>
                    <div class="stat-label">Pendientes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">$${stats.totalRevenue.toLocaleString('es-CO')}</div>
                    <div class="stat-label">Ingresos</div>
                </div>
            </div>
        </div>

        <div class="orders-filters">
            <button class="filter-btn ${orderFilter === 'all' ? 'active' : ''}" onclick="filterOrders('all')">
                Todos (${stats.total})
            </button>
            <button class="filter-btn ${orderFilter === 'pending' ? 'active' : ''}" onclick="filterOrders('pending')">
                Pendientes (${stats.pending})
            </button>
            <button class="filter-btn ${orderFilter === 'processing' ? 'active' : ''}" onclick="filterOrders('processing')">
                Procesando (${stats.processing})
            </button>
            <button class="filter-btn ${orderFilter === 'shipped' ? 'active' : ''}" onclick="filterOrders('shipped')">
                Enviados (${stats.shipped})
            </button>
            <button class="filter-btn ${orderFilter === 'delivered' ? 'active' : ''}" onclick="filterOrders('delivered')">
                Entregados (${stats.delivered})
            </button>
        </div>

        <div class="orders-table">
            <div class="order-row header">
                <div class="order-cell">Nº Orden</div>
                <div class="order-cell">Cliente</div>
                <div class="order-cell">Email / Teléfono</div>
                <div class="order-cell">Total</div>
                <div class="order-cell">Estado</div>
                <div class="order-cell">Fecha</div>
                <div class="order-cell">Acciones</div>
            </div>
            ${filteredOrders.map(order => {
                const date = new Date(order.created_at);
                const formattedDate = date.toLocaleDateString('es-CO', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                return `
                    <div class="order-row">
                        <div class="order-cell" data-label="Nº Orden">
                            <span class="order-number">${order.order_number}</span>
                        </div>
                        <div class="order-cell highlight" data-label="Cliente">
                            ${order.customer_name}
                        </div>
                        <div class="order-cell" data-label="Contacto">
                            ${order.customer_email}<br>
                            <small>${order.customer_phone || 'N/A'}</small>
                        </div>
                        <div class="order-cell highlight" data-label="Total">
                            $${parseFloat(order.total).toLocaleString('es-CO')}
                        </div>
                        <div class="order-cell" data-label="Estado">
                            <span class="status-badge status-${order.status}">
                                ${statusNames[order.status]}
                            </span>
                        </div>
                        <div class="order-cell" data-label="Fecha">
                            ${formattedDate}
                        </div>
                        <div class="order-cell" data-label="Acciones">
                            <div class="order-actions">
                                <button class="btn-icon" onclick="viewOrderDetail(${order.id})" title="Ver detalle">
                                    👁️
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

async function renderOrderDetail(orderId) {
    const content = document.getElementById('orderDetailContent');
    content.innerHTML = '<div class="loading">Cargando detalle...</div>';

    try {
        const order = await fetchOrderDetail(orderId);
        
        const statusNames = {
            pending: 'Pendiente',
            processing: 'Procesando',
            shipped: 'Enviado',
            delivered: 'Entregado',
            cancelled: 'Cancelado'
        };

        const date = new Date(order.created_at);
        const formattedDate = date.toLocaleDateString('es-CO', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        content.innerHTML = `
            <div class="order-detail-section">
                <h3>Información del Pedido</h3>
                <div class="order-info-grid">
                    <div class="order-info-item">
                        <div class="order-info-label">Número de Orden</div>
                        <div class="order-info-value">${order.order_number}</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Estado</div>
                        <div class="order-info-value">
                            <span class="status-badge status-${order.status}">
                                ${statusNames[order.status]}
                            </span>
                        </div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Fecha del Pedido</div>
                        <div class="order-info-value">${formattedDate}</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Total</div>
                        <div class="order-info-value">$${parseFloat(order.total).toLocaleString('es-CO')}</div>
                    </div>
                </div>
            </div>

            <div class="order-detail-section">
                <h3>Información del Cliente</h3>
                <div class="order-info-grid">
                    <div class="order-info-item">
                        <div class="order-info-label">Nombre</div>
                        <div class="order-info-value">${order.customer_name}</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Email</div>
                        <div class="order-info-value">${order.customer_email}</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Teléfono</div>
                        <div class="order-info-value">${order.customer_phone || 'No proporcionado'}</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Ciudad</div>
                        <div class="order-info-value">${order.customer_city || 'No especificada'}</div>
                    </div>
                </div>
                <div class="order-info-item" style="margin-top: 1rem;">
                    <div class="order-info-label">Dirección de Envío</div>
                    <div class="order-info-value">${order.customer_address || 'No proporcionada'}</div>
                </div>
            </div>

            <div class="order-detail-section">
                <h3>Productos del Pedido</h3>
                <div class="order-items-list">
                    ${order.items.map(item => `
                        <div class="order-item-row">
                            <div>
                                <div class="order-item-name">${item.product_name}</div>
                                <div class="order-item-details">
                                    Cantidad: ${item.quantity} × $${parseFloat(item.product_price).toLocaleString('es-CO')}
                                </div>
                            </div>
                            <div class="order-item-price">
                                $${parseFloat(item.subtotal).toLocaleString('es-CO')}
                            </div>
                        </div>
                    `).join('')}
                    
                    <div class="order-item-row" style="border-top: 2px solid #2d2d2d; margin-top: 1rem; padding-top: 1rem;">
                        <div class="order-item-name">Subtotal</div>
                        <div class="order-item-price">$${parseFloat(order.subtotal).toLocaleString('es-CO')}</div>
                    </div>
                    <div class="order-item-row">
                        <div class="order-item-name">Envío</div>
                        <div class="order-item-price">
                            ${parseFloat(order.shipping) === 0 ? '¡Gratis!' : '$' + parseFloat(order.shipping).toLocaleString('es-CO')}
                        </div>
                    </div>
                    <div class="order-item-row" style="font-size: 1.2rem;">
                        <div class="order-item-name">Total</div>
                        <div class="order-item-price">$${parseFloat(order.total).toLocaleString('es-CO')}</div>
                    </div>
                </div>
            </div>

            <div class="order-detail-section">
                <h3>Actualizar Estado del Pedido</h3>
                <div class="order-status-update">
                    <div class="status-selector">
                        <button class="btn btn-secondary ${order.status === 'pending' ? 'active' : ''}" 
                                onclick="updateStatus(${order.id}, 'pending')">
                            Pendiente
                        </button>
                        <button class="btn btn-primary ${order.status === 'processing' ? 'active' : ''}" 
                                onclick="updateStatus(${order.id}, 'processing')">
                            Procesando
                        </button>
                        <button class="btn btn-primary ${order.status === 'shipped' ? 'active' : ''}" 
                                onclick="updateStatus(${order.id}, 'shipped')">
                            Enviado
                        </button>
                        <button class="btn btn-secondary ${order.status === 'delivered' ? 'active' : ''}" 
                                onclick="updateStatus(${order.id}, 'delivered')">
                            Entregado
                        </button>
                        <button class="btn btn-danger ${order.status === 'cancelled' ? 'active' : ''}" 
                                onclick="updateStatus(${order.id}, 'cancelled')">
                            Cancelado
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `
            <div class="empty-state">
                <h3>Error al cargar detalle</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ============= FUNCIONES DE NAVEGACIÓN =============

function showSection(section) {
    currentSection = section;
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const catalogContent = document.getElementById('catalogContent');
    const ordersContent = document.getElementById('ordersContent');
    
    if (section === 'products') {
        catalogContent.style.display = 'block';
        ordersContent.style.display = 'none';
        document.querySelectorAll('.nav-btn')[0].classList.add('active');
    } else if (section === 'orders') {
        catalogContent.style.display = 'none';
        ordersContent.style.display = 'block';
        document.querySelectorAll('.nav-btn')[1].classList.add('active');
        loadOrders();
    }
}

function filterOrders(filter) {
    orderFilter = filter;
    renderOrders();
}

async function viewOrderDetail(orderId) {
    openModal('orderDetailModal');
    await renderOrderDetail(orderId);
}

async function updateStatus(orderId, newStatus) {
    if (confirm(`¿Cambiar el estado del pedido?`)) {
        try {
            await updateOrderStatus(orderId, newStatus);
            alert('Estado actualizado correctamente');
            closeModal('orderDetailModal');
            loadOrders();
        } catch (error) {
            alert('Error al actualizar estado');
        }
    }
}

async function loadOrders() {
    const content = document.getElementById('ordersContent');
    content.innerHTML = '<div class="loading">Cargando pedidos...</div>';
    
    try {
        currentOrders = await fetchOrders();
        renderOrders();
    } catch (error) {
        content.innerHTML = `
            <div class="empty-state">
                <h3>Error al cargar pedidos</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ============= FUNCIONES DE MODALES =============

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    if (modalId === 'cartModal') {
        renderCart();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openProductModal(product = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (product) {
        title.textContent = 'Editar Prenda';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productImage').value = product.image;
    } else {
        title.textContent = 'Nueva Prenda';
        form.reset();
        document.getElementById('productId').value = '';
    }
    
    openModal('productModal');
}

function editProduct(id) {
    const product = currentProducts.find(p => p.id === id);
    if (product) {
        openProductModal(product);
    }
}

function confirmDelete(id) {
    if (confirm('¿Estás seguro de eliminar esta prenda?')) {
        deleteProduct(id).then(() => {
            loadProducts();
        });
    }
}

function clearCartConfirm() {
    if (confirm('¿Estás seguro de vaciar el carrito?')) {
        clearCart();
        renderCart();
    }
}

function proceedToCheckout() {
    closeModal('cartModal');
    document.getElementById('checkoutTotal').textContent = 
        '$' + (getCartTotal() + (getCartTotal() > 150000 ? 0 : 15000)).toLocaleString('es-CO');
    openModal('checkoutModal');
}

function logout() {
    isAdmin = false;
    adminToken = null;
    currentSection = 'products';
    document.getElementById('catalogContent').style.display = 'block';
    document.getElementById('ordersContent').style.display = 'none';
    renderHeader();
    renderCatalog();
}

// ============= CARGA DE DATOS =============

async function loadProducts() {
    const content = document.getElementById('catalogContent');
    content.innerHTML = '<div class="loading">Cargando productos...</div>';
    
    try {
        currentProducts = await fetchProducts();
        renderCatalog();
    } catch (error) {
        content.innerHTML = `
            <div class="empty-state">
                <h3>Error al cargar productos</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ============= EVENT LISTENERS =============

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const result = await loginAdmin(username, password);
        
        if (result.success) {
            isAdmin = true;
            adminToken = result.token;
            closeModal('loginModal');
            renderHeader();
            renderCatalog();
            alert('Sesión iniciada correctamente');
        }
    } catch (error) {
        alert('Credenciales incorrectas');
    }
});

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const product = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        price: parseInt(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        image: document.getElementById('productImage').value
    };
    
    const id = document.getElementById('productId').value;
    
    if (id) {
        await updateProduct(id, product);
    } else {
        await saveProduct(product);
    }
    
    closeModal('productModal');
    loadProducts();
});

document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const orderData = {
        customer: {
            name: document.getElementById('customerName').value,
            email: document.getElementById('customerEmail').value,
            phone: document.getElementById('customerPhone').value,
            address: document.getElementById('customerAddress').value,
            city: document.getElementById('customerCity').value
        },
        items: cart,
        subtotal: getCartTotal(),
        shipping: getCartTotal() > 150000 ? 0 : 15000,
        total: getCartTotal() + (getCartTotal() > 150000 ? 0 : 15000),
        date: new Date().toISOString()
    };
    
    try {
        const result = await createOrder(orderData);
        if (result.success) {
            alert(`¡Pedido realizado con éxito! 🎉\n\nNúmero de orden: ${result.orderNumber}\n\nRecibirás un email de confirmación pronto.`);
            clearCart();
            closeModal('checkoutModal');
            document.getElementById('checkoutForm').reset();
            loadProducts();
        }
    } catch (error) {
        alert('Error al procesar el pedido. Por favor intenta nuevamente.');
    }
});

// ============= INICIALIZACIÓN =============
renderHeader();
loadProducts();