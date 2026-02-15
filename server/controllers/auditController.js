const AuditLog = require('../models/AuditLog');

const buildQuery = (queryParams = {}) => {
  const {
    search = '',
    action = '',
    module: moduleFilter = '',
    severity = '',
    userId = '',
    from = '',
    to = ''
  } = queryParams;

  const query = {};
  if (action) query.action = String(action);
  if (moduleFilter) query.module = String(moduleFilter);
  if (severity) query.severity = String(severity);
  if (userId) query.userId = String(userId);

  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  const trimmedSearch = String(search || '').trim();
  if (trimmedSearch) {
    const regex = new RegExp(trimmedSearch, 'i');
    query.$or = [
      { userName: regex },
      { userEmail: regex },
      { action: regex },
      { details: regex },
      { module: regex },
      { targetType: regex },
      { targetId: regex }
    ];
  }

  return query;
};

exports.getLogs = async (req, res) => {
  const page = Math.max(1, Number(req.query?.page) || 1);
  const limit = Math.min(1000, Math.max(1, Number(req.query?.limit) || 200));
  const skip = (page - 1) * limit;
  const query = buildQuery(req.query || {});

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1, createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(query)
  ]);

  res.json({ logs, total, page, limit });
};

exports.addLog = async (req, res) => {
  const payload = req.body || {};
  const log = await AuditLog.create({
    userId: req.user ? String(req.user._id || req.user.id || '') : payload.userId,
    userName: req.user ? req.user.name : payload.userName,
    userEmail: req.user ? req.user.email : payload.userEmail,
    action: payload.action,
    details: payload.details,
    module: payload.module || 'system',
    severity: payload.severity || 'info',
    targetType: payload.targetType,
    targetId: payload.targetId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    metadata: payload.metadata
  });
  res.status(201).json(log);
};

exports.clearLogs = async (req, res) => {
  const query = buildQuery(req.query || {});
  const hasFilters = Object.keys(query).length > 0;
  const result = await AuditLog.deleteMany(hasFilters ? query : {});
  res.json({
    message: hasFilters ? 'Filtered audit logs cleared' : 'Audit logs cleared',
    deletedCount: result.deletedCount || 0
  });
};

exports.deleteLog = async (req, res) => {
  const log = await AuditLog.findByIdAndDelete(req.params.id);
  if (!log) return res.status(404).json({ message: 'Log not found' });
  res.json({ message: 'Log removed' });
};
