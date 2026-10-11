require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const { cancelStalePendingOrders } = require('./services/orderService');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

connectDB();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));

// Stripe webhook signature verification needs the raw body, so this must be
// registered with express.raw() before the global express.json() parser below.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Release stock held by abandoned checkouts. Runs in-process, which is fine for a single
// instance; with multiple instances this would move to a scheduled job or a locked worker.
const STALE_ORDER_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const STALE_ORDER_MAX_AGE_MINUTES = Number(process.env.PENDING_ORDER_TTL_MINUTES) || 60;
setInterval(async () => {
  try {
    const count = await cancelStalePendingOrders(STALE_ORDER_MAX_AGE_MINUTES);
    if (count > 0) {
      console.log(`Cancelled ${count} stale pending order(s)`);
    }
  } catch (err) {
    console.error(`Stale order sweep failed: ${err.message}`);
  }
}, STALE_ORDER_SWEEP_INTERVAL_MS);
