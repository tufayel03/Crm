const User = require('../models/User');

const ensureAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;

  const existing = await User.findOne({ email: adminEmail.toLowerCase().trim() });
  if (existing) return;

  await User.create({
    name: process.env.ADMIN_NAME || 'Admin',
    email: adminEmail.toLowerCase().trim(),
    password: adminPassword,
    role: 'admin',
    status: 'active'
  });

  console.log('Admin user seeded');
};

module.exports = { ensureAdminUser };

