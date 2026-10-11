const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
];

const loginValidator = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Address fields (required parts, 5-digit postcode, valid state) are validated by the
// Mongoose address schema on save; this only checks the overall shape.
const updateProfileValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^\+?[0-9][0-9\s-]{7,15}$/)
    .withMessage('Enter a valid phone number, e.g. 012-345 6789 or +60 12-345 6789'),
  body('address').optional({ values: 'null' }).isObject().withMessage('Address must be an object'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long'),
];

const MAX_PRODUCT_IMAGE_BYTES = 500 * 1024;
const IMAGE_DATA_URI = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

// Accepts a base64 data URI of a JPEG/PNG/WebP image up to MAX_PRODUCT_IMAGE_BYTES decoded,
// or null to remove the image.
const productImageValidator = body('image')
  .optional()
  .custom((value) => {
    if (value === null) return true;
    const match = typeof value === 'string' && value.match(IMAGE_DATA_URI);
    if (!match) {
      throw new Error('Image must be a base64 JPEG, PNG or WebP data URI');
    }
    const decodedBytes = Buffer.byteLength(match[2], 'base64');
    if (decodedBytes > MAX_PRODUCT_IMAGE_BYTES) {
      throw new Error(`Image must be ${MAX_PRODUCT_IMAGE_BYTES / 1024} KB or smaller`);
    }
    return true;
  });

const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Product description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a number >= 0'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be an integer >= 0'),
  body('category').isMongoId().withMessage('A valid category id is required'),
  productImageValidator,
];

const updateProductValidator = [
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Product description cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a number >= 0'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be an integer >= 0'),
  body('category').optional().isMongoId().withMessage('A valid category id is required'),
  productImageValidator,
];

const createCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').optional().trim(),
];

const updateCategoryValidator = [
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
  body('description').optional().trim(),
];

const createOrderValidator = [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.productId').isMongoId().withMessage('Each item must have a valid productId'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each item quantity must be an integer >= 1'),
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  createProductValidator,
  updateProductValidator,
  createCategoryValidator,
  updateCategoryValidator,
  createOrderValidator,
};
