const stripe = require('../config/stripe');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  createCheckoutSession,
  markOrderPaidFromSession,
} = require('../services/paymentService');

// POST /api/payments/checkout-session (customer) — starts Stripe checkout for a pending order.
const createCheckoutSessionHandler = asyncHandler(async (req, res, next) => {
  const { orderId } = req.body;
  if (!orderId) {
    return next(new AppError('orderId is required', 400));
  }

  const order = await Order.findById(orderId).populate('items.product', 'name');
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.user.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to pay for this order', 403));
  }

  if (order.status !== 'pending') {
    return next(new AppError(`Order cannot be paid for — current status: ${order.status}`, 400));
  }

  const session = await createCheckoutSession(order, req.user.email);

  res.status(200).json({ success: true, url: session.url });
});

// POST /api/payments/webhook (Stripe) — must receive the raw request body (see server.js).
const handleWebhook = asyncHandler(async (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return next(new AppError(`Webhook signature verification failed: ${err.message}`, 400));
  }

  if (event.type === 'checkout.session.completed') {
    await markOrderPaidFromSession(event.data.object);
  }

  res.status(200).json({ received: true });
});

module.exports = { createCheckoutSessionHandler, handleWebhook };
