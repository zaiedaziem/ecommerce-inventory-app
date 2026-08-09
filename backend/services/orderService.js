const mongoose = require('mongoose');
const Order = require('../models/Order');
const { deductStock } = require('./inventoryService');
const AppError = require('../utils/AppError');

// Creates an order: deducts stock for every item atomically, then persists the order.
// Uses a transaction so a mid-order stock failure rolls back all prior deductions.
async function createOrder(userId, items) {
  if (!items || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400);
  }

  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
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
      order = created[0];
    });
  } finally {
    session.endSession();
  }

  return order;
}

module.exports = { createOrder };