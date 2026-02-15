const User = require('../models/User');

const RESOURCES = ['dashboard', 'leads', 'clients', 'tasks', 'meetings', 'mailbox', 'campaigns', 'payments', 'activityLogs', 'team', 'settings'];
const ACTIONS = ['view', 'manage', 'export'];

const sanitizePermissionOverrides = (value) => {
  const input = value && typeof value === 'object' ? value : {};
  const clean = {};
  for (const resource of RESOURCES) {
    if (!input[resource] || typeof input[resource] !== 'object') continue;
    for (const action of ACTIONS) {
      const flag = input[resource][action];
      if (typeof flag === 'boolean') {
        if (!clean[resource]) clean[resource] = {};
        clean[resource][action] = flag;
      }
    }
  }
  return clean;
};

exports.getUsers = async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 });
  res.json(users);
};

exports.createUser = async (req, res) => {
  const { name, email, password, role, status, phone, jobTitle, avatar } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Name and email required' });

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) return res.status(400).json({ message: 'Email already exists' });

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    password: password || Math.random().toString(36).substring(2, 10),
    role: role || 'agent',
    status: status || 'active',
    phone,
    jobTitle,
    avatar
  });

  res.status(201).json(user);
};

exports.updateUser = async (req, res) => {
  const updates = { ...req.body };
  delete updates.password;

  if (Object.prototype.hasOwnProperty.call(updates, 'permissionOverrides')) {
    updates.permissionOverrides = sanitizePermissionOverrides(updates.permissionOverrides);
  }
  if (updates.role && updates.role !== 'manager' && updates.role !== 'agent') {
    updates.permissionOverrides = {};
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

exports.updatePassword = async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const user = await User.findById(req.params.id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.password = password;
  await user.save();
  res.json({ message: 'Password updated' });
};

exports.deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User removed' });
};
