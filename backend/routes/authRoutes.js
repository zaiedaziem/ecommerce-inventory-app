const express = require('express');
const { register, login, getMe, updateMe, changePassword } = require('../controllers/authController');
const {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
} = require('../utils/validators');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfileValidator, updateMe);
router.put('/password', protect, changePasswordValidator, changePassword);

module.exports = router;
