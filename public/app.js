//app.js - Sistema completo con usuarios
const API_URL = '/api';

const PAYMENT_CONFIG = {
    whatsappNumber: '573115564583',
    nequiNumber: '311 556 4583',
    nequiName: 'Tu Nombre Completo',
    bancolombiaAccount: 'XXXX-XXXX-XX',
    bancolombiaName: 'Tu Nombre Completo',
    daviplataNumber: '311 556 4583',
    daviplataName: 'Tu Nombre Completo'
};

const CLOUDINARY_CONFIG = {
    cloudName: 'dw2caadfi',
    uploadPreset: 'catalogo_preset'
};

let isAdmin = false;
let isLoggedIn = false;
let userToken = null;
let adminToken = null;
let currentUser = null;
let currentProducts = [];
let currentOrders = [];
let userOrders = [];
let cart = [];
let currentSection = 'products';
let orderFilter = 'all';
let currentAnalyticsFilter = 'month';


// ============= FUNCIONES DE SESIÓN PERSISTENTE =============
function saveSession() {
    const session = {
        isAdmin,
        isLoggedIn,
        userToken,
        adminToken,
        currentUser
    };
    localStorage.setItem('catalogoSession', JSON.stringify(session));
}

function loadSession() {
    try {
        const sessionData = localStorage.getItem('catalogoSession');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            isAdmin = session.isAdmin || false;
            isLoggedIn = session.isLoggedIn || false;
            userToken = session.userToken;
            adminToken = session.adminToken;
            currentUser = session.currentUser;
            return true;
        }
    } catch (error) {
        console.error('Error al cargar sesión:', error);
    }
    return false;
}

function clearSession() {
    localStorage.removeItem('catalogoSession');
    isAdmin = false;
    isLoggedIn = false;
    userToken = null;
    adminToken = null;
    currentUser = null;
}

async function validateSession() {
    if (userToken) {
        try {
            await getUserProfile();
            return true;
        } catch (error) {
            console.log('Token de usuario inválido, cerrando sesión');
            clearSession();
            return false;
        }
    }
    
    if (adminToken) {
        try {
            await fetchOrders();
            return true;
        } catch (error) {
            console.log('Token de admin inválido, cerrando sesión');
            clearSession();
            return false;
        }
    }
    
    return false;
}


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
            headers: { 'Authorization': `Bearer ${adminToken}` }
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        if (!response.ok) throw new Error('Error al crear orden');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function confirmPayment(orderId, notes) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/confirm-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ payment_notes: notes })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function cancelOrder(orderId, reason) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ reason })
        });
        if (!response.ok) throw new Error('Error al cancelar orden');
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
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Authorization': `Bearer ${adminToken}` }
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
            headers: { 'Authorization': `Bearer ${adminToken}` }
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

// ============= FUNCIONES DE USUARIOS =============

async function registerUser(userData) {
    try {
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al registrar');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al iniciar sesión');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function getUserProfile() {
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (!response.ok) throw new Error('Error al obtener perfil');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function updateUserProfile(data) {
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al actualizar perfil');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function getUserOrders() {
    try {
        const response = await fetch(`${API_URL}/users/orders`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (!response.ok) throw new Error('Error al cargar pedidos');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function getUserOrderDetail(orderId) {
    try {
        const response = await fetch(`${API_URL}/users/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (!response.ok) throw new Error('Error al cargar detalle');
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
    } else if (isLoggedIn) {
        actions.innerHTML = `
            <span style="color: #fff; margin-right: 1rem;">👤 ${currentUser.name}</span>
            <button class="btn btn-cart" onclick="openModal('cartModal')">
                🛒 Carrito (<span id="cartCount">0</span>)
            </button>
            <button class="btn btn-secondary" onclick="showMyOrders()">Mis Pedidos</button>
            <button class="btn btn-primary" onclick="openModal('profileModal')">Mi Perfil</button>
            <button class="btn btn-danger" onclick="logoutUser()">Salir</button>
        `;
        adminNav.style.display = 'none';
    } else {
        actions.innerHTML = `
            <button class="btn btn-cart" onclick="openModal('cartModal')">
                🛒 Carrito (<span id="cartCount">0</span>)
            </button>
            <button class="btn btn-primary" onclick="openModal('userLoginModal')">Iniciar Sesión</button>
            <button class="btn btn-secondary" onclick="openModal('registerModal')">Registrarse</button>
            <button class="btn" onclick="openModal('loginModal')" style="background: #666;">Admin</button>
        `;
        adminNav.style.display = 'none';
    }
    updateCartCount();
}

function renderCatalog() {
    const content = document.getElementById('catalogContent');
     if (!currentProducts || currentProducts.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <h3>No hay productos disponibles</h3>
                <p>Vuelve pronto para ver nuestras novedades</p>
            </div>
        `;
        return;
    }
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
        pendingPayment: currentOrders.filter(o => o.status === 'pending_payment').length,
        pending: currentOrders.filter(o => o.status === 'pending').length,
        processing: currentOrders.filter(o => o.status === 'processing').length,
        shipped: currentOrders.filter(o => o.status === 'shipped').length,
        delivered: currentOrders.filter(o => o.status === 'delivered').length,
        totalRevenue: currentOrders
            .filter(o => o.status !== 'cancelled' && o.status !== 'pending_payment')
            .reduce((sum, o) => sum + parseFloat(o.total), 0)
    };

    const statusNames = {
        pending_payment: 'Esperando Pago',
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
                <div class="stat-card" style="border-left: 3px solid #f39c12;">
                    <div class="stat-number" style="color: #f39c12;">${stats.pendingPayment}</div>
                    <div class="stat-label">Esperando Pago</div>
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
            <button class="filter-btn ${orderFilter === 'pending_payment' ? 'active' : ''}" onclick="filterOrders('pending_payment')">
                ⏳ Esperando Pago (${stats.pendingPayment})
            </button>
            <button class="filter-btn ${orderFilter === 'pending' ? 'active' : ''}" onclick="filterOrders('pending')">
                📦 Pendientes (${stats.pending})
            </button>
            <button class="filter-btn ${orderFilter === 'processing' ? 'active' : ''}" onclick="filterOrders('processing')">
                🔄 Procesando (${stats.processing})
            </button>
            <button class="filter-btn ${orderFilter === 'shipped' ? 'active' : ''}" onclick="filterOrders('shipped')">
                📮 Enviados (${stats.shipped})
            </button>
            <button class="filter-btn ${orderFilter === 'delivered' ? 'active' : ''}" onclick="filterOrders('delivered')">
                ✅ Entregados (${stats.delivered})
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
                    <div class="order-row ${order.status === 'pending_payment' ? 'pending-payment-row' : ''}">
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
                                ${order.status === 'pending_payment' ? `
                                    <button class="btn-icon" style="background: #2ecc71;" onclick="confirmPaymentModal(${order.id})" title="Confirmar pago">
                                        ✅
                                    </button>
                                    <button class="btn-icon" style="background: #e74c3c;" onclick="cancelOrderModal(${order.id})" title="Cancelar">
                                        ❌
                                    </button>
                                ` : ''}
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
            pending_payment: 'Esperando Pago',
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

        let paidDate = '';
        if (order.paid_at) {
            const pDate = new Date(order.paid_at);
            paidDate = pDate.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

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
                    ${order.paid_at ? `
                        <div class="order-info-item">
                            <div class="order-info-label">Fecha de Pago</div>
                            <div class="order-info-value">${paidDate}</div>
                        </div>
                        <div class="order-info-item">
                            <div class="order-info-label">Confirmado por</div>
                            <div class="order-info-value">${order.confirmed_by_username || 'Sistema'}</div>
                        </div>
                    ` : ''}
                </div>
                ${order.payment_notes ? `
                    <div class="order-info-item" style="margin-top: 1rem;">
                        <div class="order-info-label">Notas de Pago</div>
                        <div class="order-info-value">${order.payment_notes}</div>
                    </div>
                ` : ''}
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
                                    Cantidad: ${item.quantity} × ${parseFloat(item.product_price).toLocaleString('es-CO')}
                                </div>
                            </div>
                            <div class="order-item-price">
                                ${parseFloat(item.subtotal).toLocaleString('es-CO')}
                            </div>
                        </div>
                    `).join('')}
                    
                    <div class="order-item-row" style="border-top: 2px solid #2d2d2d; margin-top: 1rem; padding-top: 1rem;">
                        <div class="order-item-name">Subtotal</div>
                        <div class="order-item-price">${parseFloat(order.subtotal).toLocaleString('es-CO')}</div>
                    </div>
                    <div class="order-item-row">
                        <div class="order-item-name">Envío</div>
                        <div class="order-item-price">
                            ${parseFloat(order.shipping) === 0 ? '¡Gratis!' : '$' + parseFloat(order.shipping).toLocaleString('es-CO')}
                        </div>
                    </div>
                    <div class="order-item-row" style="font-size: 1.2rem;">
                        <div class="order-item-name">Total</div>
                        <div class="order-item-price">${parseFloat(order.total).toLocaleString('es-CO')}</div>
                    </div>
                </div>
            </div>

            ${order.status !== 'pending_payment' && order.status !== 'cancelled' ? `
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
                        </div>
                    </div>
                </div>
            ` : ''}

            ${order.status === 'pending_payment' ? `
                <div class="order-detail-section">
                    <h3>⚠️ Esta orden está esperando confirmación de pago</h3>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button class="btn btn-primary" style="flex: 1;" onclick="confirmPaymentModal(${order.id})">
                            ✅ Confirmar Pago Recibido
                        </button>
                        <button class="btn btn-danger" style="flex: 1;" onclick="cancelOrderModal(${order.id})">
                            ❌ Cancelar Orden
                        </button>
                    </div>
                </div>
            ` : ''}
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

async function showMyOrders() {
    if (!isLoggedIn) {
        alert('Debes iniciar sesión para ver tus pedidos');
        return;
    }

    const content = document.getElementById('catalogContent');
    content.innerHTML = '<div class="loading">Cargando tus pedidos...</div>';

    try {
        userOrders = await getUserOrders();
        
        if (userOrders.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <h3>📦 Aún no tienes pedidos</h3>
                    <p>Cuando realices tu primera compra, aparecerá aquí</p>
                    <button class="btn btn-primary" onclick="location.reload()">Ver Catálogo</button>
                </div>
            `;
            return;
        }

        const statusNames = {
            pending_payment: 'Esperando Pago',
            pending: 'Pendiente',
            processing: 'Procesando',
            shipped: 'Enviado',
            delivered: 'Entregado',
            cancelled: 'Cancelado'
        };

        content.innerHTML = `
            <div style="padding: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="color: #fff;">📋 Mis Pedidos</h2>
                    <button class="btn btn-secondary" onclick="location.reload()">Volver al Catálogo</button>
                </div>

                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    ${userOrders.map(order => {
                        const date = new Date(order.created_at);
                        const formattedDate = date.toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        });

                        return `
                            <div style="background: #1a1a1a; border-radius: 15px; padding: 1.5rem; border: 1px solid #2d2d2d; cursor: pointer; transition: transform 0.3s;" onclick="viewUserOrderDetail(${order.id})">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                                    <div>
                                        <div style="color: #fff; font-weight: bold; font-size: 1.1rem; margin-bottom: 0.5rem;">
                                            ${order.order_number}
                                        </div>
                                        <div style="color: #a0a0a0; font-size: 0.9rem;">
                                            ${formattedDate} • ${order.items_count} producto(s)
                                        </div>
                                    </div>
                                    <span class="status-badge status-${order.status}">
                                        ${statusNames[order.status]}
                                    </span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #2d2d2d;">
                                    <div style="color: #2ecc71; font-size: 1.3rem; font-weight: bold;">
                                        ${parseFloat(order.total).toLocaleString('es-CO')}
                                    </div>
                                    <div style="color: #3498db;">
                                        Ver detalle →
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `
            <div class="empty-state">
                <h3>Error al cargar pedidos</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Reintentar</button>
            </div>
        `;
    }
}

async function viewUserOrderDetail(orderId) {
    openModal('userOrderDetailModal');
    const content = document.getElementById('userOrderDetailContent');
    content.innerHTML = '<div class="loading">Cargando detalle...</div>';

    try {
        const order = await getUserOrderDetail(orderId);

        const statusNames = {
            pending_payment: 'Esperando Pago',
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
                        <div class="order-info-value">${parseFloat(order.total).toLocaleString('es-CO')}</div>
                    </div>
                </div>
            </div>

            <div class="order-detail-section">
                <h3>Productos</h3>
                <div class="order-items-list">
                    ${order.items.map(item => `
                        <div class="order-item-row">
                            <div>
                                <div class="order-item-name">${item.product_name}</div>
                                <div class="order-item-details">
                                    Cantidad: ${item.quantity} × ${parseFloat(item.product_price).toLocaleString('es-CO')}
                                </div>
                            </div>
                            <div class="order-item-price">
                                ${parseFloat(item.subtotal).toLocaleString('es-CO')}
                            </div>
                        </div>
                    `).join('')}
                    
                    <div class="order-item-row" style="border-top: 2px solid #2d2d2d; margin-top: 1rem; padding-top: 1rem;">
                        <div class="order-item-name">Subtotal</div>
                        <div class="order-item-price">${parseFloat(order.subtotal).toLocaleString('es-CO')}</div>
                    </div>
                    <div class="order-item-row">
                        <div class="order-item-name">Envío</div>
                        <div class="order-item-price">
                            ${parseFloat(order.shipping) === 0 ? '¡Gratis!' : '$' + parseFloat(order.shipping).toLocaleString('es-CO')}
                        </div>
                    </div>
                    <div class="order-item-row" style="font-size: 1.2rem;">
                        <div class="order-item-name">Total</div>
                        <div class="order-item-price">${parseFloat(order.total).toLocaleString('es-CO')}</div>
                    </div>
                </div>
            </div>

            <div class="order-detail-section">
                <h3>Dirección de Envío</h3>
                <div class="order-info-item">
                    <div class="order-info-value">
                        ${order.customer_address || 'No especificada'}<br>
                        ${order.customer_city || ''}
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
    const analyticsContent = document.getElementById('analyticsContent');

    catalogContent.style.display = 'none';
    ordersContent.style.display = 'none';
    analyticsContent.style.display = 'none';

    if (section === 'products') {
        catalogContent.style.display = 'block';
        document.querySelectorAll('.nav-btn')[0].classList.add('active');
        loadProducts();
    } else if (section === 'orders') {
        ordersContent.style.display = 'block';
        document.querySelectorAll('.nav-btn')[1].classList.add('active');
        loadOrders();
    } else if (section === 'analytics') {
        analyticsContent.style.display = 'block';
        document.querySelectorAll('.nav-btn')[2].classList.add('active');
        loadAnalytics();
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

// ============= FUNCIONES DE PAGO =============

function confirmPaymentModal(orderId) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'confirmPaymentModal';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>✅ Confirmar Pago</h2>
                <button class="close-btn" onclick="closeConfirmPaymentModal()">&times;</button>
            </div>
            
            <div style="padding: 1rem 0;">
                <div style="background: #f39c12; padding: 1rem; border-radius: 10px; margin-bottom: 1.5rem; color: #000;">
                    <strong>⚠️ Importante:</strong><br>
                    Al confirmar, se descontará el stock de los productos automáticamente.
                </div>
                
                <div class="form-group">
                    <label>Notas del Pago (opcional)</label>
                    <textarea id="paymentNotes" rows="3" placeholder="Ej: Pago recibido por Nequi, comprobante #12345"></textarea>
                </div>
                
                <button class="btn btn-primary" onclick="confirmPaymentAction(${orderId})" style="width: 100%;">
                    ✅ Confirmar Pago y Actualizar Stock
                </button>
                
                <button class="btn btn-secondary" onclick="closeConfirmPaymentModal()" style="width: 100%; margin-top: 1rem;">
                    Cancelar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeConfirmPaymentModal() {
    const modal = document.getElementById('confirmPaymentModal');
    if (modal) {
        modal.remove();
    }
}

async function confirmPaymentAction(orderId) {
    const notes = document.getElementById('paymentNotes').value;

    try {
        await confirmPayment(orderId, notes);
        alert('✅ Pago confirmado exitosamente. Stock actualizado.');
        closeConfirmPaymentModal();
        closeModal('orderDetailModal');
        loadOrders();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function cancelOrderModal(orderId) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'cancelOrderModal';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>❌ Cancelar Orden</h2>
                <button class="close-btn" onclick="closeCancelOrderModal()">&times;</button>
            </div>
            
            <div style="padding: 1rem 0;">
                <div class="form-group">
                    <label>Motivo de Cancelación</label>
                    <textarea id="cancelReason" rows="3" placeholder="Ej: Cliente no realizó el pago" required></textarea>
                </div>
                
                <button class="btn btn-danger" onclick="cancelOrderAction(${orderId})" style="width: 100%;">
                    ❌ Cancelar Orden
                </button>
                
                <button class="btn btn-secondary" onclick="closeCancelOrderModal()" style="width: 100%; margin-top: 1rem;">
                    Volver
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeCancelOrderModal() {
    const modal = document.getElementById('cancelOrderModal');
    if (modal) {
        modal.remove();
    }
}

async function cancelOrderAction(orderId) {
    const reason = document.getElementById('cancelReason').value;

    if (!reason.trim()) {
        alert('Por favor ingresa un motivo de cancelación');
        return;
    }

    try {
        await cancelOrder(orderId, reason);
        alert('Orden cancelada exitosamente');
        closeCancelOrderModal();
        closeModal('orderDetailModal');
        loadOrders();
    } catch (error) {
        alert('Error al cancelar orden: ' + error.message);
    }
}

// ============= FUNCIONES DE MODALES =============

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    if (modalId === 'cartModal') {
        renderCart();
    }
    if (modalId === 'profileModal' && isLoggedIn) {
        loadUserProfile();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openProductModal(product = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    const imagePreview = document.getElementById('productImagePreview');

    if (product) {
        title.textContent = 'Editar Prenda';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productImage').value = product.image;
        
        if (product.image) {
            imagePreview.src = product.image;
            imagePreview.style.display = 'block';
        }
    } else {
        title.textContent = 'Nueva Prenda';
        form.reset();
        document.getElementById('productId').value = '';
        imagePreview.style.display = 'none';
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
    const total = getCartTotal() + (getCartTotal() > 150000 ? 0 : 15000);
    document.getElementById('checkoutTotal').textContent = '$' + total.toLocaleString('es-CO');
    
    if (isLoggedIn && currentUser) {
        document.getElementById('customerName').value = currentUser.name;
        document.getElementById('customerEmail').value = currentUser.email;
        document.getElementById('customerPhone').value = currentUser.phone || '';
        document.getElementById('customerAddress').value = currentUser.address || '';
        document.getElementById('customerCity').value = currentUser.city || '';
    }
    
    openModal('checkoutModal');
}

function logout() {
    clearSession(); 
    currentSection = 'products';
    document.getElementById('catalogContent').style.display = 'block';
    document.getElementById('ordersContent').style.display = 'none';
    renderHeader();
    renderCatalog();
}

function logoutUser() {
    clearSession(); 
    renderHeader();
    location.reload();
}

async function loadUserProfile() {
    try {
        const profile = await getUserProfile();
        document.getElementById('profileName').value = profile.name;
        document.getElementById('profileEmail').value = profile.email;
        document.getElementById('profilePhone').value = profile.phone || '';
        document.getElementById('profileAddress').value = profile.address || '';
        document.getElementById('profileCity').value = profile.city || '';
    } catch (error) {
        alert('Error al cargar perfil');
    }
}

function showPaymentInstructions(whatsappURL, total) {
    closeModal('checkoutModal');

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'paymentInstructionsModal';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>💳 Instrucciones de Pago</h2>
                <button class="close-btn" onclick="closePaymentInstructions()">&times;</button>
            </div>
            
            <div style="padding: 1rem 0;">
                <div style="background: #1a1a1a; padding: 1.5rem; border-radius: 10px; margin-bottom: 1.5rem; border: 2px solid #2ecc71;">
                    <h3 style="color: #2ecc71; margin-bottom: 1rem;">Total a Pagar</h3>
                    <div style="font-size: 2rem; font-weight: bold; color: #fff;">
                        ${total.toLocaleString('es-CO')}
                    </div>
                </div>
                
                <div style="background: #1a1a1a; padding: 1.5rem; border-radius: 10px; margin-bottom: 1.5rem;">
                    <h3 style="color: #fff; margin-bottom: 1rem;">📱 Opciones de Pago</h3>
                    
                    <div style="margin-bottom: 1rem; padding: 1rem; background: #0a0a0a; border-radius: 8px;">
                        <div style="color: #2ecc71; font-weight: bold; margin-bottom: 0.5rem;">
                            💚 Nequi
                        </div>
                        <div style="color: #a0a0a0; font-size: 0.9rem;">
                            Número: <span style="color: #fff; font-weight: bold;">${PAYMENT_CONFIG.nequiNumber}</span><br>
                            Nombre: ${PAYMENT_CONFIG.nequiName}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1rem; padding: 1rem; background: #0a0a0a; border-radius: 8px;">
                        <div style="color: #e74c3c; font-weight: bold; margin-bottom: 0.5rem;">
                            🏦 Bancolombia
                        </div>
                        <div style="color: #a0a0a0; font-size: 0.9rem;">
                            Cuenta: <span style="color: #fff; font-weight: bold;">${PAYMENT_CONFIG.bancolombiaAccount}</span><br>
                            Tipo: Ahorros<br>
                            Nombre: ${PAYMENT_CONFIG.bancolombiaName}
                        </div>
                    </div>
                    
                    <div style="padding: 1rem; background: #0a0a0a; border-radius: 8px;">
                        <div style="color: #3498db; font-weight: bold; margin-bottom: 0.5rem;">
                            💳 Daviplata
                        </div>
                        <div style="color: #a0a0a0; font-size: 0.9rem;">
                            Número: <span style="color: #fff; font-weight: bold;">${PAYMENT_CONFIG.daviplataNumber}</span><br>
                            Nombre: ${PAYMENT_CONFIG.daviplataName}
                        </div>
                    </div>
                </div>
                
                <div style="background: #f39c12; padding: 1rem; border-radius: 10px; margin-bottom: 1.5rem; color: #000;">
                    <strong>⚠️ Importante:</strong><br>
                    • Realiza el pago y envía el comprobante por WhatsApp<br>
                    • Incluye tu nombre completo en el mensaje<br>
                    • Tu pedido será procesado al confirmar el pago<br>
                    • El stock se reserva por 24 horas
                </div>
                
                <button class="btn btn-primary" onclick="window.open('${whatsappURL}', '_blank')" style="width: 100%; padding: 1rem; font-size: 1.1rem;">
                    📱 Enviar Pedido por WhatsApp
                </button>
                
                <button class="btn btn-secondary" onclick="closePaymentInstructions()" style="width: 100%; margin-top: 1rem;">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closePaymentInstructions() {
    const modal = document.getElementById('paymentInstructionsModal');
    if (modal) {
        modal.remove();
    }
    closeModal('checkoutModal');
}

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
            saveSession();
            closeModal('loginModal');
            renderHeader();
            renderCatalog();
            alert('Sesión iniciada correctamente');
        }
    } catch (error) {
        alert('Credenciales incorrectas');
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userData = {
        name: document.getElementById('registerName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        phone: document.getElementById('registerPhone').value,
        address: document.getElementById('registerAddress').value,
        city: document.getElementById('registerCity').value
    };

    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (userData.password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    try {
        const result = await registerUser(userData);

        if (result.success) {
            isLoggedIn = true;
            userToken = result.token;
            currentUser = result.user;
            saveSession();
            closeModal('registerModal');
            renderHeader();
            alert('¡Registro exitoso! Bienvenido ' + result.user.name);
        }
    } catch (error) {
        alert(error.message || 'Error al registrar usuario');
    }
});

document.getElementById('userLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('userLoginEmail').value;
    const password = document.getElementById('userLoginPassword').value;

    try {
        const result = await loginUser(email, password);

        if (result.success) {
            isLoggedIn = true;
            userToken = result.token;
            currentUser = result.user;
            saveSession();
            closeModal('userLoginModal');
            renderHeader();
            alert('¡Bienvenido de nuevo ' + result.user.name + '!');
        }
    } catch (error) {
        alert(error.message || 'Error al iniciar sesión');
    }
});

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        name: document.getElementById('profileName').value,
        phone: document.getElementById('profilePhone').value,
        address: document.getElementById('profileAddress').value,
        city: document.getElementById('profileCity').value
    };

    try {
        await updateUserProfile(data);
        currentUser = { ...currentUser, ...data };
        saveSession();
        alert('Perfil actualizado exitosamente');
        closeModal('profileModal');
        renderHeader();
    } catch (error) {
        alert('Error al actualizar perfil');
    }
});

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        alert('Las nuevas contraseñas no coinciden');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        alert('Contraseña actualizada exitosamente');
        document.getElementById('changePasswordForm').reset();
        closeModal('changePasswordModal');
    } catch (error) {
        alert(error.message || 'Error al cambiar contraseña');
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

    const customerName = document.getElementById('customerName').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const customerCity = document.getElementById('customerCity').value;

    const subtotal = getCartTotal();
    const shipping = subtotal > 150000 ? 0 : 15000;
    const total = subtotal + shipping;

    let mensaje = `🛍️ *NUEVO PEDIDO*%0A%0A`;
    mensaje += `👤 *Cliente:* ${customerName}%0A`;
    mensaje += `📧 *Email:* ${customerEmail}%0A`;
    mensaje += `📱 *Teléfono:* ${customerPhone}%0A`;
    mensaje += `📍 *Ciudad:* ${customerCity}%0A`;
    mensaje += `🏠 *Dirección:* ${customerAddress}%0A%0A`;

    mensaje += `🛒 *PRODUCTOS:*%0A`;
    mensaje += `━━━━━━━━━━━━━━━%0A`;

    cart.forEach(item => {
        mensaje += `• *${item.name}*%0A`;
        mensaje += `  Cantidad: ${item.quantity}%0A`;
        mensaje += `  Precio: ${item.price.toLocaleString('es-CO')}%0A`;
        mensaje += `  Subtotal: ${(item.price * item.quantity).toLocaleString('es-CO')}%0A%0A`;
    });

    mensaje += `━━━━━━━━━━━━━━━%0A`;
    mensaje += `💰 *Subtotal:* ${subtotal.toLocaleString('es-CO')}%0A`;
    mensaje += `🚚 *Envío:* ${shipping === 0 ? 'Gratis' : '$' + shipping.toLocaleString('es-CO')}%0A`;
    mensaje += `✨ *TOTAL A PAGAR:* ${total.toLocaleString('es-CO')}%0A%0A`;
    mensaje += `Estoy listo para realizar el pago 😊`;

    try {
        const orderData = {
            customer: {
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
                address: customerAddress,
                city: customerCity
            },
            items: cart,
            subtotal: subtotal,
            shipping: shipping,
            total: total,
            userId: isLoggedIn && currentUser ? currentUser.id : null
        };

        const result = await createOrder(orderData);

        if (result.success) {
            const whatsappURL = `https://wa.me/${PAYMENT_CONFIG.whatsappNumber}?text=${mensaje}`;
            showPaymentInstructions(whatsappURL, total);
            clearCart();
            document.getElementById('checkoutForm').reset();
        }

    } catch (error) {
        alert('Error al procesar el pedido. Por favor intenta nuevamente.');
        console.error(error);
    }
});

// ============= ANALÍTICAS =============
function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    if (num >= 1000000) {
        return '$' + (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return '$' + (num / 1000).toFixed(0) + 'K';
    } else {
        return '$' + Math.round(num).toLocaleString('es-CO');
    }
}

let analyticsChart = null;

async function loadAnalytics() {
    const content = document.getElementById('analyticsContent');
    content.innerHTML = '<div class="loading">Cargando analíticas...</div>';

    try {
        const dateRange = getDateRange();

        const [topProducts, summary] = await Promise.all([
            fetch(`${API_URL}/analytics/top-products?startDate=${dateRange.start}&endDate=${dateRange.end}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            }).then(res => res.json()),
            fetch(`${API_URL}/analytics/sales-summary?startDate=${dateRange.start}&endDate=${dateRange.end}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            }).then(res => res.json())
        ]);

        renderAnalytics(topProducts, summary);
    } catch (error) {
        content.innerHTML = `
            <div class="empty-state">
                <h3>Error al cargar analíticas</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function getDateRange() {
    const filter = currentAnalyticsFilter;
    const end = new Date();
    const start = new Date();

    switch (filter) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'week':
            start.setDate(start.getDate() - 7);
            break;
        case 'month':
            start.setMonth(start.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(start.getFullYear() - 1);
            break;
        case 'custom':
            const customStart = document.getElementById('customStartDate')?.value;
            const customEnd = document.getElementById('customEndDate')?.value;
            if (customStart && customEnd) {
                return {
                    start: customStart,
                    end: customEnd
                };
            }
            break;
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

function renderAnalytics(topProducts, summary) {
    const content = document.getElementById('analyticsContent');

    content.innerHTML = `
    <div class="analytics-container">
        <div class="analytics-header">
            <h2>📊 Panel de Analíticas</h2>
            <div class="analytics-filters">
                <select id="analyticsFilter" onchange="changeAnalyticsFilter(this.value)">
                    <option value="today" ${currentAnalyticsFilter === 'today' ? 'selected' : ''}>Hoy</option>
                    <option value="week" ${currentAnalyticsFilter === 'week' ? 'selected' : ''}>Última semana</option>
                    <option value="month" ${currentAnalyticsFilter === 'month' ? 'selected' : ''}>Último mes</option>
                    <option value="year" ${currentAnalyticsFilter === 'year' ? 'selected' : ''}>Último año</option>
                    <option value="custom" ${currentAnalyticsFilter === 'custom' ? 'selected' : ''}>Personalizado</option>
                </select>
                <div id="customDateRange" style="display: ${currentAnalyticsFilter === 'custom' ? 'flex' : 'none'}; gap: 0.5rem;">
                    <input type="date" id="customStartDate" />
                    <input type="date" id="customEndDate" />
                    <button class="btn btn-primary" onclick="applyCustomDateRange()">Aplicar</button>
                </div>
            </div>
        </div>

        <div class="analytics-summary">
            <div class="stat-card-large">
                <div class="stat-icon">💰</div>
                <div class="stat-info">
                    <div class="stat-label">Ingresos Totales</div>
                    <div class="stat-value">${formatCurrency(summary.ingresos_totales)}</div>
                </div>
            </div>
            <div class="stat-card-large">
                <div class="stat-icon">📦</div>
                <div class="stat-info">
                    <div class="stat-label">Órdenes</div>
                    <div class="stat-value">${summary.total_ordenes || 0}</div>
                </div>
            </div>
            <div class="stat-card-large">
                <div class="stat-icon">🎯</div>
                <div class="stat-info">
                    <div class="stat-label">Ticket Promedio</div>
                    <div class="stat-value">${formatCurrency(summary.ticket_promedio)}</div>
                    <div class="stat-sublabel">Promedio por orden</div>
                </div>
            </div>
            <div class="stat-card-large">
                <div class="stat-icon">✅</div>
                <div class="stat-info">
                    <div class="stat-label">Entregadas</div>
                    <div class="stat-value">${summary.ordenes_completadas || 0}</div>
                    <div class="stat-sublabel">Órdenes completadas</div>
                </div>
            </div>
        </div>

        <div class="analytics-content-grid">
            <div class="analytics-chart-container">
                <h3>🥧 Productos Más Vendidos</h3>
                <canvas id="topProductsChart"></canvas>
            </div>

            <div class="analytics-table-container">
                <h3>🏆 Top 10 Productos</h3>
                <div class="top-products-table">
                    ${topProducts.length === 0 ? `
                        <div class="empty-state">
                            <p>No hay datos para este período</p>
                        </div>
                    ` : topProducts.map((product, index) => `
                        <div class="top-product-row">
                            <div class="top-product-rank">#${index + 1}</div>
                            <img src="${product.image}" alt="${product.name}" class="top-product-image" onerror="this.src='https://via.placeholder.com/50x50?text=?'">
                            <div class="top-product-info">
                                <div class="top-product-name">${product.name}</div>
                                <div class="top-product-stats">
                                    ${product.total_vendido} vendidos · ${product.num_ordenes} órdenes
                                </div>
                            </div>
                            <div class="top-product-revenue">
                                ${formatCurrency(product.ingresos_totales)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
    `;

    if (topProducts.length > 0) {
        renderPieChart(topProducts);
    }
}

function renderPieChart(products) {
    const ctx = document.getElementById('topProductsChart');

    if (analyticsChart) {
        analyticsChart.destroy();
    }

    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];

    analyticsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: products.map(p => p.name),
            datasets: [{
                data: products.map(p => p.total_vendido),
                backgroundColor: colors,
                borderColor: '#1a1a1a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const product = products[context.dataIndex];
                            return `${product.name}: ${product.total_vendido} vendidos (${parseFloat(product.ingresos_totales).toLocaleString('es-CO')})`;
                        }
                    }
                }
            }
        }
    });
}

function changeAnalyticsFilter(value) {
    currentAnalyticsFilter = value;
    
    const customRange = document.getElementById('customDateRange');
    if (customRange) {
        customRange.style.display = value === 'custom' ? 'flex' : 'none';
    }
    
    if (value !== 'custom') {
        loadAnalytics();
    }
}

function applyCustomDateRange() {
    const startDate = document.getElementById('customStartDate')?.value;
    const endDate = document.getElementById('customEndDate')?.value;
    
    if (!startDate || !endDate) {
        alert('Por favor selecciona ambas fechas');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('La fecha inicial no puede ser mayor que la fecha final');
        return;
    }
    
    loadAnalytics();
}

// ============= CLOUDINARY UPLOAD =============

async function uploadImageToCloudinary(file, onProgress) {
    try {
        if (!file.type.startsWith('image/')) {
            throw new Error('Solo se permiten archivos de imagen');
        }

        if (file.size > 10 * 1024 * 1024) {
            throw new Error('La imagen es muy grande. Máximo 10MB');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('folder', 'catalogo-prendas');

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(Math.round(percentComplete));
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.secure_url);
                } else {
                    reject(new Error('Error al subir imagen'));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Error de red al subir imagen'));
            });

            xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`);
            xhr.send(formData);
        });

    } catch (error) {
        console.error('Error al subir imagen:', error);
        throw error;
    }
}

async function handleProductImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const uploadBtn = document.getElementById('uploadImageBtn');
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('uploadProgressFill');
    const progressText = document.getElementById('uploadProgressText');
    const imagePreview = document.getElementById('productImagePreview');
    const imageInput = document.getElementById('productImage');

    try {
        const localPreview = URL.createObjectURL(file);
        imagePreview.src = localPreview;
        imagePreview.style.display = 'block';

        uploadBtn.disabled = true;
        uploadBtn.textContent = '⏳ Subiendo...';

        progressBar.style.display = 'block';

        const imageUrl = await uploadImageToCloudinary(file, (percent) => {
            progressFill.style.width = percent + '%';
            progressText.textContent = percent + '%';
        });

        imageInput.value = imageUrl;

        uploadBtn.textContent = '✅ Imagen subida';
        uploadBtn.style.background = '#2ecc71';

        alert('✅ Imagen subida exitosamente');

        setTimeout(() => {
            uploadBtn.disabled = false;
            uploadBtn.textContent = '📸 Subir Imagen';
            uploadBtn.style.background = '';
            progressBar.style.display = 'none';
            progressFill.style.width = '0%';
            progressText.textContent = '0%';
        }, 2000);

    } catch (error) {
        alert('❌ Error: ' + error.message);
        uploadBtn.disabled = false;
        uploadBtn.textContent = '📸 Subir Imagen';
        progressBar.style.display = 'none';
        imagePreview.style.display = 'none';
    }
}

function toggleUrlInput() {
    const urlSection = document.getElementById('urlInputSection');
    const isHidden = urlSection.style.display === 'none';
    urlSection.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
        document.getElementById('productImageUrl').focus();
    }
}

function updateImageFromUrl(url) {
    if (url) {
        document.getElementById('productImage').value = url;
        const preview = document.getElementById('productImagePreview');
        preview.src = url;
        preview.style.display = 'block';
    }
}

// ============= INICIALIZACIÓN =============
async function initializeApp() {
    const sessionExists = loadSession();
    
    if (sessionExists) {
        console.log('📋 Sesión encontrada, validando...');
        const isValid = await validateSession();
        
        if (!isValid) {
            console.log('❌ Sesión inválida, limpiando...');
            clearSession();
        } else {
            console.log('✅ Sesión válida restaurada');
        }
    }
    
    // PRIMERO renderizar el header
    renderHeader();
    
    // LUEGO asegurar que el contenedor correcto esté visible
    document.getElementById('catalogContent').style.display = 'block';
    document.getElementById('ordersContent').style.display = 'none';
    document.getElementById('analyticsContent').style.display = 'none';
    
    // CARGAR productos (esto es async, espera a que termine)
    try {
        currentProducts = await fetchProducts();
        console.log('✅ Productos cargados:', currentProducts.length);
        // DESPUÉS DE CARGAR, renderizar
        renderCatalog();
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        const content = document.getElementById('catalogContent');
        content.innerHTML = `
            <div class="empty-state">
                <h3>Error al cargar productos</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
    
    console.log(`🔐 Estado: ${isAdmin ? 'Admin' : isLoggedIn ? 'Usuario' : 'Visitante'}`);
}

initializeApp();