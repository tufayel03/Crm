const AuditLog = require('../models/AuditLog');

const normalizeIp = (req) => {
  const forwardedFor = req?.headers?.['x-forwarded-for'];
  const fromForward = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || '').split(',')[0]?.trim();
  return fromForward || req?.ip || req?.socket?.remoteAddress || '';
};

const logActivity = async (req, payload = {}) => {
  try {
    const user = req?.user || {};
    await AuditLog.create({
      userId: user._id ? String(user._id) : (user.id ? String(user.id) : undefined),
      userName: user.name || payload.userName || 'Unknown',
      userEmail: user.email || payload.userEmail || '',
      action: payload.action || 'activity',
      details: payload.details || '',
      module: payload.module || 'system',
      severity: payload.severity || 'info',
      targetType: payload.targetType || '',
      targetId: payload.targetId ? String(payload.targetId) : '',
      method: req?.method || '',
      path: req?.originalUrl || '',
      ip: normalizeIp(req),
      metadata: payload.metadata || undefined
    });
  } catch {
    // activity logging must never block request flow
  }
};

module.exports = { logActivity };
