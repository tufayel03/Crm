const AuditLog = require('../models/AuditLog');

exports.getLogs = async (req, res) => {
  const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(1000);
  res.json(logs);
};

exports.addLog = async (req, res) => {
  const payload = req.body || {};
  const log = await AuditLog.create({
    userId: req.user ? String(req.user._id || req.user.id || '') : payload.userId,
    userName: req.user ? req.user.name : payload.userName,
    action: payload.action,
    details: payload.details
  });
  res.status(201).json(log);
};

exports.clearLogs = async (req, res) => {
  await AuditLog.deleteMany({});
  res.json({ message: 'Audit logs cleared' });
};

