const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../utils/validators');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.get('/me', protect, getMe);

module.exports = router;
