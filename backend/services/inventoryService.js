const Product = require('../models/Product');
const AppError = require('../utils/AppError');

// Atomically deducts stock for a single product within a transaction session.
// Throws if the product doesn't exist or doesn't have enough stock.
async function deductStock(productId, quantity, session) {
  const product = await Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true, session }
  );

  if (!product) {
    const existing = await Product.findById(productId).session(session);
    if (!existing) {
      throw new AppError(`Product not found: ${productId}`, 404);
    }
    throw new AppError(`Insufficient stock for product: ${existing.name}`, 409);
  }

  return product;
}

module.exports = { deductStock };