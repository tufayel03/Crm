const crypto = require('crypto');
const Settings = require('../models/Settings');
const User = require('../models/User');
const IpResetToken = require('../models/IpResetToken');
const { sendMail } = require('../utils/mailer');
const { getEmailAccount } = require('../utils/emailAccounts');

const getTrustedBaseUrl = (req) => {
  if (process.env.APP_BASE_URL) return String(process.env.APP_BASE_URL).replace(/\/$/, '');
  const allowed = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length > 0) return allowed[0].replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
};

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

const DEFAULT_LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost', 'Converted'];
const DEFAULT_LEAD_OUTCOMES = ['Busy', 'Follow-up', 'Interested', 'Not Interested', 'Meeting Required'];

const buildDefaultSettings = () => ({
  emailAccounts: [],
  mailboxSync: [],
  generalSettings: {
    companyName: 'Matlance',
    workspaceSlug: 'matlance-hq',
    supportEmail: 'support@matlance.com',
    companyAddress: '',
    companyPhone: '',
    companyWebsite: '',
    publicTrackingUrl: '',
    timezone: 'UTC',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    logoUrl: '',
    systemWalletBalance: 0,
    invoiceUseLogo: true,
    invoiceFooterText: ''
  },
  systemTemplates: {
    invoice: { subject: 'Invoice {{invoice_id}}', body: 'Please find attached invoice...' },
    meetingSchedule: { subject: 'Meeting Scheduled', body: 'A meeting has been scheduled...' },
    meetingUpdate: { subject: 'Meeting Updated', body: 'Meeting details changed...' },
    meetingCancel: { subject: 'Meeting Cancelled', body: 'Meeting cancelled...' },
    passwordReset: { subject: 'Reset Password', body: 'Reset your password here...' }
  },
  ipRules: { mode: 'none', whitelist: [], blacklist: [] },
  campaignLimits: { hourly: 50, daily: 500 },
  leadStatuses: DEFAULT_LEAD_STATUSES,
  leadOutcomes: DEFAULT_LEAD_OUTCOMES,
  permissions: DEFAULT_PERMISSIONS
});

const getOrCreateSettings = async () => {
  let settings = await Settings.findOne({});
  if (!settings) {
    settings = await Settings.create(buildDefaultSettings());
  }
  return settings;
};

exports.getSettings = async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
};

exports.getPermissions = async (req, res) => {
  const settings = await getOrCreateSettings();
  const current = settings.permissions || {};
  const permissions = {
    manager: { ...DEFAULT_PERMISSIONS.manager, ...(current.manager || {}) },
    agent: { ...DEFAULT_PERMISSIONS.agent, ...(current.agent || {}) }
  };
  res.json({ permissions });
};

exports.updateSettings = async (req, res) => {
  const settings = await getOrCreateSettings();

  const updates = req.body || {};
  const defaults = buildDefaultSettings();

  const merged = {
    emailAccounts: updates.emailAccounts ?? settings.emailAccounts ?? defaults.emailAccounts,
    mailboxSync: settings.mailboxSync ?? defaults.mailboxSync,
    generalSettings: { ...defaults.generalSettings, ...settings.generalSettings, ...(updates.generalSettings || {}) },
    systemTemplates: { ...defaults.systemTemplates, ...settings.systemTemplates, ...(updates.systemTemplates || {}) },
    ipRules: { ...defaults.ipRules, ...settings.ipRules, ...(updates.ipRules || {}) },
    campaignLimits: { ...defaults.campaignLimits, ...settings.campaignLimits, ...(updates.campaignLimits || {}) },
    leadStatuses: updates.leadStatuses ?? settings.leadStatuses ?? defaults.leadStatuses,
    leadOutcomes: updates.leadOutcomes ?? settings.leadOutcomes ?? defaults.leadOutcomes,
    permissions: updates.permissions || settings.permissions || defaults.permissions
  };

  Object.keys(defaults.generalSettings).forEach((key) => {
    if (merged.generalSettings[key] === undefined) {
      merged.generalSettings[key] = defaults.generalSettings[key];
    }
  });

  Object.keys(defaults.systemTemplates).forEach((key) => {
    const current = merged.systemTemplates[key];
    if (!current || typeof current !== 'object') {
      merged.systemTemplates[key] = defaults.systemTemplates[key];
      return;
    }
    merged.systemTemplates[key] = {
      subject: current.subject ?? defaults.systemTemplates[key].subject,
      body: current.body ?? defaults.systemTemplates[key].body
    };
  });

  settings.set(merged);

  await settings.save();
  res.json(settings);
};


const consumeIpResetToken = async (token) => {
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await IpResetToken.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
    usedAt: { $exists: false }
  });
  if (!record) return null;
  record.usedAt = new Date();
  await record.save();
  return record;
};

exports.requestIpReset = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const admin = await User.findOne({ email: String(email).toLowerCase().trim(), role: 'admin' });
  if (!admin) {
    return res.json({ message: 'If that admin exists, a reset link has been sent.' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await IpResetToken.create({
    email: admin.email,
    tokenHash,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000)
  });

  const settings = await getOrCreateSettings();
  const companyName = settings?.generalSettings?.companyName || 'Matlance';
  const base = getTrustedBaseUrl(req);
  const resetLink = `${base}/api/v1/settings/ip-reset/confirm?token=${rawToken}`;

  const subject = `${companyName} - Emergency IP Reset`;
  const text = `An emergency IP reset was requested for your workspace.

Click the link to disable IP whitelist/blacklist rules:
${resetLink}

This link expires in 30 minutes.`;
  const html = text.replace(/\n/g, '<br/>') + `<br/><br/><a href="${resetLink}">Disable IP Rules</a>`;

  const account = await getEmailAccount({ purpose: 'clients' });
  await sendMail({ to: admin.email, subject, html, text, account, fromName: companyName });

  return res.json({ message: 'If that admin exists, a reset link has been sent.' });
};

exports.confirmIpReset = async (req, res) => {
  const { token } = req.query || {};
  const record = await consumeIpResetToken(String(token || ''));
  if (!record) {
    return res.status(400).send('<h2>Invalid or expired reset link.</h2>');
  }

  const settings = await getOrCreateSettings();
  settings.ipRules = { mode: 'none', whitelist: [], blacklist: [] };
  await settings.save();

  return res.send('<h2>IP rules have been disabled. You can now log in.</h2>');
};

