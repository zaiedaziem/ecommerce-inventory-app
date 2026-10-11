# StackCart — E-Commerce & Inventory Management App

A full-stack e-commerce and inventory management application with role-based authentication, product and order management, transaction-safe stock control, and Stripe (test-mode) checkout.

## Features

- **Auth** — JWT-based registration/login with `admin` and `customer` roles (public sign-up always creates customers; admins are created via a CLI script)
- **Profile** — users can change their password (requires the current one; signs out all other sessions by rejecting older tokens); customers save a phone number and Malaysian delivery address, which is required at checkout and copied onto each order
- **Products & Categories** — public browsing, admin-only create/update/delete, search/filter/pagination
- **Product photos** — admins upload a photo that is resized (max 800px) and compressed to WebP in the browser, then stored as a base64 data URI on the product; the server validates type (JPEG/PNG/WebP only) and size (≤ 500 KB)
- **Orders** — atomic, transaction-safe stock deduction that prevents overselling under concurrent requests; customer order history; admin order management
- **Order lifecycle** — enforced, role-based status transitions: orders become `paid` only via the Stripe webhook, admins mark paid orders `shipped`, and customers confirm `delivered` ("Order received") or cancel before shipping. Cancelling returns stock to inventory and automatically refunds paid orders through Stripe. Abandoned checkouts are cancelled automatically so they don't hold stock
- **Payments** — Stripe Checkout Session integration (MYR currency) with idempotent, webhook-driven order status updates (`checkout.session.completed` / `checkout.session.expired`)
- **Admin dashboard** — manage products, categories, and orders from the UI
- **Centralized error handling & input validation** on every route

## Tech Stack

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs, Stripe, express-validator
**Frontend:** React (Vite), React Router, Tailwind CSS, Axios

## Project Structure

```
backend/
├── config/        # MongoDB connection, Stripe client
├── models/        # User, Product, Category, Order (Mongoose schemas)
├── controllers/   # Request handlers per resource
├── services/      # Business logic (inventory deduction, order creation, payments)
├── middlewares/   # JWT auth, role-based access control, centralized error handler
├── routes/        # Express route definitions
├── utils/         # JWT helpers, validators, AppError, asyncHandler
└── server.js

frontend/
├── src/
│   ├── api/           # Axios service layer (auth, products, categories, orders, payments)
│   ├── context/        # Auth and Cart React contexts (cart persisted to localStorage)
│   ├── components/     # Navbar, ProtectedRoute, AdminRoute
│   ├── pages/           # Product listing/detail, cart, checkout, login/register, order history
│   └── pages/admin/     # Admin dashboard: products, categories, orders
```

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB database (e.g. a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster)
- A [Stripe](https://dashboard.stripe.com/register) account in test mode
- [Stripe CLI](https://github.com/stripe/stripe-cli/releases) (for local webhook testing)

### 1. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```
PORT=5000
NODE_ENV=development
MONGO_URI=<your MongoDB connection string>
JWT_SECRET=<a long random string>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=<your Stripe test secret key>
STRIPE_WEBHOOK_SECRET=<from `stripe listen`, see below>
# Optional: minutes before an unpaid order is auto-cancelled and its stock released (default 60)
PENDING_ORDER_TTL_MINUTES=60
```

Load demo data: 3 accounts, 4 categories, 12 products with photos, and a sample order history. Safe to re-run. The demo logins are listed in `DEMO_USERS` in `backend/scripts/seed.js`.

```bash
npm run seed
```

Create an admin account (or promote an existing user):

```bash
npm run create-admin -- admin@example.com <password> "Admin User"
```

### 2. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Run all three processes (separate terminals)

**Terminal 1 — Backend**
```bash
cd backend
npm run dev
```

**Terminal 2 — Stripe webhook listener**
```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```
Copy the printed `whsec_...` value into `backend/.env` as `STRIPE_WEBHOOK_SECRET`, then restart Terminal 1.

**Terminal 3 — Frontend**
```bash
cd frontend
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

## Testing Payments

Use Stripe's test card: `4242 4242 4242 4242`, any future expiry date, any CVC, any ZIP.

## API Overview

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |
| PUT | `/api/auth/me` | Authenticated (name, phone, address) |
| PUT | `/api/auth/password` | Authenticated (returns a fresh token) |
| GET | `/api/products`, `/api/products/:id` | Public |
| POST/PUT/DELETE | `/api/products` | Admin |
| GET | `/api/categories`, `/api/categories/:id` | Public |
| POST/PUT/DELETE | `/api/categories` | Admin |
| POST | `/api/orders` | Customer |
| GET | `/api/orders/my-orders` | Customer |
| GET | `/api/orders`, `/api/orders/:id` | Admin (or order owner for `:id`) |
| PUT | `/api/orders/:id/ship` | Admin (paid → shipped) |
| PUT | `/api/orders/:id/cancel` | Order owner (pending/paid → cancelled; paid orders are refunded) |
| PUT | `/api/orders/:id/receive` | Order owner (shipped → delivered) |
| POST | `/api/payments/checkout-session` | Customer |
| POST | `/api/payments/webhook` | Stripe (signature-verified) |

See [USE_CASES.md](USE_CASES.md) for the full use-case breakdown by actor.
