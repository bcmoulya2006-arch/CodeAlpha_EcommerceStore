# AlphaStore — Modern Full Stack E-commerce Store
### CodeAlpha Full Stack Web Development Internship — Task 1

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-lightgrey.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Native%20DatabaseSync-blue.svg)](https://nodejs.org/api/sqlite.html)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%2F%20CSS3%20%2F%20ES6-orange.svg)]()

AlphaStore is an end-to-end, full-stack e-commerce web platform engineered for **Task 1 of the CodeAlpha Full Stack Development Internship**. It delivers product catalog management, interactive shopping cart synchronisation, multi-step order checkout, customer reviews, and order tracking powered by an Express.js REST API and zero-configuration SQLite persistence.

---

## 🌟 Key Features

### 1. Dynamic Product Catalog & Filtering
- **Rich Inventory**: Seeded with curated products across high-demand categories: *Electronics*, *Audio*, *Wearables*, *Accessories*, and *Home & Office*.
- **Real-Time Search**: Instant keyword search matching product titles, descriptions, and categories.
- **Category Filter Tabs**: Dynamic category pills with live inventory counters.
- **Sorting Options**: Sort by Newest, Price (Low to High), Price (High to Low), Highest Rated, and Alphabetical.
- **Stock Badging**: Real-time warehouse availability indicators (`In Stock`, `Only X Left`, `Out of Stock`).

### 2. In-Depth Product Details & Customer Reviews
- **High-Res Product Showcase**: Full product imagery, pricing, and category classifications.
- **Customer Ratings & Reviews**: Aggregate star ratings calculation (1–5 stars) and verified customer review comments.
- **Interactive Review Submission**: Logged-in customers can submit star ratings and detailed feedback directly from the modal.
- **Instant Buy Shortcut**: Bypass the cart drawer to initiate checkout immediately for any single product.

### 3. Interactive Shopping Cart Drawer
- **Slide-Over Panel**: Modern slide-over drawer accessible from any view with animated badge counter.
- **Live Quantity Controls**: Increment (`+`), decrement (`-`), or remove items with automatic line-total updates.
- **Promo Code Discounts**: Built-in coupon engine supporting codes such as `CODEALPHA20` (20% off) and `FIRST10` (10% off).
- **Automated Bill Calculation**: Real-time breakdown of subtotal, applied promo discounts, shipping fee (Free above $150), and estimated taxes (5%).
- **Cross-Session Persistence**: Automatically syncs guest cart items to the database upon user login.

### 4. Order Processing & Multi-Method Checkout
- **Delivery Destination**: Capture customer full name, contact phone, street address, city, postal code, and delivery notes.
- **Payment Method Selection**: Select between simulated Credit/Debit Card, PayPal, or Cash on Delivery (COD).
- **Unique Order Identifiers**: Automated generation of traceable order tracking codes (e.g. `ORD-20261031-9842`).
- **Inventory Stock Protection**: Automatic real-time stock decrement upon order placement, preventing overselling.
- **Interactive Order Confirmation**: Instant purchase receipt modal with itemized breakdown and order tracking shortcut.

### 5. Order History & Lifecycle Tracking
- **Customer Orders Dashboard**: View all past orders with status pills, order numbers, dates, payment methods, and total amounts.
- **Lifecycle Statuses**: Orders transition through `Processing` ➔ `Shipped` ➔ `Delivered` (or `Cancelled`).
- **Order Cancellation with Inventory Restoration**: Cancel any order in `Processing` status; items are returned to active warehouse stock automatically.

### 6. Authentication & User Profile Management
- **Security First**: Salted `bcryptjs` password hashing and signed JSON Web Tokens (`JWT`) for stateless session authorization.
- **Demo Quick-Switch**: 1-click header switcher to instantly toggle between test accounts without manual credential typing.
- **User Profile Modal**: View lifetime spend, total orders placed, and update default delivery address and contact information.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Semantic HTML5, Modern CSS3 (Glassmorphism Dark Theme, Plus Jakarta Sans, Responsive Grid), Vanilla ES6+ JavaScript |
| **Backend** | Node.js, Express.js RESTful API, CORS Middleware |
| **Database** | Native SQLite via Node.js built-in `node:sqlite` (`DatabaseSync`), Foreign Keys Enforced |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), Password Hashing (`bcryptjs`) |
| **Icons & Fonts** | FontAwesome 6, Google Fonts (Plus Jakarta Sans) |
| **Testing** | Custom 18-point automated end-to-end verification suite (`test-e2e.js`) |

---

## 📁 Project Directory Structure

```
CodeAlpha_EcommerceStore/
├── package.json               # Dependencies and scripts manifest
├── server.js                  # Express application entrypoint
├── test-e2e.js                # 18-point automated verification test suite
├── README.md                  # Comprehensive documentation
├── .gitignore                 # Standard node and environment ignores
├── src/
│   ├── config/
│   │   ├── db.js              # SQLite database schema and connection
│   │   └── seed.js            # Curated product catalog & demo account seeder
│   ├── controllers/
│   │   ├── authController.js    # Register, login, profile, and JWT generation
│   │   ├── productController.js # Product catalog, search, filter, reviews
│   │   ├── cartController.js    # Persistent shopping cart management
│   │   └── orderController.js   # Order processing, checkout, tracking & cancellation
│   ├── middleware/
│   │   └── auth.js            # JWT bearer token verification & admin guards
│   └── routes/
│       ├── authRoutes.js      # Authentication endpoints
│       ├── productRoutes.js   # Product and review endpoints
│       ├── cartRoutes.js      # Shopping cart endpoints
│       └── orderRoutes.js     # Checkout and order tracking endpoints
└── public/
    ├── index.html             # Single Page Application interface
    ├── css/
    │   └── style.css          # Responsive glassmorphism design system
    └── js/
        └── app.js             # Client-side state manager and API client
```

---

## 👥 Pre-Seeded Test Accounts

| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `manish_buyer` | `password123` | Customer | Pre-seeded with existing completed order and profile address |
| `demo_user` | `password123` | Customer | Standard customer account for fresh cart & checkout testing |
| `admin` | `admin123` | Admin | Store Administrator account |

*(Tip: You can use the **Demo User** dropdown in the top navigation bar to switch between these accounts in a single click!)*

---

## 🚀 Quick Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- Git

### 1. Clone or Open the Repository
```bash
git clone https://github.com/bcmoulya2006-arch/CodeAlpha_EcommerceStore.git
cd CodeAlpha_EcommerceStore
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```
*The server will start on `http://localhost:5002` (or your configured `PORT`).*

### 4. Open in Your Browser
Visit:
```
http://localhost:5002
```

---

## 🧪 Automated Testing

AlphaStore includes a complete automated test suite testing database seeding, authentication, product filtering, shopping cart updates, checkout order placement, inventory decrements, and stock restoration upon cancellation:

```bash
npm test
```
*(or `node test-e2e.js`)*

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` — Create a new customer account
- `POST /api/auth/login` — Sign in and obtain JWT bearer token
- `GET /api/auth/me` — Retrieve current user profile and metrics
- `PUT /api/auth/profile` — Update address, name, or phone

### Products & Reviews
- `GET /api/products` — List products (supports `?category=`, `?search=`, `?sort=`, `?minPrice=`, `?maxPrice=`)
- `GET /api/products/categories` — Get distinct product categories with item counts
- `GET /api/products/:id` — Retrieve product details, specifications, and reviews
- `POST /api/products/:id/reviews` — Post star rating and comment *(Auth required)*

### Shopping Cart
- `GET /api/cart` — Get active cart items and subtotal *(Auth required)*
- `POST /api/cart/add` — Add item to cart *(Auth required)*
- `PUT /api/cart/items/:id` — Update item quantity *(Auth required)*
- `DELETE /api/cart/items/:id` — Remove item from cart *(Auth required)*
- `DELETE /api/cart/clear` — Clear entire cart *(Auth required)*

### Order Processing & Tracking
- `POST /api/orders/checkout` — Place order, process delivery details, decrement stock *(Auth required)*
- `GET /api/orders/my-orders` — View user's order history *(Auth required)*
- `GET /api/orders/:id` — View detailed receipt of an order *(Auth required)*
- `POST /api/orders/:id/cancel` — Cancel processing order and restore warehouse stock *(Auth required)*

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE). Built specifically for the **CodeAlpha Full Stack Web Development Internship** (Task 1: Simple E-commerce Store).
