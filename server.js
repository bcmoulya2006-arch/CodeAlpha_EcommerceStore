const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./src/config/db');
const { seedDatabase } = require('./src/config/seed');

// Initialize and Seed Database
initializeDatabase();
seedDatabase();

// Route Handlers
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    task: 'CodeAlpha Task 1: Simple E-commerce Store',
    timestamp: new Date().toISOString()
  });
});

// API 404 Handler
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Single Page Application Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🛍️ AlphaStore E-commerce Server running on http://localhost:${PORT}`);
});

module.exports = { app, server };
