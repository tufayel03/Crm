const Settings = require('../models/Settings');

const DEFAULT_PERMISSIONS = {
  manager: {
    dashboard: { view: true, manage: true, export: true },
    leads: { view: true, manage: true, export: true },
    clients: { view: true, manage: true, export: true },
    tasks: { view: true, manage: true, export: true },
    meetings: { view: true, manage: true, export: true },
    mailbox: { view: true, manage: true, export: false },
    campaigns: { view: true, manage: true, export: true },
    payments: { view: true, manage: true, export: true },
    team: { view: true, manage: true, export: false },
    settings: { view: true, manage: true, export: false }
  },
  agent: {
    dashboard: { view: true, manage: false, export: false },
    leads: { view: true, manage: true, export: false },
    clients: { view: true, manage: false, export: false },
    tasks: { view: true, manage: true, export: false },
    meetings: { view: true, manage: true, export: false },
    mailbox: { view: true, manage: true, export: false },
    campaigns: { view: false, manage: false, export: false },
    payments: { view: false, manage: false, export: false },
    team: { view: false, manage: false, export: false },
    settings: { view: false, manage: false, export: false }
  }
};

const mergePermissions = (settingsPermissions) => ({
  manager: { ...DEFAULT_PERMISSIONS.manager, ...((settingsPermissions || {}).manager || {}) },
  agent: { ...DEFAULT_PERMISSIONS.agent, ...((settingsPermissions || {}).agent || {}) }
});

const hasPermission = (role, resource, action, permissions, userOverrides) => {
  if (role === 'admin') return true;
  if (role !== 'manager' && role !== 'agent') return false;
  const overrideValue = userOverrides?.[resource]?.[action];
  if (typeof overrideValue === 'boolean') return overrideValue;
  return Boolean(permissions?.[role]?.[resource]?.[action]);
};

const requirePermission = (resource, action = 'view') => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role !== 'manager' && req.user.role !== 'agent') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const settings = await Settings.findOne({}).select('permissions');
  const permissions = mergePermissions(settings?.permissions);

  if (!hasPermission(req.user.role, resource, action, permissions, req.user.permissionOverrides || {})) {
    return res.status(403).json({ message: 'Forbidden by access control' });
  }

  return next();
};

module.exports = { requirePermission };
