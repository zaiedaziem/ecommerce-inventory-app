const mongoose = require('mongoose');
const Order = require('../models/Order');
const { deductStock, restoreStock } = require('./inventoryService');
const { releaseCheckoutSession } = require('./paymentService');
const AppError = require('../utils/AppError');

// Allowed order status transitions. Terminal states have no outgoing transitions.
const ORDER_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
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
    order.cancelledAt = new Date();
  }

  order.status = newStatus;
  Object.assign(order, extraFields);
  await order.save({ session });
  return order;
}

// Creates an order: deducts stock for every item atomically, then persists the order.
// Uses a transaction so a mid-order stock failure rolls back all prior deductions.
async function createOrder(userId, items) {
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
      [{ user: userId, items: orderItems, totalAmount }],
      { session }
    );
    return created[0];
  });
}

// Cancels an order and returns its stock. For a pending order with an open Stripe
// Checkout Session, the session is expired first so the customer can't pay afterwards.
async function cancelOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }
  if (order.status !== 'cancelled' && !canTransition(order.status, 'cancelled')) {
    throw new AppError(`Cannot cancel an order that is ${order.status}`, 400);
  }

  if (order.status === 'pending' && order.stripeSessionId) {
    await releaseCheckoutSession(order.stripeSessionId);
  }

  return runInTransaction(async (session) => {
    const current = await Order.findById(orderId).session(session);
    return applyTransition(current, 'cancelled', session);
  });
}

// Admin status update. Cancellation goes through cancelOrder for Stripe cleanup and restock.
async function updateOrderStatus(orderId, newStatus) {
  if (newStatus === 'cancelled') {
    return cancelOrder(orderId);
  }

  return runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    return applyTransition(order, newStatus, session);
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
    return applyTransition(order, 'paid', session, {
      stripeSessionId,
      stripePaymentIntentId,
      paidAt: new Date(),
    });
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
  createOrder,
  cancelOrder,
  updateOrderStatus,
  markOrderPaid,
  cancelOrderForExpiredSession,
  cancelStalePendingOrders,
};
