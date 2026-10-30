const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken); // All order routes require authentication

router.post('/checkout', orderController.createOrder);
router.get('/my-orders', orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);
router.post('/:id/cancel', orderController.cancelOrder);

// Admin endpoints
router.get('/admin/all', requireAdmin, orderController.getAllOrders);
router.patch('/admin/:id/status', requireAdmin, orderController.updateOrderStatus);

module.exports = router;
