const stripe = require('../config/stripe');
const Order = require('../models/Order');

// Creates a Stripe-hosted Checkout Session for an existing pending order.
async function createCheckoutSession(order, customerEmail) {
  const lineItems = order.items.map((item) => ({
    price_data: {
      currency: 'myr',
      product_data: { name: item.product.name },
      unit_amount: Math.round(item.priceAtPurchase * 100),
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: customerEmail,
    success_url: `${process.env.CLIENT_URL}/order-success?orderId=${order._id}`,
    cancel_url: `${process.env.CLIENT_URL}/order-cancelled?orderId=${order._id}`,
    metadata: { orderId: order._id.toString() },
  });

  return session;
}

// Marks the order referenced in a completed Checkout Session's metadata as paid.
async function markOrderPaidFromSession(session) {
  const { orderId } = session.metadata;
  await Order.findByIdAndUpdate(orderId, { status: 'paid' });
}

module.exports = { createCheckoutSession, markOrderPaidFromSession };
