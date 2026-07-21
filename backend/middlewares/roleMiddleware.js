const AppError = require('../utils/AppError');

// Restricts access to the given roles. Must run after protect() so req.user is set.
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};

module.exports = { restrictTo };
