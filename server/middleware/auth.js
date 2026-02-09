const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserSession = require('../models/UserSession');

const protect = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const sessionId = decoded?.sid;

    if (sessionId) {
      const session = await UserSession.findById(sessionId).select('_id userId revokedAt');
      if (!session || session.revokedAt || String(session.userId) !== String(decoded.id)) {
        return res.status(401).json({ message: 'Session expired or revoked' });
      }
      await UserSession.updateOne({ _id: sessionId }, { $set: { lastActive: new Date() } });
      req.sessionId = String(sessionId);
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'User is blocked' });
    }
    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Account pending approval' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (roles.length && !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

module.exports = { protect, authorize };
