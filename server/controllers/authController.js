const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const Client = require('../models/Client');
const AuditLog = require('../models/AuditLog');
const Settings = require('../models/Settings');
const { sendMail } = require('../utils/mailer');
const { getEmailAccount } = require('../utils/emailAccounts');
const { logActivity } = require('../utils/activityLogger');

const getTrustedBaseUrl = (req) => {
  if (process.env.APP_BASE_URL) return String(process.env.APP_BASE_URL).replace(/\/$/, '');
  const allowed = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length > 0) return allowed[0].replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
};

const generateToken = (id, sid) => {
  const payload = sid ? { id, sid } : { id };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

const logLoginError = async (email, message, userId) => {
  try {
    await AuditLog.create({
      userId: userId ? String(userId) : undefined,
      userName: email || 'unknown',
      action: 'login_error',
      details: message
    });
  } catch {
    // ignore logging failures
  }
};

exports.login = async (req, res) => {
  const { email, password, sessionMeta } = req.body;
  if (!email || !password) {
    await logLoginError(email, 'Email and password required');
    return res.status(400).json({ message: 'Email and password required' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    await logLoginError(email, 'Invalid credentials');
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.status === 'blocked') {
    await logLoginError(email, 'User is blocked', user._id);
    return res.status(403).json({ message: 'User is blocked' });
  }
  if (user.status === 'pending') {
    await logLoginError(email, 'Account pending approval', user._id);
    return res.status(403).json({ message: 'Account pending approval' });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    await logLoginError(email, 'Invalid credentials', user._id);
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  user.lastActive = new Date();
  await user.save();

  const coords = sessionMeta?.coords;
  const hasCoords = coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng);
  const locationPermission = String(sessionMeta?.locationPermission || '').toLowerCase();
  if (!hasCoords || locationPermission === 'denied' || locationPermission === 'unknown') {
    return res.status(400).json({ message: 'Location permission is required to sign in.' });
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  const ipFromForward = Array.isArray(forwardedFor) ? forwardedFor[0] : (forwardedFor || '').split(',')[0]?.trim();
  const ip = ipFromForward || req.ip || req.socket?.remoteAddress || 'Unknown';

  const session = await UserSession.create({
    userId: user._id,
    userName: user.name || '',
    userEmail: user.email || '',
    userRole: user.role || '',
    device: sessionMeta?.device || 'Unknown Device',
    browser: sessionMeta?.browser || 'Unknown Browser',
    os: sessionMeta?.os || 'Unknown OS',
    ip,
    location: hasCoords ? 'GPS Verified' : 'Unknown',
    coords: hasCoords ? { lat: coords.lat, lng: coords.lng } : undefined,
    locationPermission: locationPermission || 'unknown',
    lastActive: new Date()
  });

  const token = generateToken(user._id, String(session._id));
  await logActivity(req, {
    action: 'auth.login_success',
    module: 'auth',
    severity: 'info',
    targetType: 'user',
    targetId: user._id,
    details: `User logged in: ${user.email}`
  });
  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissionOverrides: user.permissionOverrides || {},
      avatar: user.avatar,
      status: user.status,
      phone: user.phone,
      jobTitle: user.jobTitle,
      lastActive: user.lastActive
    }
  });
};

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, password required' });

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) return res.status(400).json({ message: 'Email already exists' });

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    password,
    role: role || 'agent'
  });

  await logActivity(req, {
    action: 'auth.user_created',
    module: 'auth',
    severity: 'info',
    targetType: 'user',
    targetId: user._id,
    details: `User created: ${user.email} (${user.role})`
  });

  const token = generateToken(user._id);
  res.status(201).json({ token, user });
};

exports.registerClient = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) return res.status(400).json({ message: 'An account already exists for this email' });

  const client = await Client.findOne({ email: normalizedEmail });
  if (!client) return res.status(403).json({ message: 'Email not found in client records' });

  const name = client.contactName || client.companyName || 'Client';
  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: 'client',
    status: 'pending',
    phone: client.phone
  });

  try {
    await AuditLog.create({
      userId: user._id,
      userName: normalizedEmail,
      action: 'client_register_request',
      details: 'Client registration pending approval'
    });
  } catch {
    // ignore
  }

  res.status(201).json({ message: 'Registration submitted. Await admin approval.' });
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ user });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordToken = hashed;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const settings = await Settings.findOne({});
  const companyName = settings?.generalSettings?.companyName || 'Matlance';
  const template = settings?.systemTemplates?.passwordReset || { subject: 'Reset Password', body: 'Reset your password here: {{link}}' };

  const base = getTrustedBaseUrl(req);
  const resetLink = `${base}/#/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

  const subject = String(template.subject || 'Reset Password').replace('{{company_name}}', companyName);
  let bodyTemplate = String(template.body || 'Reset your password here: {{link}}');
  if (!bodyTemplate.includes('{{link}}')) {
    bodyTemplate = `${bodyTemplate}\n\nReset link: {{link}}`;
  }
  const body = bodyTemplate
    .replace('{{name}}', user.name || user.email.split('@')[0])
    .replace('{{link}}', resetLink)
    .replace('{{company_name}}', companyName);
  const htmlBody = body.replace(/\n/g, '<br/>') + `<br/><br/><a href="${resetLink}">Reset Password</a>`;

  const account = await getEmailAccount({ purpose: 'clients' });
  await sendMail({ to: user.email, subject, html: htmlBody, text: body, account, fromName: companyName });

  res.json({ message: 'Password reset email sent' });
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and new password required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() }
  }).select('+password');

  if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successful' });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password required' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

  user.password = newPassword;
  await user.save();
  await logActivity(req, {
    action: 'auth.password_changed',
    module: 'auth',
    severity: 'info',
    targetType: 'user',
    targetId: user._id,
    details: `Password changed for ${user.email}`
  });
  res.json({ message: 'Password updated' });
};
