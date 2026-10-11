// Creates an admin user, or promotes an existing user to admin.
// Usage: npm run create-admin -- <email> <password> [name]
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const [email, password, name = 'Admin'] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <password> [name]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    console.log(`Promoted existing user ${existing.email} to admin`);
  } else {
    const user = await User.create({ name, email, password, role: 'admin' });
    console.log(`Created admin ${user.email}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
