const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', productController.getAllProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getProductById);
router.post('/:id/reviews', authenticateToken, productController.addReview);
router.post('/', authenticateToken, requireAdmin, productController.createProduct);

module.exports = router;
