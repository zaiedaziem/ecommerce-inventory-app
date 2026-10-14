// Seeds demo data: accounts, categories, products with photos, and a sample order history.
// Safe to re-run: accounts are only created if missing (existing passwords are never changed),
// categories/products are upserted by name (stock is only set on first insert), and orders
// are only created if the demo customers have none yet.
// Usage: npm run seed
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { buildShippingDetails, createOrder, cancelPendingOrder } = require('../services/orderService');

// Local demo accounts only. Never reuse these credentials anywhere real.
const DEMO_USERS = [
  { key: 'admin', name: 'Demo Admin', email: 'admin@stackcart.test', password: 'DemoAdmin123!', role: 'admin' },
  {
    key: 'aisyah', name: 'Aisyah Rahman', email: 'customer@stackcart.test', password: 'DemoCustomer123!', role: 'customer',
    phone: '012-345 6789',
    address: { line1: '12, Jalan SS 2/24', line2: 'Taman Bahagia', city: 'Petaling Jaya', postcode: '47300', state: 'Selangor' },
  },
  {
    key: 'jason', name: 'Jason Lim', email: 'jason@stackcart.test', password: 'DemoCustomer123!', role: 'customer',
    phone: '016-789 1234',
    address: { line1: '8-3, Jalan Burma', city: 'George Town', postcode: '10050', state: 'Pulau Pinang' },
  },
];

const CATEGORIES = [
  { name: 'Electronics', description: 'Audio, accessories and wearables' },
  { name: 'Home & Kitchen', description: 'Everyday essentials for home and desk' },
  { name: 'Fashion', description: 'Apparel, bags and footwear' },
  { name: 'Sports & Outdoors', description: 'Gear for staying active' },
];

const PRODUCTS = [
  { name: 'Wireless Headphones', category: 'Electronics', price: 249.0, stock: 25, image: 'wireless-headphones',
    description: 'Over-ear Bluetooth 5.3 headphones with active noise cancellation, 40-hour battery life and USB-C fast charging.' },
  { name: 'Mechanical Keyboard', category: 'Electronics', price: 329.0, stock: 12, image: 'mechanical-keyboard',
    description: 'Compact 60% hot-swappable mechanical keyboard with tactile brown switches and PBT keycaps.' },
  { name: 'Wireless Mouse', category: 'Electronics', price: 59.9, stock: 40, image: 'wireless-mouse',
    description: 'Ergonomic silent-click wireless mouse with 2.4 GHz receiver and adjustable 4000 DPI sensor.' },
  { name: 'Smart Watch', category: 'Electronics', price: 499.0, stock: 3, image: 'smart-watch',
    description: 'AMOLED fitness smartwatch with heart-rate and SpO2 tracking, GPS and 7-day battery. Only a few left.' },
  { name: 'Ceramic Coffee Mug', category: 'Home & Kitchen', price: 29.9, stock: 60, image: 'ceramic-coffee-mug',
    description: 'Hand-glazed 350 ml stoneware mug. Microwave and dishwasher safe.' },
  { name: 'Gooseneck Kettle', category: 'Home & Kitchen', price: 159.0, stock: 15, image: 'gooseneck-kettle',
    description: '1 L stainless steel gooseneck kettle for precise pour-over coffee, with built-in thermometer.' },
  { name: 'Succulent Desk Plant', category: 'Home & Kitchen', price: 35.0, stock: 0, image: 'succulent-desk-plant',
    description: 'Low-maintenance live succulent in a matte ceramic pot. Perfect for a desk or shelf.' },
  { name: 'Classic Cotton T-Shirt', category: 'Fashion', price: 49.9, stock: 80, image: 'cotton-t-shirt',
    description: '100% combed cotton crew-neck tee, pre-shrunk and breathable for Malaysian weather.' },
  { name: 'Canvas Backpack', category: 'Fashion', price: 139.0, stock: 20, image: 'canvas-backpack',
    description: 'Water-resistant waxed canvas backpack with padded 15" laptop sleeve and leather trims.' },
  { name: 'Running Sneakers', category: 'Fashion', price: 289.0, stock: 18, image: 'running-sneakers',
    description: 'Lightweight running shoes with breathable knit upper and responsive foam midsole.' },
  { name: 'Insulated Water Bottle', category: 'Sports & Outdoors', price: 79.9, stock: 45, image: 'insulated-water-bottle',
    description: 'Double-wall vacuum insulated 750 ml bottle. Keeps drinks cold for 24 hours or hot for 12.' },
  { name: 'Yoga Mat', category: 'Sports & Outdoors', price: 99.0, stock: 30, image: 'yoga-mat',
    description: '6 mm non-slip TPE yoga mat with carrying strap. Lightweight and sweat-resistant.' },
];

// Sample order history. daysAgo backdates the order; status is the final state to reach.
const ORDERS = [
  { user: 'aisyah', daysAgo: 12, status: 'delivered', items: [['Wireless Headphones', 1], ['Ceramic Coffee Mug', 2]] },
  { user: 'aisyah', daysAgo: 4, status: 'shipped', items: [['Running Sneakers', 1]] },
  { user: 'aisyah', daysAgo: 1, status: 'paid', items: [['Yoga Mat', 1], ['Insulated Water Bottle', 1]] },
  { user: 'jason', daysAgo: 9, status: 'delivered', items: [['Mechanical Keyboard', 1], ['Wireless Mouse', 1]] },
  { user: 'jason', daysAgo: 6, status: 'cancelled', items: [['Gooseneck Kettle', 1]] },
  { user: 'jason', daysAgo: 2, status: 'paid', items: [['Canvas Backpack', 1], ['Classic Cotton T-Shirt', 3]] },
];

const IMAGE_DIR = path.join(__dirname, 'seed-images');

function loadImage(name) {
  const base64 = fs.readFileSync(path.join(IMAGE_DIR, `${name}.webp`)).toString('base64');
  return `data:image/webp;base64,${base64}`;
}

async function seedUsers() {
  const users = {};
  for (const { key, ...data } of DEMO_USERS) {
    let user = await User.findOne({ email: data.email });
    if (!user) {
      user = await User.create(data);
      console.log(`  created ${data.role} ${data.email}`);
    } else if (data.address && !user.address) {
      // Accounts seeded before profiles existed get the demo phone/address filled in.
      user.phone = user.phone || data.phone;
      user.address = data.address;
      await user.save();
      console.log(`  added phone/address to ${data.email}`);
    }
    users[key] = user;
  }
  return users;
}

// Orders seeded before shipping snapshots existed get one from the demo customer's profile.
async function backfillOrderShipping(users) {
  let updated = 0;
  for (const user of Object.values(users)) {
    if (!user.address) continue;
    const { modifiedCount } = await Order.updateMany(
      { user: user._id, 'shipping.address': { $exists: false } },
      { $set: { shipping: buildShippingDetails(user) } }
    );
    updated += modifiedCount;
  }
  if (updated > 0) console.log(`  added shipping details to ${updated} existing order(s)`);
}

async function seedCategories() {
  const categories = {};
  for (const { name, description } of CATEGORIES) {
    categories[name] = await Category.findOneAndUpdate(
      { name },
      { $set: { description } },
      { upsert: true, new: true }
    );
  }
  console.log(`  ${CATEGORIES.length} categories ready`);
  return categories;
}

async function seedProducts(categories, admin) {
  const products = {};
  for (const { name, category, stock, image, ...data } of PRODUCTS) {
    products[name] = await Product.findOneAndUpdate(
      { name },
      {
        $set: { ...data, category: categories[category]._id, image: loadImage(image) },
        $setOnInsert: { stock, createdBy: admin._id },
      },
      { upsert: true, new: true, runValidators: true }
    );
  }
  console.log(`  ${PRODUCTS.length} products ready (with photos)`);
  return products;
}

async function seedOrders(users, products) {
  const customerIds = ORDERS.map((o) => users[o.user]._id);
  if (await Order.exists({ user: { $in: customerIds } })) {
    console.log('  demo customers already have orders, skipping');
    return;
  }

  let created = 0;
  for (const spec of ORDERS) {
    const items = spec.items.map(([name, quantity]) => ({ productId: products[name]._id, quantity }));
    let order;
    try {
      order = await createOrder(users[spec.user]._id, items, buildShippingDetails(users[spec.user]));
    } catch (err) {
      // e.g. a pre-existing product with too little stock; skip rather than abort the seed.
      console.warn(`  skipped an order for ${spec.user}: ${err.message}`);
      continue;
    }
    created += 1;
    const placedAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000);

    if (spec.status === 'cancelled') {
      // Goes through the real cancellation path, so stock is returned.
      await cancelPendingOrder(order._id);
    } else {
      // Demo orders skip Stripe, so mark them paid (and beyond) directly.
      const after = (hours) => new Date(placedAt.getTime() + hours * 60 * 60 * 1000);
      await Order.updateOne(
        { _id: order._id },
        {
          status: spec.status,
          paidAt: after(0.1),
          ...(spec.status !== 'paid' && { shippedAt: after(24) }),
          ...(spec.status === 'delivered' && { deliveredAt: after(72) }),
        }
      );
    }
    // createdAt is immutable through Mongoose, so backdate via the driver.
    await Order.collection.updateOne(
      { _id: order._id },
      { $set: { createdAt: placedAt, updatedAt: placedAt } }
    );
  }
  console.log(`  ${created} orders created`);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Seeding ${mongoose.connection.name}...`);

  const users = await seedUsers();
  const categories = await seedCategories();
  const products = await seedProducts(categories, users.admin);
  await seedOrders(users, products);
  await backfillOrderShipping(users);

  console.log('Done. Demo logins are listed in DEMO_USERS in backend/scripts/seed.js');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
