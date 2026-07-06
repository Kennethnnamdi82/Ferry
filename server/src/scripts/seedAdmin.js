/**
 * Seed / ensure the primary admin account exists.
 * Run with:  npm run seed:admin
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME;
const RESET = String(process.env.RESET_ADMIN_PASSWORD || '').toLowerCase() === 'true';

try {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set in .env');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  let user = await User.findOne({ email: ADMIN_EMAIL }).select('+password');

  if (!user) {
    user = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      status: 'active',
    });
    console.log(`✓ Created admin user: ${ADMIN_EMAIL}`);
  } else {
    let changed = false;
    if (user.role !== 'admin') {
      user.role = 'admin';
      changed = true;
    }
    if (user.status !== 'active') {
      user.status = 'active';
      changed = true;
    }
    if (RESET) {
      user.password = ADMIN_PASSWORD;
      changed = true;
      console.log('  ↳ Password reset (RESET_ADMIN_PASSWORD=true)');
    }
    if (changed) {
      await user.save();
      console.log(`✓ Updated existing user to admin: ${ADMIN_EMAIL}`);
    } else {
      console.log(`✓ Admin already exists & is correct: ${ADMIN_EMAIL}`);
    }
  }

  console.log('\nLogin with:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${RESET || !user ? ADMIN_PASSWORD : '(unchanged — set RESET_ADMIN_PASSWORD=true to reset)'}`);

  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error('✗ Seed failed:', err.message);
  process.exit(1);
}
