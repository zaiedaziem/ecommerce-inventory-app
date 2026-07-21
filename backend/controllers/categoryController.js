const { validationResult } = require('express-validator');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/categories
const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  res.status(200).json({ success: true, count: categories.length, categories });
});

// GET /api/categories/:id
const getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return next(new AppError('Category not found', 404));
  }
  res.status(200).json({ success: true, category });
});

// POST /api/categories
const createCategory = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, description } = req.body;
  const category = await Category.create({ name, description });

  res.status(201).json({ success: true, category });
});

// PUT /api/categories/:id
const updateCategory = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, description } = req.body;

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { name, description },
    { new: true, runValidators: true, omitUndefined: true }
  );

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  res.status(200).json({ success: true, category });
});

// DELETE /api/categories/:id
const deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return next(new AppError('Category not found', 404));
  }
  res.status(200).json({ success: true, message: 'Category deleted' });
});

module.exports = {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
