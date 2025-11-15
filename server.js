//server.js
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
app.use(express.static('public'));

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

const pool = mysql.createPool(dbConfig);

// Función para inicializar las tablas
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // Crear tabla de usuarios
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                address TEXT,
                city VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de productos si no existe
        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price INT NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                image VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de órdenes si no existe
        await connection.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT PRIMARY KEY AUTO_INCREMENT,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(20),
                customer_address TEXT,
                customer_city VARCHAR(100),
                subtotal INT NOT NULL,
                shipping INT NOT NULL,
                total INT NOT NULL,
                status ENUM('pending_payment', 'pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending_payment',
                payment_method VARCHAR(50),
                paid_at TIMESTAMP NULL,
                confirmed_by INT,
                payment_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de ítems de órdenes si no existe
        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                order_id INT NOT NULL,
                product_id INT NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_price INT NOT NULL,
                quantity INT NOT NULL,
                subtotal INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);

        // Crear tabla de admins si no existe
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        connection.release();
        console.log('✅ Base de datos inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
    }
}

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

// Middleware para verificar token usuario
const verifyUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_cambiala');
        req.userId = decoded.id;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// ============= RUTAS DE AUTENTICACIÓN =============

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

// ============= RUTAS DE USUARIOS =============

// Registrar usuario
app.post('/api/users/register', async (req, res) => {
    try {
        const { name, email, password, phone, address, city } = req.body;

        // Validar que no exista el usuario
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear usuario
        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone, address, city) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, hashedPassword, phone || '', address || '', city || '']
        );

        const userId = result.insertId;

        // Generar token
        const token = jwt.sign(
            { id: userId, email: email },
            process.env.JWT_SECRET || 'tu_clave_secreta_cambiala',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: userId,
                name,
                email,
                phone: phone || '',
                address: address || '',
                city: city || ''
            }
        });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// Login usuario
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'tu_clave_secreta_cambiala',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                city: user.city
            }
        });
    } catch (error) {
        console.error('Error en login usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Obtener perfil usuario
app.get('/api/users/profile', verifyUser, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, phone, address, city FROM users WHERE id = ?',
            [req.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

// Actualizar perfil usuario
app.put('/api/users/profile', verifyUser, async (req, res) => {
    try {
        const { name, phone, address, city } = req.body;

        await pool.query(
            'UPDATE users SET name = ?, phone = ?, address = ?, city = ? WHERE id = ?',
            [name, phone || '', address || '', city || '', req.userId]
        );

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// Cambiar contraseña usuario
app.put('/api/users/change-password', verifyUser, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const [users] = await pool.query(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, req.userId]
        );

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});

// Obtener órdenes del usuario
app.get('/api/users/orders', verifyUser, async (req, res) => {
    try {
        const [orders] = await pool.query(
            `SELECT 
                o.id,
                o.order_number,
                o.total,
                o.status,
                o.created_at,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
             FROM orders o
             WHERE o.customer_email = (SELECT email FROM users WHERE id = ?)
             ORDER BY o.created_at DESC`,
            [req.userId]
        );

        res.json(orders);
    } catch (error) {
        console.error('Error al obtener órdenes:', error);
        res.status(500).json({ error: 'Error al obtener órdenes' });
    }
});

// Obtener detalle de orden del usuario
app.get('/api/users/orders/:id', verifyUser, async (req, res) => {
    try {
        const [orders] = await pool.query(
            `SELECT o.*
             FROM orders o
             WHERE o.id = ? AND o.customer_email = (SELECT email FROM users WHERE id = ?)`,
            [req.params.id, req.userId]
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

// ============= RUTAS DE PRODUCTOS =============

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

// Crear orden pendiente de pago (NO descuenta stock)
app.post('/api/orders', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { customer, items, subtotal, shipping, total } = req.body;
        const orderNumber = 'ORD-' + Date.now();

        // Verificar que hay stock disponible (sin descontar aún)
        for (const item of items) {
            const [products] = await connection.query(
                'SELECT stock FROM products WHERE id = ?',
                [item.id]
            );

            if (products.length === 0 || products[0].stock < item.quantity) {
                await connection.rollback();
                return res.status(400).json({ 
                    error: `Stock insuficiente para ${item.name}` 
                });
            }
        }

        // Crear la orden con estado pending_payment
        const [orderResult] = await connection.query(
            `INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, 
             customer_address, customer_city, subtotal, shipping, total, status, payment_method) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'whatsapp')`,
            [orderNumber, customer.name, customer.email, customer.phone, 
             customer.address, customer.city, subtotal, shipping, total]
        );

        const orderId = orderResult.insertId;

        // Insertar items (SIN descontar stock todavía)
        for (const item of items) {
            await connection.query(
                `INSERT INTO order_items (order_id, product_id, product_name, 
                 product_price, quantity, subtotal) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.id, item.name, item.price, item.quantity, 
                 item.price * item.quantity]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            orderId: orderId,
            orderNumber: orderNumber,
            message: 'Orden creada, esperando confirmación de pago'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear orden:', error);
        res.status(500).json({ error: 'Error al crear orden' });
    } finally {
        connection.release();
    }
});

// Confirmar pago manualmente (ADMIN) - Aquí se descuenta el stock
app.post('/api/orders/:id/confirm-payment', verifyAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { payment_notes } = req.body;

        // Obtener la orden
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE id = ?',
            [req.params.id]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        const order = orders[0];

        if (order.status !== 'pending_payment') {
            await connection.rollback();
            return res.status(400).json({ error: 'Esta orden ya fue procesada' });
        }

        // Obtener items de la orden
        const [items] = await connection.query(
            'SELECT * FROM order_items WHERE order_id = ?',
            [order.id]
        );

        // Descontar stock de productos
        for (const item of items) {
            const [result] = await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                [item.quantity, item.product_id, item.quantity]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return res.status(400).json({ 
                    error: `Stock insuficiente para ${item.product_name}. Por favor cancela la orden.` 
                });
            }
        }

        // Actualizar orden a pagada y pendiente de procesamiento
        await connection.query(
            `UPDATE orders 
             SET status = 'pending', 
                 paid_at = NOW(),
                 confirmed_by = ?,
                 payment_notes = ?
             WHERE id = ?`,
            [req.adminId, payment_notes || 'Pago confirmado por admin', order.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Pago confirmado y stock actualizado exitosamente'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al confirmar pago:', error);
        res.status(500).json({ error: 'Error al confirmar pago' });
    } finally {
        connection.release();
    }
});

// Cancelar orden (devuelve stock si ya fue descontado)
app.post('/api/orders/:id/cancel', verifyAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { reason } = req.body;

        // Obtener la orden
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE id = ?',
            [req.params.id]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        const order = orders[0];

        // Si la orden ya fue pagada, devolver el stock
        if (order.status !== 'pending_payment' && order.status !== 'cancelled') {
            const [items] = await connection.query(
                'SELECT * FROM order_items WHERE order_id = ?',
                [order.id]
            );

            for (const item of items) {
                await connection.query(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }
        }

        // Marcar orden como cancelada
        await connection.query(
            `UPDATE orders 
             SET status = 'cancelled',
                 payment_notes = ?
             WHERE id = ?`,
            [reason || 'Cancelada por administrador', order.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Orden cancelada exitosamente'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al cancelar orden:', error);
        res.status(500).json({ error: 'Error al cancelar orden' });
    } finally {
        connection.release();
    }
});

// Obtener todas las órdenes (admin)
app.get('/api/orders', verifyAdmin, async (req, res) => {
    try {
        const [orders] = await pool.query(
            `SELECT o.*, 
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count,
             a.username as confirmed_by_username
             FROM orders o 
             LEFT JOIN admins a ON o.confirmed_by = a.id
             ORDER BY 
                CASE 
                    WHEN o.status = 'pending_payment' THEN 1
                    WHEN o.status = 'pending' THEN 2
                    WHEN o.status = 'processing' THEN 3
                    ELSE 4
                END,
                o.created_at DESC`
        );
        res.json(orders);
    } catch (error) {
        console.error('Error al obtener órdenes:', error);
        res.status(500).json({ error: 'Error al obtener órdenes' });
    }
});

// Obtener detalle de una orden (admin)
app.get('/api/orders/:id', verifyAdmin, async (req, res) => {
    try {
        const [orders] = await pool.query(
            `SELECT o.*, a.username as confirmed_by_username
             FROM orders o
             LEFT JOIN admins a ON o.confirmed_by = a.id
             WHERE o.id = ?`,
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

// Actualizar estado de orden (admin)
app.patch('/api/orders/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending_payment', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

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

// ============= ANALÍTICAS (ADMIN) =============

app.get('/api/analytics/top-products', verifyAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = `
            SELECT 
                p.id,
                p.name,
                p.image,
                p.price,
                SUM(oi.quantity) as total_vendido,
                COUNT(DISTINCT oi.order_id) as num_ordenes,
                SUM(oi.subtotal) as ingresos_totales
            FROM order_items oi
            INNER JOIN products p ON oi.product_id = p.id
            INNER JOIN orders o ON oi.order_id = o.id
            WHERE o.status IN ('pending', 'processing', 'shipped', 'delivered')
        `;
        
        const params = [];
        
        if (startDate && endDate) {
            query += ` AND o.created_at BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }
        
        query += `
            GROUP BY p.id, p.name, p.image, p.price
            ORDER BY total_vendido DESC
            LIMIT 10
        `;
        
        const [results] = await pool.query(query, params);
        res.json(results);
    } catch (error) {
        console.error('Error al obtener analíticas:', error);
        res.status(500).json({ error: 'Error al obtener analíticas' });
    }
});

app.get('/api/analytics/sales-summary', verifyAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = `
            SELECT 
                COUNT(*) as total_ordenes,
                SUM(total) as ingresos_totales,
                AVG(total) as ticket_promedio,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as ordenes_completadas
            FROM orders
            WHERE status IN ('pending', 'processing', 'shipped', 'delivered')
        `;
        
        const params = [];
        
        if (startDate && endDate) {
            query += ` AND created_at BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }
        
        const [results] = await pool.query(query, params);
        res.json(results[0]);
    } catch (error) {
        console.error('Error al obtener resumen de ventas:', error);
        res.status(500).json({ error: 'Error al obtener resumen de ventas' });
    }
});

// ============= RUTA DE SALUD =============
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============= INICIAR SERVIDOR =============
app.listen(PORT, async () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 API disponible en http://localhost:${PORT}/api`);
    console.log(`💰 Sistema de pago manual por WhatsApp activado`);
    
    // Inicializar base de datos
    await initializeDatabase();
});