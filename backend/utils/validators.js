const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('role')
    .optional()
    .isIn(['admin', 'customer'])
    .withMessage('Role must be either admin or customer'),
];

const loginValidator = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Product description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a number >= 0'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be an integer >= 0'),
  body('category').isMongoId().withMessage('A valid category id is required'),
];

const updateProductValidator = [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Product description cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a number >= 0'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be an integer >= 0'),
  body('category').optional().isMongoId().withMessage('A valid category id is required'),
];

const createCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').optional().trim(),
];

const updateCategoryValidator = [
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
  body('description').optional().trim(),
];

module.exports = {
  registerValidator,
  loginValidator,
  createProductValidator,
  updateProductValidator,
  createCategoryValidator,
  updateCategoryValidator,
};
