const bcrypt = require('bcryptjs');
const { db } = require('./db');

function seedDatabase() {
  // Check if database is already populated
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (existingUsers && existingUsers.count > 0 && existingProducts && existingProducts.count > 0) {
    return;
  }

  console.log('🌱 Seeding initial CodeAlpha E-commerce database...');

  const passwordHash = bcrypt.hashSync('password123', 10);
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password, name, address, phone, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const buyerResult = insertUser.run(
    'manish_buyer',
    'manishkumar17all@gmail.com',
    passwordHash,
    'Manish Kumar',
    'Sector 62, Cyber City, Tech Hub',
    '+91 9876543210',
    'customer'
  );

  const demoResult = insertUser.run(
    'demo_user',
    'demo@codealpha.tech',
    passwordHash,
    'Alex Carter',
    '442 Innovation Way, Suite 10',
    '+1 555-0199',
    'customer'
  );

  const adminResult = insertUser.run(
    'admin',
    'admin@store.codealpha.tech',
    adminPasswordHash,
    'Store Administrator',
    'Headquarters 101, CodeAlpha Tower',
    '+1 800-ALPHA',
    'admin'
  );

  const buyerId = Number(buyerResult.lastInsertRowid);
  const demoId = Number(demoResult.lastInsertRowid);

  // 2. Seed Products
  const insertProduct = db.prepare(`
    INSERT INTO products (name, description, price, category, image_url, stock, rating, reviews_count, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const productsData = [
    {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      description: 'Industry-leading noise canceling with two processors and 8 microphones for unprecedented call and audio quality. Up to 30-hour battery life with ultra-comfortable lightweight design.',
      price: 349.99,
      category: 'Audio',
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      stock: 24,
      rating: 4.9,
      reviews_count: 38,
      featured: 1
    },
    {
      name: 'Apple Watch Series 9 GPS 45mm',
      description: 'Powerful health sensors, advanced workout metrics, bright Always-On Retina display, crash detection, and the magic of double tap gesture navigation.',
      price: 429.00,
      category: 'Wearables',
      image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
      stock: 18,
      rating: 4.8,
      reviews_count: 52,
      featured: 1
    },
    {
      name: 'Logitech MX Master 3S Wireless Mouse',
      description: 'Quiet click performance, 8K DPI any-surface tracking, ergonomic silhouette, electromagnetic MagSpeed scrolling wheel, and multi-device flow control.',
      price: 99.99,
      category: 'Accessories',
      image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
      stock: 45,
      rating: 4.7,
      reviews_count: 27,
      featured: 0
    },
    {
      name: 'Keychron K2 Pro Mechanical Keyboard',
      description: 'Custom wireless mechanical keyboard with QMK/VIA support, hot-swappable tactile brown switches, double-shot PBT keycaps, and durable aluminum frame.',
      price: 119.50,
      category: 'Accessories',
      image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
      stock: 15,
      rating: 4.9,
      reviews_count: 41,
      featured: 1
    },
    {
      name: 'Samsung 34" Odyssey OLED G8 Curved Monitor',
      description: 'Ultra WQHD 175Hz gaming and productivity monitor with 0.03ms response time, Neo Quantum Processor, and mesmerizing ambient lighting core.',
      price: 899.99,
      category: 'Electronics',
      image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
      stock: 8,
      rating: 4.6,
      reviews_count: 19,
      featured: 1
    },
    {
      name: 'Bose SoundLink Flex Bluetooth Speaker',
      description: 'Portable waterproof Bluetooth speaker with PositionIQ technology, crystal-clear outdoor acoustic output, and rugged silicone exterior.',
      price: 149.00,
      category: 'Audio',
      image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
      stock: 30,
      rating: 4.8,
      reviews_count: 34,
      featured: 0
    },
    {
      name: 'Peak Design Everyday Backpack 20L',
      description: 'Iconic award-winning everyday carry and laptop bag. Weatherproof 100% recycled canvas shell with custom FlexFold internal dividers.',
      price: 259.95,
      category: 'Accessories',
      image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
      stock: 20,
      rating: 4.9,
      reviews_count: 22,
      featured: 0
    },
    {
      name: 'Anker 737 Power Bank (PowerCore 24K)',
      description: 'Ultra-powerful 140W fast-charging portable power bank with smart digital display and 3 output ports capable of full laptop charging on the go.',
      price: 139.99,
      category: 'Electronics',
      image_url: 'https://images.unsplash.com/photo-1609592426867-a2f24a0d9b1d?w=800&auto=format&fit=crop&q=80',
      stock: 40,
      rating: 4.8,
      reviews_count: 61,
      featured: 1
    },
    {
      name: 'Ergonomic Standing Desk Mat',
      description: 'High-density anti-fatigue polyurethane comfort mat with active massage points designed for standing desk health and all-day office comfort.',
      price: 64.99,
      category: 'Home & Office',
      image_url: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&auto=format&fit=crop&q=80',
      stock: 25,
      rating: 4.5,
      reviews_count: 14,
      featured: 0
    },
    {
      name: 'Kindle Paperwhite Signature Edition (32 GB)',
      description: '6.8-inch glare-free display with auto-adjusting warm light, wireless charging, and months of battery life for immersive reading anywhere.',
      price: 189.99,
      category: 'Electronics',
      image_url: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=800&auto=format&fit=crop&q=80',
      stock: 22,
      rating: 4.9,
      reviews_count: 75,
      featured: 0
    }
  ];

  const productIds = [];
  for (const prod of productsData) {
    const res = insertProduct.run(
      prod.name,
      prod.description,
      prod.price,
      prod.category,
      prod.image_url,
      prod.stock,
      prod.rating,
      prod.reviews_count,
      prod.featured
    );
    productIds.push(Number(res.lastInsertRowid));
  }

  // 3. Seed Reviews
  const insertReview = db.prepare(`
    INSERT INTO reviews (product_id, user_id, rating, comment)
    VALUES (?, ?, ?, ?)
  `);

  insertReview.run(productIds[0], buyerId, 5, 'Exceptional noise cancellation and battery life. Perfect for coding sessions!');
  insertReview.run(productIds[0], demoId, 5, 'Super comfortable padding, seamless pairing with my laptop and phone.');
  insertReview.run(productIds[1], buyerId, 5, 'The screen brightness and activity tracking are phenomenal.');
  insertReview.run(productIds[3], demoId, 5, 'The tactile typing experience on Keychron K2 Pro is purely magical.');

  // 4. Seed an initial sample order for Manish Kumar
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_number, user_id, total_amount, subtotal, tax, shipping_cost, discount,
      status, payment_method, payment_status, shipping_address, shipping_city,
      shipping_zip, shipping_country, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const orderResult = insertOrder.run(
    'ORD-20261030-9842',
    buyerId,
    469.98,
    469.98,
    0.0,
    0.0,
    0.0,
    'Delivered',
    'Credit Card',
    'Paid',
    'Sector 62, Cyber City, Tech Hub',
    'Noida',
    '201301',
    'India',
    'Delivered to front desk.'
  );

  const orderId = Number(orderResult.lastInsertRowid);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertOrderItem.run(
    orderId,
    productIds[0],
    productsData[0].name,
    productsData[0].image_url,
    productsData[0].price,
    1,
    productsData[0].price
  );

  insertOrderItem.run(
    orderId,
    productIds[3],
    productsData[3].name,
    productsData[3].image_url,
    productsData[3].price,
    1,
    productsData[3].price
  );

  console.log('✅ Database seeded with 10 products, 3 accounts, and sample orders.');
}

module.exports = {
  seedDatabase,
};
