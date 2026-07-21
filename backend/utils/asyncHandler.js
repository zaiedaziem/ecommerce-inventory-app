// Wraps async route handlers so rejected promises are forwarded to the error handler via next().
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
