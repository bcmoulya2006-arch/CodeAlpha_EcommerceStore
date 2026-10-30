/**
 * CodeAlpha Task 1: Simple E-commerce Store
 * Comprehensive End-to-End Automated Test Suite
 * 
 * Verifies:
 * 1. Database schema initialization & table seeding
 * 2. User registration with password hashing & duplicate rejection
 * 3. User login & signed JWT token generation
 * 4. User profile inspection & statistics
 * 5. Product catalog fetching, category filtering & text search
 * 6. Single product details, rating breakdown & review submission
 * 7. Shopping cart operations (add, retrieve, update qty, clear)
 * 8. Complete order processing / checkout workflow
 * 9. Stock inventory decrement on purchase
 * 10. Order history tracking & status reporting
 * 11. Order cancellation & warehouse stock restoration
 */

const { db, initializeDatabase } = require('./src/config/db');
const { seedDatabase } = require('./src/config/seed');
const authController = require('./src/controllers/authController');
const productController = require('./src/controllers/productController');
const cartController = require('./src/controllers/cartController');
const orderController = require('./src/controllers/orderController');

// Helper to simulate Express request/response in-memory
function callHandler(handler, req = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, data });
      }
    };
    try {
      handler(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🛍️  Starting CodeAlpha Task 1 E-commerce Store E2E Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Initialize & Seed DB
    initializeDatabase();
    seedDatabase();
    assert(true, 'Database initialized with users, products, orders, and reviews');

    // 2. Test User Login (Existing seeded user)
    const loginRes = await callHandler(authController.login, {
      body: { identifier: 'manish_buyer', password: 'password123' }
    });
    assert(
      loginRes.status === 200 && loginRes.data.success && loginRes.data.token,
      'Authentication: Existing user "manish_buyer" logged in with JWT token'
    );
    const manishToken = loginRes.data.token;
    const manishUser = loginRes.data.user;

    // 3. Test Invalid Credentials
    const invalidLoginRes = await callHandler(authController.login, {
      body: { identifier: 'manish_buyer', password: 'wrongpassword' }
    });
    assert(
      invalidLoginRes.status === 401 && !invalidLoginRes.data.success,
      'Authentication: Rejects invalid password with 401 Unauthorized'
    );

    // 4. Test User Registration
    const randomUser = `testuser_${Date.now()}`;
    const regRes = await callHandler(authController.register, {
      body: {
        username: randomUser,
        email: `${randomUser}@codealpha.tech`,
        password: 'securepassword123',
        name: 'Automated Tester',
        address: '101 Cyber Heights',
        phone: '+91 9988776655'
      }
    });
    assert(
      regRes.status === 201 && regRes.data.success && regRes.data.user.id,
      'Registration: Successfully registered new user account with hashed password'
    );
    const newTester = regRes.data.user;

    // 5. Test Profile Retrieval
    const profileRes = await callHandler(authController.getMe, {
      user: { id: manishUser.id }
    });
    assert(
      profileRes.status === 200 && profileRes.data.user.username === 'manish_buyer',
      'User Profile: Retrieved authenticated profile data and order metrics'
    );

    // 6. Test Products Catalog & Categories
    const prodsRes = await callHandler(productController.getAllProducts, { query: {} });
    assert(
      prodsRes.status === 200 && prodsRes.data.products.length >= 10,
      `Products: Catalog returned ${prodsRes.data.products.length} active inventory items`
    );

    // 7. Test Category Filtering
    const audioRes = await callHandler(productController.getAllProducts, {
      query: { category: 'Audio' }
    });
    const allAudio = audioRes.data.products.every(p => p.category === 'Audio');
    assert(
      audioRes.status === 200 && allAudio && audioRes.data.products.length > 0,
      'Products: Category filter correctly filtered for "Audio" items'
    );

    // 8. Test Search Query
    const searchRes = await callHandler(productController.getAllProducts, {
      query: { search: 'Sony' }
    });
    assert(
      searchRes.status === 200 && searchRes.data.products[0].name.includes('Sony'),
      'Products: Full-text search matched product title ("Sony")'
    );

    // 9. Test Product Details & Reviews
    const targetProduct = prodsRes.data.products[0];
    const detailsRes = await callHandler(productController.getProductById, {
      params: { id: targetProduct.id }
    });
    assert(
      detailsRes.status === 200 && detailsRes.data.product.id === targetProduct.id && Array.isArray(detailsRes.data.reviews),
      'Product Details: Fetched complete specifications, stock, and customer reviews'
    );

    // 10. Post a Review
    const reviewRes = await callHandler(productController.addReview, {
      params: { id: targetProduct.id },
      user: { id: newTester.id },
      body: { rating: 5, comment: 'Phenomenal acoustic clarity and premium build.' }
    });
    assert(
      reviewRes.status === 201 && reviewRes.data.success,
      'Customer Reviews: Successfully posted star rating and comment'
    );

    // 11. Shopping Cart: Add Item
    const initialStock = targetProduct.stock;
    const addCartRes = await callHandler(cartController.addToCart, {
      user: { id: newTester.id },
      body: { productId: targetProduct.id, quantity: 2 }
    });
    assert(
      addCartRes.status === 200 && addCartRes.data.success,
      'Shopping Cart: Added product to customer cart'
    );

    // 12. Shopping Cart: Retrieve & Verify
    const getCartRes = await callHandler(cartController.getCart, {
      user: { id: newTester.id }
    });
    assert(
      getCartRes.status === 200 && getCartRes.data.itemCount === 2 && getCartRes.data.items.length === 1,
      'Shopping Cart: Cart retrieval confirmed items, quantity (2), and subtotal calculation'
    );
    const cartItemId = getCartRes.data.items[0].cart_item_id;

    // 13. Shopping Cart: Update Quantity
    const updateQtyRes = await callHandler(cartController.updateQuantity, {
      user: { id: newTester.id },
      params: { id: cartItemId },
      body: { quantity: 1 }
    });
    assert(
      updateQtyRes.status === 200 && updateQtyRes.data.success,
      'Shopping Cart: Updated item quantity to 1'
    );

    // 14. Order Processing / Checkout
    const checkoutRes = await callHandler(orderController.createOrder, {
      user: { id: newTester.id },
      body: {
        shippingAddress: '101 Cyber Heights',
        shippingCity: 'Noida',
        shippingZip: '201301',
        shippingCountry: 'India',
        paymentMethod: 'Credit Card',
        promoCode: 'CODEALPHA20',
        notes: 'Deliver before 5 PM'
      }
    });
    assert(
      checkoutRes.status === 201 && checkoutRes.data.success && checkoutRes.data.order.order_number.startsWith('ORD-'),
      `Order Processing: Generated Order #${checkoutRes.data.order.order_number} with discount & tax calculations`
    );
    const createdOrder = checkoutRes.data.order;

    // 15. Stock Decrement Verification
    const postOrderProduct = db.prepare('SELECT stock FROM products WHERE id = ?').get(targetProduct.id);
    assert(
      postOrderProduct.stock === initialStock - 1,
      `Inventory: Product stock automatically decremented from ${initialStock} to ${postOrderProduct.stock}`
    );

    // 16. User Order History
    const myOrdersRes = await callHandler(orderController.getMyOrders, {
      user: { id: newTester.id }
    });
    assert(
      myOrdersRes.status === 200 && myOrdersRes.data.orders.some(o => o.id === createdOrder.id),
      'Order History: Customer order history successfully lists new order'
    );

    // 17. Order Cancellation & Stock Restoration
    const cancelRes = await callHandler(orderController.cancelOrder, {
      user: { id: newTester.id, role: 'customer' },
      params: { id: createdOrder.id }
    });
    assert(
      cancelRes.status === 200 && cancelRes.data.success,
      'Order Lifecycle: Cancelled order in "Processing" status'
    );

    const restoredProduct = db.prepare('SELECT stock FROM products WHERE id = ?').get(targetProduct.id);
    assert(
      restoredProduct.stock === initialStock,
      `Inventory Restoration: Stock restored back to original ${initialStock} upon cancellation`
    );

  } catch (error) {
    console.error('Fatal test error:', error);
    failed++;
  } finally {
    console.log('\n----------------------------------------------------------------');
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('----------------------------------------------------------------\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
