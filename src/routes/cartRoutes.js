const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken); // All cart routes require authentication

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.put('/items/:id', cartController.updateQuantity);
router.delete('/items/:id', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);
router.post('/sync', cartController.syncCart);

module.exports = router;
