const mongoose = require('mongoose');
const Order = require('../models/Order');
const { deductStock, restoreStock } = require('./inventoryService');
const { releaseCheckoutSession, refundOrderPayment } = require('./paymentService');
const AppError = require('../utils/AppError');

// Allowed order status transitions. Terminal states have no outgoing transitions.
// Who may trigger each one:
//   pending -> paid       Stripe webhook only (never set by hand)
//   paid -> shipped       admin
//   pending/paid -> cancelled   customer (paid orders are refunded), or the stale-order sweep
//   shipped -> delivered  customer confirms receipt
const ORDER_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
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

// Cancels an order and returns its stock.
// - Pending: any open Stripe Checkout Session is expired first so it can't be paid afterwards.
// - Paid: the status change commits first, then the payment is refunded. Cancelling before
//   refunding means a concurrent "mark as shipped" can't slip in after money was returned;
//   if the refund call fails, the order is flagged refundStatus 'failed' for follow-up.
async function cancelOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  if (order.status !== 'cancelled' && !canTransition(order.status, 'cancelled')) {
    const reason = order.status === 'shipped' || order.status === 'delivered'
      ? 'it has already been shipped'
      : `it is ${order.status}`;
    throw new AppError(`This order can no longer be cancelled because ${reason}`, 400);
  }

  if (order.status === 'pending' && order.stripeSessionId) {
    await releaseCheckoutSession(order.stripeSessionId);
  }

  let needsRefund = false;
  const cancelled = await runInTransaction(async (session) => {
    const current = await Order.findById(orderId).session(session);
    needsRefund = current.status === 'paid' && Boolean(current.stripePaymentIntentId);
    return applyTransition(current, 'cancelled', session, needsRefund ? { refundStatus: 'pending' } : {});
  });

  if (needsRefund) {
    await refundOrderPayment(cancelled);
  }
  return cancelled;
}

// Customer cancels their own order (allowed until it ships).
async function cancelOwnOrder(orderId, userId) {
  await findOwnOrder(orderId, userId);
  return cancelOrder(orderId);
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
// and cancelling or confirming delivery is up to the customer.
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
      await cancelOrder(_id);
      cancelled += 1;
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
  cancelOrder,
  cancelOwnOrder,
  confirmOrderReceived,
  shipOrder,
  markOrderPaid,
  cancelOrderForExpiredSession,
  cancelStalePendingOrders,
};
