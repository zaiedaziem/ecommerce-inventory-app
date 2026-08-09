const express = require('express');
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrder,
  updateOrderStatus,
} = require('../controllers/orderController');
const { createOrderValidator, updateOrderStatusValidator } = require('../utils/validators');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createOrderValidator, createOrder);
router.get('/my-orders', getMyOrders);
router.get('/', restrictTo('admin'), getAllOrders);
router.get('/:id', getOrder);
router.put('/:id/status', restrictTo('admin'), updateOrderStatusValidator, updateOrderStatus);

module.exports = router;
