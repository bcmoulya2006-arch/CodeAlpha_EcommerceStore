/**
 * AlphaStore — Frontend JavaScript Application
 * CodeAlpha Full Stack Web Development Internship — Task 1
 */

// ==========================================================================
// Application State
// ==========================================================================
const state = {
  user: JSON.parse(localStorage.getItem('alpha_user') || 'null'),
  token: localStorage.getItem('alpha_token') || null,
  products: [],
  categories: [],
  cart: {
    items: [],
    subtotal: 0,
    itemCount: 0
  },
  appliedCoupon: null, // { code: 'CODEALPHA20', percent: 0.20 }
  activeCategory: 'All',
  searchQuery: '',
  sortBy: 'newest',
  selectedProduct: null,
  directCheckoutItem: null
};

// Demo user credentials for instant testing
const DEMO_ACCOUNTS = {
  manish: { identifier: 'manish_buyer', password: 'password123' },
  demo: { identifier: 'demo_user', password: 'password123' },
  admin: { identifier: 'admin', password: 'admin123' }
};

// ==========================================================================
// API Helpers
// ==========================================================================
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status} Error`);
    }
    return data;
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  updateAuthUI();
  await loadCategories();
  await loadProducts();
  await loadCart();
  await updateOrdersCountBadge();
});

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
  // Search input with debounce
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  let searchTimeout = null;

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadProducts();
    }, 280);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    loadProducts();
  });

  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    loadProducts();
  });

  // Demo user select
  const demoAccountSelect = document.getElementById('demoAccountSelect');
  demoAccountSelect.addEventListener('change', handleDemoAccountSwitch);

  // Cart open/close
  document.getElementById('cartNavBtn').addEventListener('click', () => toggleCartDrawer(true));
  document.getElementById('proceedCheckoutBtn').addEventListener('click', () => {
    toggleCartDrawer(false);
    openCheckoutModal();
  });
  document.getElementById('clearCartBtn').addEventListener('click', handleClearCart);

  // Orders open
  document.getElementById('ordersNavBtn').addEventListener('click', openOrdersModal);
  document.getElementById('dropdownOrdersBtn').addEventListener('click', () => {
    closeUserDropdown();
    openOrdersModal();
  });

  // Auth & Profile
  document.getElementById('authNavBtn').addEventListener('click', () => {
    if (state.user) {
      toggleUserDropdown();
    } else {
      openAuthModal('login');
    }
  });

  document.getElementById('dropdownProfileBtn').addEventListener('click', () => {
    closeUserDropdown();
    openProfileModal();
  });

  document.getElementById('dropdownLogoutBtn').addEventListener('click', () => {
    closeUserDropdown();
    handleLogout();
  });

  // Hero Quick Demo Button
  document.getElementById('heroQuickDemoBtn').addEventListener('click', () => {
    openOrdersModal();
  });

  // Forms
  document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
  document.getElementById('registerForm').addEventListener('submit', handleRegisterSubmit);
  document.getElementById('checkoutForm').addEventListener('submit', handleCheckoutSubmit);
  document.getElementById('profileForm').addEventListener('submit', handleProfileSubmit);

  // Apply Coupon
  document.getElementById('applyCouponBtn').addEventListener('click', handleApplyCoupon);

  // Payment radio cards click handler
  document.querySelectorAll('.payment-radio-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.payment-radio-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      radio.checked = true;

      const cardFields = document.getElementById('cardFieldsContainer');
      cardFields.style.display = radio.value === 'Credit Card' ? 'flex' : 'none';
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const userWrapper = document.querySelector('.user-menu-wrapper');
    if (userWrapper && !userWrapper.contains(e.target)) {
      closeUserDropdown();
    }
  });
}

// ==========================================================================
// Authentication & User State
// ==========================================================================
function updateAuthUI() {
  const userNameDisplay = document.getElementById('userNameDisplay');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const dropdownUserEmail = document.getElementById('dropdownUserEmail');
  const demoAccountSelect = document.getElementById('demoAccountSelect');

  if (state.user) {
    userNameDisplay.textContent = state.user.name.split(' ')[0];
    dropdownUserName.textContent = state.user.name;
    dropdownUserEmail.textContent = state.user.email;

    if (state.user.username === 'manish_buyer') demoAccountSelect.value = 'manish';
    else if (state.user.username === 'demo_user') demoAccountSelect.value = 'demo';
    else if (state.user.role === 'admin') demoAccountSelect.value = 'admin';
    else demoAccountSelect.value = 'manish';
  } else {
    userNameDisplay.textContent = 'Sign In';
    dropdownUserName.textContent = 'Guest User';
    dropdownUserEmail.textContent = 'Not signed in';
    demoAccountSelect.value = 'guest';
  }
}

async function handleDemoAccountSwitch(e) {
  const val = e.target.value;
  if (val === 'guest') {
    handleLogout();
    showToast('Switched to Guest Mode (Logged out)', 'info');
    return;
  }

  const credentials = DEMO_ACCOUNTS[val];
  if (!credentials) return;

  try {
    const res = await apiRequest('/api/auth/login', 'POST', credentials);
    state.user = res.user;
    state.token = res.token;
    localStorage.setItem('alpha_user', JSON.stringify(res.user));
    localStorage.setItem('alpha_token', res.token);

    updateAuthUI();
    await loadCart();
    await updateOrdersCountBadge();
    showToast(`Switched user: ${res.user.name} (${res.user.role})`, 'success');
  } catch (error) {
    showToast('Failed to switch demo account: ' + error.message, 'danger');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;

  const btnText = document.getElementById('loginBtnText');
  const spinner = document.getElementById('loginBtnSpinner');
  const submitBtn = document.getElementById('loginSubmitBtn');

  submitBtn.disabled = true;
  spinner.style.display = 'inline-block';
  btnText.style.display = 'none';

  try {
    const res = await apiRequest('/api/auth/login', 'POST', { identifier, password });
    state.user = res.user;
    state.token = res.token;
    localStorage.setItem('alpha_user', JSON.stringify(res.user));
    localStorage.setItem('alpha_token', res.token);

    updateAuthUI();
    closeAuthModal();
    await loadCart();
    await updateOrdersCountBadge();
    showToast(res.message || `Welcome back, ${res.user.name}!`, 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    submitBtn.disabled = false;
    spinner.style.display = 'none';
    btnText.style.display = 'inline-flex';
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regFullName').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const address = document.getElementById('regAddress').value.trim();

  const btnText = document.getElementById('regBtnText');
  const spinner = document.getElementById('regBtnSpinner');
  const submitBtn = document.getElementById('registerSubmitBtn');

  submitBtn.disabled = true;
  spinner.style.display = 'inline-block';
  btnText.style.display = 'none';

  try {
    const res = await apiRequest('/api/auth/register', 'POST', {
      name,
      username,
      email,
      password,
      address
    });

    state.user = res.user;
    state.token = res.token;
    localStorage.setItem('alpha_user', JSON.stringify(res.user));
    localStorage.setItem('alpha_token', res.token);

    updateAuthUI();
    closeAuthModal();
    await loadCart();
    await updateOrdersCountBadge();
    showToast(res.message, 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    submitBtn.disabled = false;
    spinner.style.display = 'none';
    btnText.style.display = 'inline-flex';
  }
}

function handleLogout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('alpha_user');
  localStorage.removeItem('alpha_token');
  state.cart = { items: [], subtotal: 0, itemCount: 0 };
  updateAuthUI();
  renderCartDrawer();
  updateOrdersCountBadge();
  showToast('You have been signed out.', 'info');
}

// ==========================================================================
// Catalog & Products
// ==========================================================================
async function loadCategories() {
  try {
    const res = await apiRequest('/api/products/categories');
    state.categories = res.categories || [];
    renderCategoryPills();
  } catch (err) {
    console.error('Failed to load categories', err);
  }
}

function renderCategoryPills() {
  const container = document.getElementById('categoryPillsContainer');
  const totalCount = state.categories.reduce((acc, c) => acc + c.count, 0);

  let html = `
    <button class="pill ${state.activeCategory === 'All' ? 'active' : ''}" onclick="selectCategory('All')">
      All Items (${totalCount})
    </button>
  `;

  state.categories.forEach(cat => {
    const isActive = state.activeCategory === cat.category;
    html += `
      <button class="pill ${isActive ? 'active' : ''}" onclick="selectCategory('${escapeHtml(cat.category)}')">
        ${escapeHtml(cat.category)} (${cat.count})
      </button>
    `;
  });

  container.innerHTML = html;
}

function selectCategory(category) {
  state.activeCategory = category;
  renderCategoryPills();
  loadProducts();
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  const resultsCount = document.getElementById('resultsCount');
  const noProducts = document.getElementById('noProductsFound');
  const resetBtn = document.getElementById('resetFiltersBtn');

  resultsCount.textContent = 'Fetching products...';

  const params = new URLSearchParams();
  if (state.activeCategory && state.activeCategory !== 'All') {
    params.append('category', state.activeCategory);
  }
  if (state.searchQuery) {
    params.append('search', state.searchQuery);
  }
  if (state.sortBy) {
    params.append('sort', state.sortBy);
  }

  const hasFilters = state.activeCategory !== 'All' || state.searchQuery;
  resetBtn.style.display = hasFilters ? 'inline' : 'none';

  try {
    const res = await apiRequest(`/api/products?${params.toString()}`);
    state.products = res.products || [];

    resultsCount.textContent = `Showing ${state.products.length} product${state.products.length === 1 ? '' : 's'}${hasFilters ? ' matching filters' : ''}`;

    if (state.products.length === 0) {
      grid.innerHTML = '';
      noProducts.style.display = 'block';
    } else {
      noProducts.style.display = 'none';
      renderProductsGrid();
    }
  } catch (err) {
    resultsCount.textContent = 'Error loading products.';
    showToast('Failed to load products: ' + err.message, 'danger');
  }
}

function renderProductsGrid() {
  const grid = document.getElementById('productsGrid');

  grid.innerHTML = state.products.map(prod => {
    let stockClass = 'in-stock';
    let stockText = `${prod.stock} in stock`;
    if (prod.stock === 0) {
      stockClass = 'out-of-stock';
      stockText = 'Out of Stock';
    } else if (prod.stock < 10) {
      stockClass = 'low-stock';
      stockText = `Only ${prod.stock} left`;
    }

    return `
      <div class="product-card" data-id="${prod.id}">
        <div class="product-image-wrap" onclick="openProductDetails(${prod.id})">
          <img src="${prod.image_url}" alt="${escapeHtml(prod.name)}" loading="lazy">
          ${prod.featured ? '<span class="product-badge-featured"><i class="fa-solid fa-star"></i> Featured</span>' : ''}
          <span class="product-category-tag">${escapeHtml(prod.category)}</span>
        </div>
        <div class="product-body">
          <div class="product-rating">
            <i class="fa-solid fa-star"></i>
            <strong>${prod.rating}</strong>
            <span>(${prod.reviews_count} reviews)</span>
          </div>
          <h3 class="product-title" onclick="openProductDetails(${prod.id})">${escapeHtml(prod.name)}</h3>
          <p class="product-desc">${escapeHtml(prod.description)}</p>
          <div class="product-footer">
            <div class="product-price-box">
              <span class="product-price">$${prod.price.toFixed(2)}</span>
              <span class="product-stock-tag ${stockClass}">${stockText}</span>
            </div>
            <div class="card-actions">
              <button class="btn btn-secondary btn-icon" onclick="openProductDetails(${prod.id})" title="View Product Details">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="btn btn-primary" onclick="handleAddToCart(${prod.id}, 1)" ${prod.stock === 0 ? 'disabled' : ''}>
                <i class="fa-solid fa-cart-plus"></i> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function resetAllFilters() {
  state.activeCategory = 'All';
  state.searchQuery = '';
  state.sortBy = 'newest';
  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearchBtn').style.display = 'none';
  document.getElementById('sortSelect').value = 'newest';
  renderCategoryPills();
  loadProducts();
}

// ==========================================================================
// Product Details Modal
// ==========================================================================
async function openProductDetails(productId) {
  const modal = document.getElementById('productModal');
  const body = document.getElementById('productModalBody');

  body.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
      <span class="spinner" style="width: 32px; height: 32px; border-width: 3px;"></span>
      <p style="margin-top: 1rem;">Loading product details...</p>
    </div>
  `;
  modal.classList.add('show');

  try {
    const res = await apiRequest(`/api/products/${productId}`);
    const product = res.product;
    const reviews = res.reviews || [];
    state.selectedProduct = product;

    let stockText = `${product.stock} units currently available in warehouse`;
    let stockClass = 'in-stock';
    if (product.stock === 0) {
      stockText = 'Currently out of stock';
      stockClass = 'out-of-stock';
    }

    body.innerHTML = `
      <div class="modal-product-gallery">
        <img src="${product.image_url}" alt="${escapeHtml(product.name)}">
      </div>
      <div class="modal-product-info">
        <span class="modal-product-cat"><i class="fa-solid fa-tag"></i> ${escapeHtml(product.category)}</span>
        <h2 class="modal-product-title">${escapeHtml(product.name)}</h2>
        
        <div class="modal-rating-row">
          <div class="modal-stars">
            ${renderStars(product.rating)}
          </div>
          <span style="font-weight: 700;">${product.rating} / 5.0</span>
          <span class="text-muted">(${reviews.length} customer reviews)</span>
        </div>

        <div class="modal-product-price">$${product.price.toFixed(2)}</div>
        
        <div style="margin-bottom: 1rem;">
          <span class="product-stock-tag ${stockClass}" style="font-size: 0.85rem;">
            <i class="fa-solid fa-circle-check"></i> ${stockText}
          </span>
        </div>

        <p class="modal-product-desc">${escapeHtml(product.description)}</p>

        <div class="modal-actions-row">
          <div class="qty-counter">
            <button class="qty-btn" onclick="adjustModalQty(-1)"><i class="fa-solid fa-minus"></i></button>
            <span id="modalQtyVal" class="qty-value">1</span>
            <button class="qty-btn" onclick="adjustModalQty(1)"><i class="fa-solid fa-plus"></i></button>
          </div>

          <button class="btn btn-primary btn-lg" onclick="handleModalAddToCart()" ${product.stock === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-cart-shopping"></i> Add to Cart
          </button>

          <button class="btn btn-secondary btn-lg" onclick="handleBuyNow(${product.id})" ${product.stock === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-bolt"></i> Instant Buy
          </button>
        </div>
      </div>

      <!-- Customer Reviews & Review Form -->
      <div class="modal-reviews-section">
        <div class="reviews-header">
          <h3>Customer Reviews (${reviews.length})</h3>
        </div>

        <div class="reviews-list">
          ${reviews.length === 0 ? '<p class="text-muted">No reviews yet for this product. Be the first to leave one below!</p>' : ''}
          ${reviews.map(r => `
            <div class="review-item">
              <div class="review-meta">
                <span class="reviewer-name"><i class="fa-regular fa-circle-user"></i> ${escapeHtml(r.reviewer_name)}</span>
                <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <div class="modal-stars" style="font-size: 0.8rem; margin-bottom: 0.35rem;">
                ${renderStars(r.rating)}
              </div>
              <p style="font-size: 0.875rem; color: #e2e8f0;">${escapeHtml(r.comment)}</p>
            </div>
          `).join('')}
        </div>

        <!-- Add Review Box -->
        <div class="add-review-box">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;"><i class="fa-regular fa-star"></i> Leave a Review</h4>
          ${state.user ? `
            <form onsubmit="handleReviewSubmit(event, ${product.id})">
              <div class="star-rating-select" id="starRatingSelect">
                <i class="fa-solid fa-star active" data-val="1" onclick="setReviewRating(1)"></i>
                <i class="fa-solid fa-star active" data-val="2" onclick="setReviewRating(2)"></i>
                <i class="fa-solid fa-star active" data-val="3" onclick="setReviewRating(3)"></i>
                <i class="fa-solid fa-star active" data-val="4" onclick="setReviewRating(4)"></i>
                <i class="fa-solid fa-star active" data-val="5" onclick="setReviewRating(5)"></i>
              </div>
              <input type="hidden" id="selectedStarRating" value="5">
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <textarea id="reviewCommentInput" rows="2" required placeholder="Write your honest review of this item..."></textarea>
              </div>
              <button type="submit" class="btn btn-secondary btn-sm">Submit Review</button>
            </form>
          ` : `
            <p style="font-size: 0.85rem;">Please <a href="javascript:void(0)" onclick="closeProductModal(); openAuthModal('login')">Sign in</a> to leave a customer review.</p>
          `}
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
        <p class="text-danger">Failed to load product details: ${err.message}</p>
        <button class="btn btn-secondary" onclick="closeProductModal()">Close</button>
      </div>
    `;
  }
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('show');
  state.selectedProduct = null;
}

function adjustModalQty(delta) {
  const qtyEl = document.getElementById('modalQtyVal');
  if (!qtyEl || !state.selectedProduct) return;
  let current = parseInt(qtyEl.textContent, 10) || 1;
  current += delta;
  if (current < 1) current = 1;
  if (current > state.selectedProduct.stock) current = state.selectedProduct.stock;
  qtyEl.textContent = current;
}

function handleModalAddToCart() {
  if (!state.selectedProduct) return;
  const qtyEl = document.getElementById('modalQtyVal');
  const qty = parseInt(qtyEl.textContent, 10) || 1;
  handleAddToCart(state.selectedProduct.id, qty);
  closeProductModal();
}

function handleBuyNow(productId) {
  closeProductModal();
  const product = state.products.find(p => p.id === productId) || state.selectedProduct;
  if (!product) return;

  state.directCheckoutItem = {
    productId: product.id,
    name: product.name,
    image_url: product.image_url,
    price: product.price,
    quantity: 1,
    line_total: product.price
  };

  openCheckoutModal(true);
}

function setReviewRating(rating) {
  document.getElementById('selectedStarRating').value = rating;
  const stars = document.querySelectorAll('#starRatingSelect i');
  stars.forEach((s, idx) => {
    if (idx < rating) {
      s.classList.add('active');
    } else {
      s.classList.remove('active');
    }
  });
}

async function handleReviewSubmit(e, productId) {
  e.preventDefault();
  const rating = parseInt(document.getElementById('selectedStarRating').value, 10);
  const comment = document.getElementById('reviewCommentInput').value.trim();

  try {
    const res = await apiRequest(`/api/products/${productId}/reviews`, 'POST', { rating, comment });
    showToast(res.message || 'Review submitted!', 'success');
    await openProductDetails(productId);
    await loadProducts();
  } catch (err) {
    showToast('Failed to submit review: ' + err.message, 'danger');
  }
}

// ==========================================================================
// Shopping Cart Operations
// ==========================================================================
async function loadCart() {
  if (state.user && state.token) {
    try {
      const res = await apiRequest('/api/cart');
      state.cart = {
        items: res.items || [],
        subtotal: res.subtotal || 0,
        itemCount: res.itemCount || 0
      };
    } catch (err) {
      console.warn('Could not fetch server cart:', err.message);
    }
  } else {
    // Guest cart stored in localStorage
    const saved = localStorage.getItem('alpha_guest_cart');
    state.cart = saved ? JSON.parse(saved) : { items: [], subtotal: 0, itemCount: 0 };
  }

  updateCartBadge();
  renderCartDrawer();
}

function saveGuestCart() {
  localStorage.setItem('alpha_guest_cart', JSON.stringify(state.cart));
  updateCartBadge();
  renderCartDrawer();
}

function updateCartBadge() {
  const badge = document.getElementById('cartCountBadge');
  const drawerBadge = document.getElementById('drawerItemCountBadge');
  const count = state.cart.itemCount || 0;

  badge.textContent = count;
  drawerBadge.textContent = `${count} item${count === 1 ? '' : 's'}`;

  // Add subtle pop animation
  badge.style.transform = 'scale(1.25)';
  setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
}

async function handleAddToCart(productId, quantity = 1) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (state.user && state.token) {
    try {
      const res = await apiRequest('/api/cart/add', 'POST', { productId, quantity });
      await loadCart();
      showToast(res.message || `Added ${product.name} to cart!`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  } else {
    // Guest Cart
    const existing = state.cart.items.find(i => i.product_id === productId);
    if (existing) {
      const nextQty = existing.quantity + quantity;
      if (nextQty > product.stock) {
        showToast(`Cannot add more. Only ${product.stock} left in stock.`, 'warning');
        return;
      }
      existing.quantity = nextQty;
      existing.line_total = existing.quantity * product.price;
    } else {
      state.cart.items.push({
        cart_item_id: 'guest_' + Date.now(),
        product_id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        image_url: product.image_url,
        stock: product.stock,
        quantity: quantity,
        line_total: product.price * quantity
      });
    }

    state.cart.subtotal = Number(state.cart.items.reduce((acc, i) => acc + i.line_total, 0).toFixed(2));
    state.cart.itemCount = state.cart.items.reduce((acc, i) => acc + i.quantity, 0);

    saveGuestCart();
    showToast(`Added "${product.name}" to cart!`, 'success');
  }
}

async function handleUpdateCartQty(cartItemId, delta) {
  if (state.user && state.token) {
    const item = state.cart.items.find(i => i.cart_item_id === cartItemId);
    if (!item) return;
    const newQty = item.quantity + delta;
    try {
      await apiRequest(`/api/cart/items/${cartItemId}`, 'PUT', { quantity: newQty });
      await loadCart();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  } else {
    const item = state.cart.items.find(i => i.cart_item_id === cartItemId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      state.cart.items = state.cart.items.filter(i => i.cart_item_id !== cartItemId);
    } else {
      item.line_total = item.quantity * item.price;
    }

    state.cart.subtotal = Number(state.cart.items.reduce((acc, i) => acc + i.line_total, 0).toFixed(2));
    state.cart.itemCount = state.cart.items.reduce((acc, i) => acc + i.quantity, 0);

    saveGuestCart();
  }
}

async function handleRemoveCartItem(cartItemId) {
  if (state.user && state.token) {
    try {
      await apiRequest(`/api/cart/items/${cartItemId}`, 'DELETE');
      await loadCart();
      showToast('Item removed from cart.', 'info');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  } else {
    state.cart.items = state.cart.items.filter(i => i.cart_item_id !== cartItemId);
    state.cart.subtotal = Number(state.cart.items.reduce((acc, i) => acc + i.line_total, 0).toFixed(2));
    state.cart.itemCount = state.cart.items.reduce((acc, i) => acc + i.quantity, 0);
    saveGuestCart();
    showToast('Item removed from cart.', 'info');
  }
}

async function handleClearCart() {
  if (state.cart.items.length === 0) return;

  if (state.user && state.token) {
    try {
      await apiRequest('/api/cart/clear', 'DELETE');
      await loadCart();
      showToast('Cart cleared.', 'info');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  } else {
    state.cart = { items: [], subtotal: 0, itemCount: 0 };
    saveGuestCart();
    showToast('Cart cleared.', 'info');
  }
}

function toggleCartDrawer(open = true) {
  const drawer = document.getElementById('cartDrawer');
  if (open) {
    drawer.classList.add('show');
    renderCartDrawer();
  } else {
    drawer.classList.remove('show');
  }
}

function renderCartDrawer() {
  const container = document.getElementById('cartItemsContainer');
  const footer = document.getElementById('cartFooter');

  if (state.cart.items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 3rem 1rem; border: none;">
        <i class="fa-solid fa-cart-shopping empty-icon"></i>
        <h3>Your cart is empty</h3>
        <p>Explore our catalog to find exciting tech accessories!</p>
        <button class="btn btn-primary" onclick="toggleCartDrawer(false)" style="margin-top: 1rem;">
          <i class="fa-solid fa-arrow-left"></i> Start Shopping
        </button>
      </div>
    `;
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'flex';

  container.innerHTML = state.cart.items.map(item => `
    <div class="cart-item">
      <img src="${item.image_url}" alt="${escapeHtml(item.name)}" class="cart-item-img">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
        <div class="cart-item-controls">
          <div class="cart-qty-ctrl">
            <button class="cart-qty-btn" onclick="handleUpdateCartQty('${item.cart_item_id}', -1)">-</button>
            <span class="cart-qty-val">${item.quantity}</span>
            <button class="cart-qty-btn" onclick="handleUpdateCartQty('${item.cart_item_id}', 1)">+</button>
          </div>
          <span style="font-size: 0.75rem; color: #94a3b8; margin-left: 0.4rem;">
            = $${(item.price * item.quantity).toFixed(2)}
          </span>
        </div>
      </div>
      <button class="cart-item-remove" onclick="handleRemoveCartItem('${item.cart_item_id}')" title="Remove item">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');

  updateCartCalculations();
}

function handleApplyCoupon() {
  const input = document.getElementById('couponInput');
  const feedback = document.getElementById('couponFeedback');
  const code = (input.value || '').trim().toUpperCase();

  if (!code) {
    feedback.textContent = 'Please enter a coupon code.';
    feedback.className = 'coupon-feedback text-warning';
    return;
  }

  if (code === 'CODEALPHA20') {
    state.appliedCoupon = { code: 'CODEALPHA20', percent: 0.20 };
    feedback.textContent = '🎉 20% discount applied successfully!';
    feedback.className = 'coupon-feedback text-success';
  } else if (code === 'FIRST10') {
    state.appliedCoupon = { code: 'FIRST10', percent: 0.10 };
    feedback.textContent = '🎉 10% welcome discount applied!';
    feedback.className = 'coupon-feedback text-success';
  } else {
    state.appliedCoupon = null;
    feedback.textContent = '❌ Invalid coupon code. Try CODEALPHA20';
    feedback.className = 'coupon-feedback text-danger';
  }

  updateCartCalculations();
}

function updateCartCalculations() {
  const subtotal = state.cart.subtotal || 0;
  let discount = 0;

  if (state.appliedCoupon) {
    discount = subtotal * state.appliedCoupon.percent;
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const shipping = taxableAmount > 150 ? 0.0 : 15.0;
  const tax = taxableAmount * 0.05;
  const total = taxableAmount + shipping + tax;

  document.getElementById('cartSubtotalText').textContent = `$${subtotal.toFixed(2)}`;

  const discountLine = document.getElementById('discountLine');
  if (discount > 0) {
    discountLine.style.display = 'flex';
    document.getElementById('cartDiscountText').textContent = `-$${discount.toFixed(2)}`;
  } else {
    discountLine.style.display = 'none';
  }

  document.getElementById('cartShippingText').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  document.getElementById('cartTaxText').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('cartTotalText').textContent = `$${total.toFixed(2)}`;
}

// ==========================================================================
// Order Processing & Checkout Flow
// ==========================================================================
function openCheckoutModal(isDirect = false) {
  if (!isDirect) {
    state.directCheckoutItem = null;
  }
  if (!state.user) {
    showToast('Please sign in or select a demo account to checkout.', 'warning');
    openAuthModal('login');
    return;
  }

  const items = isDirect && state.directCheckoutItem ? [state.directCheckoutItem] : state.cart.items;

  if (items.length === 0) {
    showToast('Your cart is empty. Add products to proceed.', 'warning');
    return;
  }

  // Pre-fill user data
  document.getElementById('shippingFullName').value = state.user.name || '';
  document.getElementById('shippingPhone').value = state.user.phone || '+91 9876543210';
  document.getElementById('shippingAddress').value = state.user.address || 'Sector 62, Cyber City';
  document.getElementById('shippingCity').value = 'Noida';
  document.getElementById('shippingZip').value = '201301';
  document.getElementById('shippingCountry').value = 'India';

  // Render review items
  const itemsContainer = document.getElementById('checkoutItemsList');
  itemsContainer.innerHTML = items.map(it => `
    <div class="co-item">
      <img src="${it.image_url}" alt="${escapeHtml(it.name)}">
      <div class="co-item-name">${escapeHtml(it.name)}</div>
      <div class="co-item-qty">x${it.quantity}</div>
      <div style="font-weight: 700;">$${(it.price * it.quantity).toFixed(2)}</div>
    </div>
  `).join('');

  // Calculate review bill
  const subtotal = items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  let discount = 0;
  if (state.appliedCoupon) {
    discount = subtotal * state.appliedCoupon.percent;
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const shipping = taxableAmount > 150 ? 0.0 : 15.0;
  const tax = taxableAmount * 0.05;
  const total = taxableAmount + shipping + tax;

  document.getElementById('coSubtotal').textContent = `$${subtotal.toFixed(2)}`;
  const coDiscountLine = document.getElementById('coDiscountLine');
  if (discount > 0) {
    coDiscountLine.style.display = 'flex';
    document.getElementById('coDiscount').textContent = `-$${discount.toFixed(2)}`;
  } else {
    coDiscountLine.style.display = 'none';
  }

  document.getElementById('coShipping').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  document.getElementById('coTax').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('coTotal').textContent = `$${total.toFixed(2)}`;

  document.getElementById('checkoutModal').classList.add('show');
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.remove('show');
  state.directCheckoutItem = null;
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const shippingAddress = document.getElementById('shippingAddress').value.trim();
  const shippingCity = document.getElementById('shippingCity').value.trim();
  const shippingZip = document.getElementById('shippingZip').value.trim();
  const shippingCountry = document.getElementById('shippingCountry').value.trim();
  const notes = document.getElementById('orderNotes').value.trim();

  const paymentMethodInput = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'Credit Card';

  const submitBtn = document.getElementById('placeOrderSubmitBtn');
  const spinner = document.getElementById('placeOrderSpinner');
  const btnText = document.getElementById('placeOrderBtnText');

  submitBtn.disabled = true;
  spinner.style.display = 'inline-block';
  btnText.style.display = 'none';

  try {
    const payload = {
      shippingAddress,
      shippingCity,
      shippingZip,
      shippingCountry,
      paymentMethod,
      notes,
      promoCode: state.appliedCoupon ? state.appliedCoupon.code : undefined
    };

    if (state.directCheckoutItem) {
      payload.directItems = [{
        productId: state.directCheckoutItem.productId,
        quantity: state.directCheckoutItem.quantity
      }];
    }

    const res = await apiRequest('/api/orders/checkout', 'POST', payload);
    const order = res.order;

    closeCheckoutModal();
    await loadCart();
    await loadProducts(); // Refresh stock
    await updateOrdersCountBadge();

    // Show order success confirmation modal
    openOrderSuccessModal(order);
  } catch (err) {
    showToast('Failed to place order: ' + err.message, 'danger');
  } finally {
    submitBtn.disabled = false;
    spinner.style.display = 'none';
    btnText.style.display = 'inline-flex';
  }
}

function openOrderSuccessModal(order) {
  const modal = document.getElementById('orderSuccessModal');
  const body = document.getElementById('orderSuccessBody');

  const itemsHtml = (order.items || []).map(it => `
    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
      <span>${escapeHtml(it.product_name)} (x${it.quantity})</span>
      <span style="font-weight: 700;">$${it.total.toFixed(2)}</span>
    </div>
  `).join('');

  body.innerHTML = `
    <div class="success-check-icon">
      <i class="fa-solid fa-check"></i>
    </div>
    <h2>Order Successfully Placed!</h2>
    <p style="color: #94a3b8; margin-top: 0.35rem;">A confirmation has been sent to your registered email.</p>
    
    <div class="order-id-badge">
      <i class="fa-solid fa-receipt"></i> ${order.order_number}
    </div>

    <div class="order-receipt-summary">
      <h4 style="margin-bottom: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem;">
        Purchase Receipt
      </h4>
      ${itemsHtml}
      <div class="summary-divider"></div>
      <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1rem; color: #fff;">
        <span>Total Paid</span>
        <span>$${order.total_amount.toFixed(2)}</span>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.4rem;">
        Payment: ${escapeHtml(order.payment_method)} (${escapeHtml(order.payment_status)}) • Status: <strong style="color: #60a5fa;">${escapeHtml(order.status)}</strong>
      </div>
    </div>

    <div style="display: flex; gap: 0.75rem; width: 100%;">
      <button class="btn btn-primary btn-block" onclick="closeOrderSuccessModal(); openOrdersModal();">
        <i class="fa-solid fa-boxes-packing"></i> Track in My Orders
      </button>
      <button class="btn btn-secondary btn-block" onclick="closeOrderSuccessModal();">
        Continue Shopping
      </button>
    </div>
  `;

  modal.classList.add('show');
}

function closeOrderSuccessModal() {
  document.getElementById('orderSuccessModal').classList.remove('show');
}

// ==========================================================================
// Orders History & Tracking
// ==========================================================================
async function openOrdersModal() {
  if (!state.user) {
    showToast('Please sign in to view your orders.', 'warning');
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('ordersModal');
  const container = document.getElementById('ordersListContainer');

  container.innerHTML = `
    <div style="text-align: center; padding: 3rem;">
      <span class="spinner" style="width: 32px; height: 32px; border-width: 3px;"></span>
      <p style="margin-top: 1rem;">Loading your order history...</p>
    </div>
  `;
  modal.classList.add('show');

  try {
    const res = await apiRequest('/api/orders/my-orders');
    const orders = res.orders || [];

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 3rem 1.5rem;">
          <i class="fa-solid fa-box-open empty-icon"></i>
          <h3>No Orders Found</h3>
          <p>You haven't placed any orders yet. Discover items from our catalog to get started!</p>
          <button class="btn btn-primary" onclick="closeOrdersModal()" style="margin-top: 1rem;">
            Browse Products
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(ord => {
      let statusClass = 'status-processing';
      if (ord.status === 'Shipped') statusClass = 'status-shipped';
      else if (ord.status === 'Delivered') statusClass = 'status-delivered';
      else if (ord.status === 'Cancelled') statusClass = 'status-cancelled';

      const itemsHtml = (ord.items || []).map(item => `
        <div class="order-item-row">
          <img src="${item.product_image}" alt="${escapeHtml(item.product_name)}" class="order-item-img">
          <div class="order-item-info">
            <div class="order-item-name">${escapeHtml(item.product_name)}</div>
            <div class="order-item-detail">
              Qty: ${item.quantity} × $${item.price.toFixed(2)} | Subtotal: <strong>$${item.total.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      `).join('');

      return `
        <div class="order-card">
          <div class="order-card-header">
            <div class="order-meta-group">
              <div class="ometa">
                <span class="ometa-label">Order Number</span>
                <span class="ometa-val">${escapeHtml(ord.order_number)}</span>
              </div>
              <div class="ometa">
                <span class="ometa-label">Date Placed</span>
                <span class="ometa-val">${new Date(ord.created_at).toLocaleDateString()}</span>
              </div>
              <div class="ometa">
                <span class="ometa-label">Total Amount</span>
                <span class="ometa-val" style="color: #6ee7b7;">$${ord.total_amount.toFixed(2)}</span>
              </div>
              <div class="ometa">
                <span class="ometa-label">Payment</span>
                <span class="ometa-val">${escapeHtml(ord.payment_method)} (${escapeHtml(ord.payment_status)})</span>
              </div>
            </div>
            <span class="order-status-badge ${statusClass}">
              <i class="fa-solid fa-circle-dot"></i> ${escapeHtml(ord.status)}
            </span>
          </div>

          <div class="order-card-body">
            ${itemsHtml}
          </div>

          <div class="order-card-footer">
            <span style="font-size: 0.8rem; color: var(--text-dim);">
              <i class="fa-solid fa-location-dot"></i> Destination: ${escapeHtml(ord.shipping_address)}, ${escapeHtml(ord.shipping_city)} (${escapeHtml(ord.shipping_zip)})
            </span>
            ${ord.status === 'Processing' ? `
              <button class="btn btn-outline btn-sm text-danger" onclick="handleCancelOrder(${ord.id})">
                <i class="fa-solid fa-ban"></i> Cancel Order
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p class="text-danger">Failed to fetch order history: ${err.message}</p>
      </div>
    `;
  }
}

function closeOrdersModal() {
  document.getElementById('ordersModal').classList.remove('show');
}

async function handleCancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order? Items will be returned to stock.')) {
    return;
  }

  try {
    const res = await apiRequest(`/api/orders/${orderId}/cancel`, 'POST');
    showToast(res.message || 'Order cancelled.', 'info');
    await openOrdersModal();
    await loadProducts();
    await updateOrdersCountBadge();
  } catch (err) {
    showToast('Failed to cancel order: ' + err.message, 'danger');
  }
}

async function updateOrdersCountBadge() {
  const badge = document.getElementById('ordersCountBadge');
  if (!state.user || !state.token) {
    badge.style.display = 'none';
    return;
  }

  try {
    const res = await apiRequest('/api/orders/my-orders');
    const count = (res.orders || []).length;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (err) {
    badge.style.display = 'none';
  }
}

// ==========================================================================
// Profile Modal
// ==========================================================================
async function openProfileModal() {
  if (!state.user) return;
  const modal = document.getElementById('profileModal');

  try {
    const res = await apiRequest('/api/auth/me');
    const u = res.user;

    document.getElementById('profileName').textContent = u.name;
    document.getElementById('profileEmail').textContent = u.email;
    document.getElementById('profileRoleBadge').textContent = u.role.toUpperCase();
    document.getElementById('profileInputName').value = u.name || '';
    document.getElementById('profileInputPhone').value = u.phone || '';
    document.getElementById('profileInputAddress').value = u.address || '';
    document.getElementById('profileTotalOrders').textContent = u.total_orders || 0;
    document.getElementById('profileTotalSpent').textContent = `$${(u.total_spent || 0).toFixed(2)}`;

    modal.classList.add('show');
  } catch (err) {
    showToast('Failed to load profile: ' + err.message, 'danger');
  }
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.remove('show');
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('profileInputName').value.trim();
  const phone = document.getElementById('profileInputPhone').value.trim();
  const address = document.getElementById('profileInputAddress').value.trim();

  try {
    const res = await apiRequest('/api/auth/profile', 'PUT', { name, phone, address });
    state.user = res.user;
    localStorage.setItem('alpha_user', JSON.stringify(res.user));
    updateAuthUI();
    closeProfileModal();
    showToast('Profile updated successfully!', 'success');
  } catch (err) {
    showToast('Failed to update profile: ' + err.message, 'danger');
  }
}

// ==========================================================================
// Auth Modal Utilities
// ==========================================================================
function openAuthModal(tab = 'login') {
  const modal = document.getElementById('authModal');
  switchAuthTab(tab);
  modal.classList.add('show');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('show');
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tabLoginBtn');
  const tabReg = document.getElementById('tabRegisterBtn');
  const formLogin = document.getElementById('loginForm');
  const formReg = document.getElementById('registerForm');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    formLogin.style.display = 'flex';
    formReg.style.display = 'none';
  } else {
    tabReg.classList.add('active');
    tabLogin.classList.remove('active');
    formReg.style.display = 'flex';
    formLogin.style.display = 'none';
  }
}

function quickFillAuth(identifier, password) {
  switchAuthTab('login');
  document.getElementById('loginIdentifier').value = identifier;
  document.getElementById('loginPassword').value = password;
  document.getElementById('loginSubmitBtn').click();
}

function toggleUserDropdown() {
  document.getElementById('userDropdown').classList.toggle('show');
}

function closeUserDropdown() {
  document.getElementById('userDropdown').classList.remove('show');
}

// ==========================================================================
// Helpers & Utilities
// ==========================================================================
function copyPromoCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast(`Promo code "${code}" copied to clipboard!`, 'success');
    const input = document.getElementById('couponInput');
    if (input) input.value = code;
  }).catch(() => {
    showToast(`Use code: ${code}`, 'info');
  });
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  let stars = '';

  for (let i = 0; i < full; i++) {
    stars += '<i class="fa-solid fa-star"></i> ';
  }
  if (hasHalf) {
    stars += '<i class="fa-solid fa-star-half-stroke"></i> ';
  }
  const empty = 5 - full - (hasHalf ? 1 : 0);
  for (let i = 0; i < empty; i++) {
    stars += '<i class="fa-regular fa-star"></i> ';
  }
  return stars;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'danger') icon = 'fa-circle-exclamation';
  if (type === 'warning') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon} toast-icon"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
