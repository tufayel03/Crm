const AuditLog = require('../models/AuditLog');

const safeString = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const errorLogger = (req, res, next) => {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = (body) => {
    if (res.statusCode >= 400 && body) {
      if (typeof body === 'object') {
        res.locals.errorMessage = body.message || body.error || res.locals.errorMessage;
      } else {
        res.locals.errorMessage = safeString(body);
      }
    }
    return originalJson(body);
  };

  res.send = (body) => {
    if (res.statusCode >= 400 && body) {
      res.locals.errorMessage = safeString(body);
    }
    return originalSend(body);
  };

  res.on('finish', () => {
    if (res.statusCode < 400) return;

    const userId = req.user?._id || req.user?.id;
    const userName = req.user?.email || req.user?.name || 'anonymous';
    const base = `${res.statusCode} ${req.method} ${req.originalUrl}`;
    const details = res.locals.errorMessage ? `${base} - ${res.locals.errorMessage}` : base;

    setImmediate(async () => {
      try {
        await AuditLog.create({
          userId: userId ? String(userId) : undefined,
          userName,
          action: 'http_error',
          details
        });
      } catch {
        // Avoid breaking request flow if logging fails
      }
    });
  });

  next();
};

module.exports = { errorLogger };
