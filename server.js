const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Para servir los archivos HTML, CSS, JS

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Pool de conexiones
const pool = mysql.createPool(dbConfig);

// Middleware para verificar token admin
const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_cambiala');
        req.adminId = decoded.id;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// ============= RUTAS DE AUTENTICACIÓN =============

// Login de administrador
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const [admins] = await pool.query(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );

        if (admins.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const admin = admins[0];
        const validPassword = await bcrypt.compare(password, admin.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET || 'tu_clave_secreta_cambiala',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ============= RUTAS DE PRODUCTOS =============

// Obtener todos los productos
app.get('/api/products', async (req, res) => {
    try {
        const [products] = await pool.query(
            'SELECT * FROM products ORDER BY created_at DESC'
        );
        res.json(products);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Obtener un producto por ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const [products] = await pool.query(
            'SELECT * FROM products WHERE id = ?',
            [req.params.id]
        );

        if (products.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(products[0]);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// Crear producto (solo admin)
app.post('/api/products', verifyAdmin, async (req, res) => {
    try {
        const { name, description, price, stock, image } = req.body;

        const [result] = await pool.query(
            'INSERT INTO products (name, description, price, stock, image) VALUES (?, ?, ?, ?, ?)',
            [name, description, price, stock, image]
        );

        res.status(201).json({
            success: true,
            id: result.insertId,
            message: 'Producto creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// Actualizar producto (solo admin)
app.put('/api/products/:id', verifyAdmin, async (req, res) => {
    try {
        const { name, description, price, stock, image } = req.body;

        const [result] = await pool.query(
            'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image = ? WHERE id = ?',
            [name, description, price, stock, image, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({
            success: true,
            message: 'Producto actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// Eliminar producto (solo admin)
app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM products WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({
            success: true,
            message: 'Producto eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// ============= RUTAS DE ÓRDENES =============

// Crear orden
app.post('/api/orders', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { customer, items, subtotal, shipping, total } = req.body;
        const orderNumber = 'ORD-' + Date.now();

        // Crear la orden
        const [orderResult] = await connection.query(
            `INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, 
             customer_address, customer_city, subtotal, shipping, total) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderNumber, customer.name, customer.email, customer.phone, 
             customer.address, customer.city, subtotal, shipping, total]
        );

        const orderId = orderResult.insertId;

        // Insertar items y actualizar stock
        for (const item of items) {
            // Verificar stock disponible
            const [products] = await connection.query(
                'SELECT stock FROM products WHERE id = ? FOR UPDATE',
                [item.id]
            );

            if (products.length === 0 || products[0].stock < item.quantity) {
                await connection.rollback();
                return res.status(400).json({ 
                    error: `Stock insuficiente para ${item.name}` 
                });
            }

            // Insertar item de orden
            await connection.query(
                `INSERT INTO order_items (order_id, product_id, product_name, 
                 product_price, quantity, subtotal) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.id, item.name, item.price, item.quantity, 
                 item.price * item.quantity]
            );

            // Actualizar stock
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.id]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            orderId: orderId,
            orderNumber: orderNumber,
            message: 'Orden creada exitosamente'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear orden:', error);
        res.status(500).json({ error: 'Error al crear orden' });
    } finally {
        connection.release();
    }
});

// Obtener todas las órdenes (solo admin)
app.get('/api/orders', verifyAdmin, async (req, res) => {
    try {
        const [orders] = await pool.query(
            `SELECT o.*, 
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
             FROM orders o 
             ORDER BY created_at DESC`
        );
        res.json(orders);
    } catch (error) {
        console.error('Error al obtener órdenes:', error);
        res.status(500).json({ error: 'Error al obtener órdenes' });
    }
});

// Obtener detalle de una orden (solo admin)
app.get('/api/orders/:id', verifyAdmin, async (req, res) => {
    try {
        const [orders] = await pool.query(
            'SELECT * FROM orders WHERE id = ?',
            [req.params.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        const [items] = await pool.query(
            'SELECT * FROM order_items WHERE order_id = ?',
            [req.params.id]
        );

        res.json({
            ...orders[0],
            items
        });
    } catch (error) {
        console.error('Error al obtener orden:', error);
        res.status(500).json({ error: 'Error al obtener orden' });
    }
});

// Actualizar estado de orden (solo admin)
app.patch('/api/orders/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const [result] = await pool.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        res.json({
            success: true,
            message: 'Estado actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

// ============= RUTA DE SALUD =============
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============= INICIAR SERVIDOR =============
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 API disponible en http://localhost:${PORT}/api`);
});