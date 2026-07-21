const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the Bearer JWT and attaches the authenticated user to req.user.
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Not authorized, no token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    return next(new AppError('Not authorized, invalid or expired token', 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('Not authorized, user no longer exists', 401));
  }

  req.user = user;
  next();
});

module.exports = { protect };
