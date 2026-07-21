const express = require('express');
const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { createProductValidator, updateProductValidator } = require('../utils/validators');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', getAllProducts);
router.get('/:id', getProduct);

router.post('/', protect, restrictTo('admin'), createProductValidator, createProduct);
router.put('/:id', protect, restrictTo('admin'), updateProductValidator, updateProduct);
router.delete('/:id', protect, restrictTo('admin'), deleteProduct);

module.exports = router;
