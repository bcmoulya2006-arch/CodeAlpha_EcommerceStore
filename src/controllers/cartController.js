const { db } = require('../config/db');

function getCart(req, res) {
  try {
    const userId = req.user.id;

    const items = db.prepare(`
      SELECT 
        c.id as cart_item_id,
        c.quantity,
        c.created_at,
        p.id as product_id,
        p.name,
        p.price,
        p.category,
        p.image_url,
        p.stock,
        (p.price * c.quantity) as line_total
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.id DESC
    `).all(userId);

    const subtotal = items.reduce((acc, it) => acc + it.line_total, 0);
    const totalItems = items.reduce((acc, it) => acc + it.quantity, 0);

    return res.status(200).json({
      success: true,
      items,
      itemCount: totalItems,
      subtotal: Number(subtotal.toFixed(2))
    });
  } catch (error) {
    console.error('getCart error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve cart items.' });
  }
}

function addToCart(req, res) {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const product = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (product.stock < qty) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} units available in stock.`
      });
    }

    // Check if already in user's cart
    const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId);

    if (existing) {
      const newQty = existing.quantity + qty;
      if (newQty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more. You have ${existing.quantity} in cart and only ${product.stock} in stock.`
        });
      }
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(userId, productId, qty);
    }

    return res.status(200).json({
      success: true,
      message: `"${product.name}" added to cart!`
    });
  } catch (error) {
    console.error('addToCart error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add item to cart.' });
  }
}

function updateQuantity(req, res) {
  try {
    const userId = req.user.id;
    const cartItemId = Number(req.params.id);
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);

    const item = db.prepare(`
      SELECT c.id, c.product_id, p.stock, p.name
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = ? AND c.user_id = ?
    `).get(cartItemId, userId);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    if (qty <= 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ?').run(cartItemId);
      return res.status(200).json({
        success: true,
        message: 'Item removed from cart.'
      });
    }

    if (qty > item.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot set quantity beyond available stock (${item.stock}).`
      });
    }

    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(qty, cartItemId);

    return res.status(200).json({
      success: true,
      message: 'Cart updated.'
    });
  } catch (error) {
    console.error('updateQuantity error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update item quantity.' });
  }
}

function removeFromCart(req, res) {
  try {
    const userId = req.user.id;
    const cartItemId = Number(req.params.id);

    const result = db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(cartItemId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Item not found in your cart.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart.'
    });
  } catch (error) {
    console.error('removeFromCart error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove cart item.' });
  }
}

function clearCart(req, res) {
  try {
    const userId = req.user.id;
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);

    return res.status(200).json({
      success: true,
      message: 'Cart cleared.'
    });
  } catch (error) {
    console.error('clearCart error:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear cart.' });
  }
}

function syncCart(req, res) {
  try {
    const userId = req.user.id;
    const { items = [] } = req.body;

    if (Array.isArray(items)) {
      for (const it of items) {
        if (!it.productId || !it.quantity) continue;
        const prod = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(it.productId);
        if (!prod) continue;

        const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, it.productId);
        const qty = Math.min(prod.stock, it.quantity);

        if (existing) {
          const mergedQty = Math.min(prod.stock, existing.quantity + qty);
          db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(mergedQty, existing.id);
        } else {
          db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(userId, it.productId, qty);
        }
      }
    }

    return getCart(req, res);
  } catch (error) {
    console.error('syncCart error:', error);
    return res.status(500).json({ success: false, message: 'Failed to sync cart.' });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  syncCart,
};
