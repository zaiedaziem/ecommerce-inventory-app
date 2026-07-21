# Use Cases

## Actors

- **Guest** — unauthenticated visitor
- **Customer** — registered user, role `customer`
- **Admin** — registered user, role `admin`

## Guest

1. Browse product listings (name, price, stock status)
2. View product detail page
3. Register a new account
4. Log in

## Customer

*(everything a Guest can do, plus)*

5. Add products to cart (client-side, pre-checkout)
6. Checkout via Stripe (test mode) — pay for cart contents
7. View own order history
8. View details of a single past order (items, total, status)
9. View own profile (`GET /api/auth/me`)

## Admin

*(everything a Customer can do, plus)*

10. Create a new product
11. Update an existing product (price, description, stock count, category)
12. Delete a product
13. View all orders across all customers
14. Update order status (e.g. pending → shipped → delivered)
15. Manage categories (create/update/delete)

## Cross-Cutting System Behaviors

Not triggered directly by an actor action, but core to how the system behaves:

- **Stock deduction on order creation** — when an order is placed, each line item's quantity is deducted from `Product.stock`; the order is rejected if any item's requested quantity exceeds available stock, preventing overselling under concurrent orders.
- **JWT-based session** — every protected request must carry a valid, unexpired Bearer token.
- **Role-based authorization** — product-mutation and order-management endpoints reject non-admin tokens with `403`.
- **Centralized error handling** — all thrown/rejected errors funnel through one handler returning a consistent JSON error shape.
- **Input validation** — malformed requests (missing fields, invalid email, negative price, etc.) are rejected with `400` before touching the database or business logic.
