const express = require('express');
const { createCheckoutSessionHandler, handleWebhook } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Note: the raw-body parsing this route needs is configured in server.js,
// mounted before the global express.json() middleware.
router.post('/webhook', handleWebhook);

router.post('/checkout-session', protect, createCheckoutSessionHandler);

module.exports = router;
