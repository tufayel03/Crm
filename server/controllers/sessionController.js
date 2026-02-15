const UserSession = require('../models/UserSession');
const { logActivity } = require('../utils/activityLogger');

const toSessionDto = (session, currentSessionId) => ({
  id: String(session._id),
  userId: String(session.userId || ''),
  userName: session.userName || '',
  userEmail: session.userEmail || '',
  userRole: session.userRole || '',
  device: session.device || 'Unknown Device',
  browser: session.browser || 'Unknown Browser',
  os: session.os || 'Unknown OS',
  ip: session.ip || 'Unknown',
  location: session.location || 'Unknown',
  coords: session.coords || undefined,
  lastActive: session.lastActive || session.updatedAt || session.createdAt,
  isCurrent: currentSessionId ? String(session._id) === String(currentSessionId) : false,
  status: 'active'
});

exports.getSessions = async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const query = { revokedAt: null };
  if (!isAdmin) {
    query.userId = req.user._id;
  }

  const sessions = await UserSession.find(query).sort({ lastActive: -1 }).limit(200);
  const items = sessions.map((s) => toSessionDto(s, req.sessionId));
  const activeUsers = new Set(items.map((s) => s.userId).filter(Boolean)).size;

  res.json({
    sessions: items,
    summary: {
      totalSessions: items.length,
      totalUsersActive: activeUsers
    }
  });
};

exports.revokeSession = async (req, res) => {
  const { id } = req.params;
  const session = await UserSession.findById(id);
  if (!session || session.revokedAt) {
    return res.status(404).json({ message: 'Session not found' });
  }

  const isAdmin = req.user?.role === 'admin';
  if (!isAdmin && String(session.userId) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  session.revokedAt = new Date();
  await session.save();
  await logActivity(req, {
    action: 'auth.session_revoked',
    module: 'auth',
    targetType: 'session',
    targetId: session._id,
    details: `Session revoked for ${session.userEmail || session.userName || 'unknown user'}`
  });
  res.json({ message: 'Session revoked' });
};
