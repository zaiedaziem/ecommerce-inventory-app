const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/products
const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().populate('category', 'name');
  res.status(200).json({ success: true, count: products.length, products });
});

// GET /api/products/:id
const getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('category', 'name');
  if (!product) {
    return next(new AppError('Product not found', 404));
  }
  res.status(200).json({ success: true, product });
});

// POST /api/products
const createProduct = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, description, price, stock, category } = req.body;

  const product = await Product.create({
    name,
    description,
    price,
    stock,
    category,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, product });
});

// PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, description, price, stock, category } = req.body;

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { name, description, price, stock, category },
    { new: true, runValidators: true, omitUndefined: true }
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({ success: true, product });
});

// DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return next(new AppError('Product not found', 404));
  }
  res.status(200).json({ success: true, message: 'Product deleted' });
});

module.exports = { getAllProducts, getProduct, createProduct, updateProduct, deleteProduct };
