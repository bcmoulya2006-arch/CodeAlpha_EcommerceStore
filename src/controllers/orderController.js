const { db } = require('../config/db');

// Helper to generate unique order number
function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

function createOrder(req, res) {
  try {
    const userId = req.user.id;
    const {
      shippingAddress,
      shippingCity,
      shippingZip,
      shippingCountry = 'India',
      paymentMethod = 'Credit Card',
      promoCode,
      notes = '',
      directItems // optional direct checkout without requiring cart
    } = req.body;

    if (!shippingAddress || !shippingCity || !shippingZip) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address, city, and zip code are required.'
      });
    }

    let itemsToOrder = [];

    if (directItems && Array.isArray(directItems) && directItems.length > 0) {
      // Direct checkout items
      for (const item of directItems) {
        const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
        if (!prod) {
          return res.status(404).json({ success: false, message: `Product ID ${item.productId} not found.` });
        }
        if (prod.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${prod.name}". Only ${prod.stock} left.`
          });
        }
        itemsToOrder.push({
          product_id: prod.id,
          name: prod.name,
          image_url: prod.image_url,
          price: prod.price,
          quantity: item.quantity,
          line_total: prod.price * item.quantity
        });
      }
    } else {
      // Pull items from user's cart
      const cartRows = db.prepare(`
        SELECT c.id as cart_item_id, c.quantity, p.id as product_id, p.name, p.price, p.image_url, p.stock
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
      `).all(userId);

      if (cartRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Your cart is empty. Add products before checking out.' });
      }

      for (const row of cartRows) {
        if (row.stock < row.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${row.name}". Only ${row.stock} available.`
          });
        }
        itemsToOrder.push({
          product_id: row.product_id,
          name: row.name,
          image_url: row.image_url,
          price: row.price,
          quantity: row.quantity,
          line_total: row.price * row.quantity
        });
      }
    }

    const subtotal = itemsToOrder.reduce((acc, it) => acc + it.line_total, 0);

    // Calculate discount
    let discount = 0;
    if (promoCode && promoCode.trim().toUpperCase() === 'CODEALPHA20') {
      discount = subtotal * 0.20; // 20% discount
    } else if (promoCode && promoCode.trim().toUpperCase() === 'FIRST10') {
      discount = subtotal * 0.10; // 10% discount
    }

    // Shipping calculation: Free shipping over $150, else $15
    const shippingCost = (subtotal - discount) > 150 ? 0.0 : 15.0;

    // Tax calculation: 5%
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * 0.05;

    const totalAmount = Number((taxableAmount + shippingCost + tax).toFixed(2));
    const orderNumber = generateOrderNumber();

    // Begin Database Operations (Sequential inside transaction logic)
    db.exec('BEGIN TRANSACTION;');

    try {
      const orderInsert = db.prepare(`
        INSERT INTO orders (
          order_number, user_id, total_amount, subtotal, tax, shipping_cost, discount,
          status, payment_method, payment_status, shipping_address, shipping_city,
          shipping_zip, shipping_country, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderNumber,
        userId,
        totalAmount,
        Number(subtotal.toFixed(2)),
        Number(tax.toFixed(2)),
        Number(shippingCost.toFixed(2)),
        Number(discount.toFixed(2)),
        'Processing',
        paymentMethod,
        paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid',
        shippingAddress.trim(),
        shippingCity.trim(),
        shippingZip.trim(),
        shippingCountry.trim(),
        notes.trim()
      );

      const orderId = Number(orderInsert.lastInsertRowid);

      const orderItemInsert = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE products SET stock = stock - ? WHERE id = ?
      `);

      for (const it of itemsToOrder) {
        orderItemInsert.run(
          orderId,
          it.product_id,
          it.name,
          it.image_url,
          it.price,
          it.quantity,
          Number(it.line_total.toFixed(2))
        );
        updateStock.run(it.quantity, it.product_id);
      }

      // If checkout was from cart, clear the user's cart
      if (!directItems) {
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
      }

      db.exec('COMMIT;');

      const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully! Thank you for your purchase.',
        order: {
          ...createdOrder,
          items: orderItems
        }
      });
    } catch (txErr) {
      try { db.exec('ROLLBACK;'); } catch (_) {}
      throw txErr;
    }
  } catch (error) {
    console.error('createOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process order. ' + error.message });
  }
}

function getMyOrders(req, res) {
  try {
    const userId = req.user.id;

    const orders = db.prepare(`
      SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC
    `).all(userId);

    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

    const ordersWithItems = orders.map(order => ({
      ...order,
      items: getItems.all(order.id)
    }));

    return res.status(200).json({
      success: true,
      count: ordersWithItems.length,
      orders: ordersWithItems
    });
  } catch (error) {
    console.error('getMyOrders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve order history.' });
  }
}

function getOrderById(req, res) {
  try {
    const orderId = Number(req.params.id);
    const userId = req.user.id;
    const role = req.user.role;

    let order;
    if (role === 'admin') {
      order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    } else {
      order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const buyer = db.prepare('SELECT id, name, email, phone FROM users WHERE id = ?').get(order.user_id);

    return res.status(200).json({
      success: true,
      order: {
        ...order,
        buyer,
        items
      }
    });
  } catch (error) {
    console.error('getOrderById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve order details.' });
  }
}

function cancelOrder(req, res) {
  try {
    const orderId = Number(req.params.id);
    const userId = req.user.id;
    const role = req.user.role;

    let order;
    if (role === 'admin') {
      order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    } else {
      order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.status !== 'Processing') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because it is already "${order.status}".`
      });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      // Restore product stock
      const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(orderId);
      const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');

      for (const item of items) {
        if (item.product_id) {
          restoreStock.run(item.quantity, item.product_id);
        }
      }

      db.prepare(`UPDATE orders SET status = 'Cancelled', payment_status = 'Refunded' WHERE id = ?`).run(orderId);
      db.exec('COMMIT;');

      return res.status(200).json({
        success: true,
        message: 'Order cancelled successfully and stock restored.'
      });
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch (_) {}
      throw err;
    }
  } catch (error) {
    console.error('cancelOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
}

function getAllOrders(req, res) {
  try {
    const orders = db.prepare(`
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.id DESC
    `).all();

    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

    const fullOrders = orders.map(o => ({
      ...o,
      items: getItems.all(o.id)
    }));

    return res.status(200).json({
      success: true,
      count: fullOrders.length,
      orders: fullOrders
    });
  } catch (error) {
    console.error('getAllOrders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve all orders.' });
  }
}

function updateOrderStatus(req, res) {
  try {
    const orderId = Number(req.params.id);
    const { status, payment_status } = req.body;

    const validStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
      });
    }

    const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (payment_status) {
      updates.push('payment_status = ?');
      params.push(payment_status);
    }

    if (updates.length > 0) {
      params.push(orderId);
      db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully.'
    });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
