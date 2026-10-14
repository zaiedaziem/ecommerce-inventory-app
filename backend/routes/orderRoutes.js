const express = require('express');
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrder,
  shipOrder,
  receiveOrder,
} = require('../controllers/orderController');
const { createOrderValidator } = require('../utils/validators');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createOrderValidator, createOrder);
router.get('/my-orders', getMyOrders);
router.get('/', restrictTo('admin'), getAllOrders);
router.get('/:id', getOrder);
router.put('/:id/ship', restrictTo('admin'), shipOrder);
// The owner-only check lives in the order service.
router.put('/:id/receive', receiveOrder);

module.exports = router;
