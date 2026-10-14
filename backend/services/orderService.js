const mongoose = require('mongoose');
const Order = require('../models/Order');
const { deductStock, restoreStock } = require('./inventoryService');
const { releaseCheckoutSession, retrieveCheckoutSession } = require('./paymentService');
const AppError = require('../utils/AppError');

// Allowed order status transitions. Terminal states have no outgoing transitions.
// Who may trigger each one:
//   pending -> paid        Stripe only: the webhook, or a direct check of the Checkout Session
//   pending -> cancelled   the system, when an unpaid checkout expires or goes stale
//   paid -> shipped        admin
//   shipped -> delivered   customer confirms receipt
// Paid orders can't be cancelled, so a payment never needs refunding.
const ORDER_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const STATUS_TIMESTAMPS = {
  paid: 'paidAt',
  shipped: 'shippedAt',
  delivered: 'deliveredAt',
  cancelled: 'cancelledAt',
};

function canTransition(from, to) {
  return (ORDER_TRANSITIONS[from] || []).includes(to);
}

// Runs fn(session) inside a MongoDB transaction and returns its result.
// withTransaction retries fn on transient errors (e.g. write conflicts from concurrent updates).
async function runInTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    session.endSession();
  }
}

// Applies a status change to an order loaded inside `session`, restocking on cancellation.
// Re-applying the current status is a no-op, so duplicate requests/events are harmless.
async function applyTransition(order, newStatus, session, extraFields = {}) {
  if (order.status === newStatus) {
    return order;
  }
  if (!canTransition(order.status, newStatus)) {
    throw new AppError(`Cannot change order status from ${order.status} to ${newStatus}`, 400);
  }

  if (newStatus === 'cancelled') {
    for (const item of order.items) {
      await restoreStock(item.product, item.quantity, session);
    }
  }

  order[STATUS_TIMESTAMPS[newStatus]] = new Date();
  order.status = newStatus;
  Object.assign(order, extraFields);
  await order.save({ session });
  return order;
}

// Builds the shipping snapshot stored on a new order from the customer's profile.
function buildShippingDetails(user) {
  if (!user.phone || !user.address) {
    throw new AppError(
      'Please add your phone number and shipping address in your profile before checking out',
      400
    );
  }
  return { name: user.name, phone: user.phone, address: user.address.toObject?.() ?? user.address };
}

// Creates an order: deducts stock for every item atomically, then persists the order.
// Uses a transaction so a mid-order stock failure rolls back all prior deductions.
async function createOrder(userId, items, shipping) {
  if (!items || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400);
  }

  return runInTransaction(async (session) => {
    let totalAmount = 0;
    const orderItems = [];

    for (const { productId, quantity } of items) {
      const product = await deductStock(productId, quantity, session);
      totalAmount += product.price * quantity;
      orderItems.push({
        product: product._id,
        quantity,
        priceAtPurchase: product.price,
      });
    }

    const created = await Order.create(
      [{ user: userId, items: orderItems, totalAmount, shipping }],
      { session }
    );
    return created[0];
  });
}

// Loads an order and checks that `userId` placed it.
async function findOwnOrder(orderId, userId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  if (order.user.toString() !== userId.toString()) {
    throw new AppError('You do not have permission to change this order', 403);
  }
  return order;
}

// Cancels an unpaid order and returns its stock. Any open Stripe Checkout Session is expired
// first so it can't be paid afterwards. If it turns out the customer already paid (e.g. the
// webhook hasn't arrived yet), the order is marked paid instead. Returns the updated order.
async function cancelPendingOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  if (order.status !== 'pending') {
    return order;
  }

  if (order.stripeSessionId) {
    const checkout = await releaseCheckoutSession(order.stripeSessionId);
    if (checkout.status === 'complete') {
      return checkout.payment_status === 'paid'
        ? markOrderPaid(order._id, checkout.id, checkout.payment_intent)
        : order;
    }
  }

  return runInTransaction(async (session) => {
    const current = await Order.findById(orderId).session(session);
    return applyTransition(current, 'cancelled', session);
  });
}

// Asks Stripe directly whether a pending order's checkout was paid, and marks it paid if so.
// Backs up the webhook (which can be delayed, or missed if the listener isn't running).
// Returns true if the order was updated.
async function syncOrderPayment(order) {
  if (order.status !== 'pending' || !order.stripeSessionId) {
    return false;
  }
  const checkout = await retrieveCheckoutSession(order.stripeSessionId);
  if (checkout.status !== 'complete' || checkout.payment_status !== 'paid') {
    return false;
  }
  const updated = await markOrderPaid(order._id, checkout.id, checkout.payment_intent);
  return updated?.status === 'paid';
}

// Syncs every pending order in a list (e.g. before returning order history). A Stripe error
// on one order is logged and doesn't fail the request. Returns how many orders changed.
async function syncPendingPayments(orders) {
  const results = await Promise.allSettled(orders.map(syncOrderPayment));
  results
    .filter((r) => r.status === 'rejected')
    .forEach((r) => console.error(`Payment sync failed: ${r.reason.message}`));
  return results.filter((r) => r.status === 'fulfilled' && r.value).length;
}

// Customer returning from Stripe asks for their order's payment to be confirmed.
async function verifyOrderPayment(orderId, userId) {
  const order = await findOwnOrder(orderId, userId);
  await syncOrderPayment(order);
  return Order.findById(orderId);
}

// Customer confirms a shipped order arrived.
async function confirmOrderReceived(orderId, userId) {
  await findOwnOrder(orderId, userId);
  return runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (order.status !== 'shipped' && order.status !== 'delivered') {
      throw new AppError('Only shipped orders can be marked as received', 400);
    }
    return applyTransition(order, 'delivered', session);
  });
}

// Admin status update. Admins only ship paid orders: payment is confirmed by Stripe,
// and confirming delivery is up to the customer.
async function shipOrder(orderId) {
  return runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    if (order.status !== 'paid' && order.status !== 'shipped') {
      throw new AppError(`Only paid orders can be shipped (this order is ${order.status})`, 400);
    }
    return applyTransition(order, 'shipped', session);
  });
}

// Handles Stripe's checkout.session.completed. Idempotent: Stripe may deliver the same
// event more than once, so an order that is no longer pending is left untouched.
async function markOrderPaid(orderId, stripeSessionId, stripePaymentIntentId) {
  return runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      console.warn(`Payment received for unknown order ${orderId} (session ${stripeSessionId})`);
      return null;
    }
    if (order.status !== 'pending') {
      if (order.status === 'cancelled') {
        // Shouldn't happen: sessions are expired before an order is cancelled.
        console.error(
          `Payment received for cancelled order ${orderId}: refund required (payment_intent ${stripePaymentIntentId})`
        );
      }
      return order;
    }
    return applyTransition(order, 'paid', session, { stripeSessionId, stripePaymentIntentId });
  });
}

// Handles Stripe's checkout.session.expired: cancels the order and releases its stock,
// unless the order has since moved on or the event is for a superseded session.
async function cancelOrderForExpiredSession(orderId, stripeSessionId) {
  return runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order || order.status !== 'pending' || order.stripeSessionId !== stripeSessionId) {
      return order;
    }
    return applyTransition(order, 'cancelled', session);
  });
}

// Cancels pending orders older than maxAgeMinutes so abandoned checkouts don't hold stock
// forever (covers orders whose checkout never started, which Stripe can't expire for us).
async function cancelStalePendingOrders(maxAgeMinutes) {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const stale = await Order.find({ status: 'pending', createdAt: { $lt: cutoff } }).select('_id');

  let cancelled = 0;
  for (const { _id } of stale) {
    try {
      const order = await cancelPendingOrder(_id);
      if (order.status === 'cancelled') cancelled += 1;
    } catch (err) {
      console.error(`Failed to cancel stale order ${_id}: ${err.message}`);
    }
  }
  return cancelled;
}

module.exports = {
  ORDER_TRANSITIONS,
  buildShippingDetails,
  createOrder,
  cancelPendingOrder,
  confirmOrderReceived,
  shipOrder,
  markOrderPaid,
  syncPendingPayments,
  verifyOrderPayment,
  cancelOrderForExpiredSession,
  cancelStalePendingOrders,
};
