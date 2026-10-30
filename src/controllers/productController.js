const { db } = require('../config/db');

function getAllProducts(req, res) {
  try {
    const { search, category, sort, minPrice, maxPrice, featured } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      query += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (category && category !== 'All' && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      query += ' AND price >= ?';
      params.push(Number(minPrice));
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      query += ' AND price <= ?';
      params.push(Number(maxPrice));
    }

    if (featured === '1' || featured === 'true') {
      query += ' AND featured = 1';
    }

    // Sorting
    switch (sort) {
      case 'price-asc':
        query += ' ORDER BY price ASC';
        break;
      case 'price-desc':
        query += ' ORDER BY price DESC';
        break;
      case 'rating-desc':
        query += ' ORDER BY rating DESC';
        break;
      case 'name-asc':
        query += ' ORDER BY name ASC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY id DESC';
        break;
    }

    const products = db.prepare(query).all(...params);

    // Also get all distinct categories
    const categoriesRows = db.prepare(`
      SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY category ASC
    `).all();

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
      categories: categoriesRows
    });
  } catch (error) {
    console.error('getAllProducts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve products.' });
  }
}

function getProductById(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Get reviews for this product
    const reviews = db.prepare(`
      SELECT r.id, r.rating, r.comment, r.created_at, u.name as reviewer_name, u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.id DESC
    `).all(id);

    // Get related products in same category
    const related = db.prepare(`
      SELECT id, name, price, image_url, rating, category
      FROM products
      WHERE category = ? AND id != ?
      LIMIT 4
    `).all(product.category, id);

    return res.status(200).json({
      success: true,
      product,
      reviews,
      related
    });
  } catch (error) {
    console.error('getProductById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve product details.' });
  }
}

function getCategories(req, res) {
  try {
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY category ASC
    `).all();

    return res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('getCategories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve categories.' });
  }
}

function addReview(req, res) {
  try {
    const productId = Number(req.params.id);
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }
    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Comment is required.' });
    }

    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    db.prepare(`
      INSERT INTO reviews (product_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `).run(productId, userId, Math.round(rating), comment.trim());

    // Update aggregate product rating
    const avg = db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
      FROM reviews WHERE product_id = ?
    `).get(productId);

    if (avg) {
      db.prepare(`
        UPDATE products
        SET rating = ROUND(?, 1), reviews_count = ?
        WHERE id = ?
      `).run(avg.avg_rating, avg.total_reviews, productId);
    }

    return res.status(201).json({
      success: true,
      message: 'Review posted successfully!'
    });
  } catch (error) {
    console.error('addReview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
}

function createProduct(req, res) {
  try {
    const { name, description, price, category, image_url, stock = 10, featured = 0 } = req.body;

    if (!name || !description || !price || !category || !image_url) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, category, and image URL are required.'
      });
    }

    const result = db.prepare(`
      INSERT INTO products (name, description, price, category, image_url, stock, rating, reviews_count, featured)
      VALUES (?, ?, ?, ?, ?, ?, 5.0, 0, ?)
    `).run(name.trim(), description.trim(), Number(price), category.trim(), image_url.trim(), Number(stock), featured ? 1 : 0);

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(result.lastInsertRowid));

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: newProduct
    });
  } catch (error) {
    console.error('createProduct error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  getCategories,
  addReview,
  createProduct,
};
