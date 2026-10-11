const stripe = require('../config/stripe');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');

// Stripe's minimum Checkout Session lifetime is 30 minutes.
const CHECKOUT_SESSION_TTL_MINUTES = 30;

// Returns a Stripe-hosted Checkout Session for a pending order. If the order already has
// an open session it is reused, so a customer never has two payable sessions at once.
async function createCheckoutSession(order, customerEmail) {
  if (order.stripeSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (existing.status === 'open') {
      return existing;
    }
    if (existing.status === 'complete') {
      throw new AppError('Payment for this order is already complete and awaiting confirmation', 409);
    }
  }

  const lineItems = order.items.map((item) => ({
    price_data: {
      currency: 'myr',
      product_data: { name: item.product.name },
      unit_amount: Math.round(item.priceAtPurchase * 100),
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: customerEmail,
    success_url: `${process.env.CLIENT_URL}/order-success?orderId=${order._id}`,
    cancel_url: `${process.env.CLIENT_URL}/order-cancelled?orderId=${order._id}`,
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_TTL_MINUTES * 60,
    metadata: { orderId: order._id.toString() },
  });

  // Compare-and-set on the previous session id: if a concurrent request already attached
  // a different session, discard ours rather than leave two payable sessions open.
  const { modifiedCount } = await Order.updateOne(
    { _id: order._id, status: 'pending', stripeSessionId: order.stripeSessionId ?? null },
    { stripeSessionId: session.id }
  );
  if (modifiedCount === 0) {
    await stripe.checkout.sessions.expire(session.id);
    throw new AppError('Checkout already in progress for this order, please retry', 409);
  }

  return session;
}

// Ensures a Checkout Session can no longer be paid. Throws if payment already went through,
// since the order must not be cancelled out from under a completed payment.
async function releaseCheckoutSession(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === 'complete') {
    throw new AppError('Payment for this order has already been completed', 409);
  }
  if (session.status === 'open') {
    await stripe.checkout.sessions.expire(sessionId);
  }
}

// Refunds the full payment for a cancelled order and records the outcome on the order.
// The idempotency key makes a retry for the same order return the original refund rather
// than refunding twice. Never throws: a failure is recorded as refundStatus 'failed'.
async function refundOrderPayment(order) {
  try {
    const refund = await stripe.refunds.create(
      { payment_intent: order.stripePaymentIntentId, metadata: { orderId: order._id.toString() } },
      { idempotencyKey: `refund-order-${order._id}` }
    );
    // Card refunds are accepted as 'succeeded' or 'pending' (settling); both mean refunded.
    const refundStatus = refund.status === 'failed' || refund.status === 'canceled' ? 'failed' : 'refunded';
    await Order.updateOne({ _id: order._id }, { refundStatus, stripeRefundId: refund.id });
    Object.assign(order, { refundStatus, stripeRefundId: refund.id });
  } catch (err) {
    console.error(`Refund failed for order ${order._id}: ${err.message}`);
    await Order.updateOne({ _id: order._id }, { refundStatus: 'failed' });
    order.refundStatus = 'failed';
  }
  return order;
}

module.exports = { createCheckoutSession, releaseCheckoutSession, refundOrderPayment };
