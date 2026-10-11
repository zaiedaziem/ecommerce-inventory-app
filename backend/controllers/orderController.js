const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  createOrder: createOrderService,
  shipOrder: shipOrderService,
  cancelOwnOrder,
  confirmOrderReceived,
} = require('../services/orderService');

// POST /api/orders (customer)
const createOrder = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const order = await createOrderService(req.user._id, req.body.items);

  res.status(201).json({ success: true, order });
});

// GET /api/orders/my-orders (customer) — own order history
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('items.product', 'name price')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: orders.length, orders });
});

// GET /api/orders (admin) — all orders
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'name email')
    .populate('items.product', 'name price')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: orders.length, orders });
});

// GET /api/orders/:id (admin, or the owning customer)
const getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'name price');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  const isOwner = order.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to view this order', 403));
  }

  res.status(200).json({ success: true, order });
});

// PUT /api/orders/:id/ship (admin) — paid -> shipped
const shipOrder = asyncHandler(async (req, res) => {
  const order = await shipOrderService(req.params.id);
  res.status(200).json({ success: true, order });
});

// PUT /api/orders/:id/cancel (order owner) — allowed until shipped; paid orders are refunded
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await cancelOwnOrder(req.params.id, req.user._id);
  res.status(200).json({ success: true, order });
});

// PUT /api/orders/:id/receive (order owner) — shipped -> delivered
const receiveOrder = asyncHandler(async (req, res) => {
  const order = await confirmOrderReceived(req.params.id, req.user._id);
  res.status(200).json({ success: true, order });
});

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrder,
  shipOrder,
  cancelOrder,
  receiveOrder,
};
