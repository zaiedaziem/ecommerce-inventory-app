const express = require('express');
const {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { createCategoryValidator, updateCategoryValidator } = require('../utils/validators');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:id', getCategory);

router.post('/', protect, restrictTo('admin'), createCategoryValidator, createCategory);
router.put('/:id', protect, restrictTo('admin'), updateCategoryValidator, updateCategory);
router.delete('/:id', protect, restrictTo('admin'), deleteCategory);

module.exports = router;
