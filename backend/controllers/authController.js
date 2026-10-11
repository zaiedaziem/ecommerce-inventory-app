const { validationResult } = require('express-validator');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');

function toUserResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    address: user.address || null,
  };
}

function sendAuthResponse(user, statusCode, res) {
  const token = signToken({ id: user._id, role: user.role });
  res.status(statusCode).json({ success: true, token, user: toUserResponse(user) });
}

// POST /api/auth/register
const register = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already in use', 409));
  }

  // Public registration always creates a customer. Any client-supplied role is ignored �
  // admins are created out-of-band via `npm run create-admin`.
  const user = await User.create({ name, email, password, role: 'customer' });

  sendAuthResponse(user, 201, res);
});

// POST /api/auth/login
const login = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  sendAuthResponse(user, 200, res);
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: toUserResponse(req.user) });
});

// PUT /api/auth/me — update name, phone and saved shipping address. Email and role can't be
// changed here. Sending address: null removes the saved address.
const updateMe = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, phone, address } = req.body;
  const user = req.user;
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone || undefined;
  if (address !== undefined) user.address = address || undefined;
  await user.save();

  res.status(200).json({ success: true, user: toUserResponse(user) });
});

// PUT /api/auth/password — requires the current password. Returns a fresh token, because
// tokens issued before the change (other devices/sessions) stop working.
const changePassword = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 400));
  }
  if (await user.comparePassword(newPassword)) {
    return next(new AppError('New password must be different from your current password', 400));
  }

  user.password = newPassword;
  await user.save();

  sendAuthResponse(user, 200, res);
});

module.exports = { register, login, getMe, updateMe, changePassword };
