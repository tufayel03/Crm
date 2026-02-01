const Settings = require('../models/Settings');
const MailMessage = require('../models/MailMessage');
const { syncAllAccounts } = require('../services/mailSync');

exports.getMessages = async (req, res) => {
  const { accountId = 'all', limit = '50' } = req.query;
  const max = Math.min(parseInt(limit, 10) || 50, 200);

  const settings = await Settings.findOne({});
  if (!settings) return res.status(404).json({ message: 'Settings not found' });

  const accounts = settings.emailAccounts || [];
  if (accounts.length === 0) return res.json({ messages: [], errors: ['No email accounts connected'] });

  if (accountId !== 'all' && !accounts.find(a => String(a.id) === String(accountId))) {
    return res.json({ messages: [], errors: ['Email account not found'] });
  }

  const query = accountId === 'all' ? {} : { accountId: String(accountId) };
  const messages = await MailMessage.find(query).sort({ timestamp: -1 }).limit(max);

  res.json({ messages, errors: [] });
};

exports.syncNow = async (req, res) => {
  const { limit = 50 } = req.body || {};
  const result = await syncAllAccounts(Math.min(parseInt(limit, 10) || 50, 200));
  res.json(result);
};

exports.clearMessages = async (req, res) => {
  await MailMessage.deleteMany({});
  res.json({ message: 'Mailbox cleared' });
};
