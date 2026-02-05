const Settings = require('../models/Settings');
const MailMessage = require('../models/MailMessage');
const { syncAllAccounts } = require('../services/mailSync');

exports.getMessages = async (req, res) => {
  const { accountId = 'all', limit = '100000' } = req.query;
  const hardCap = parseInt(process.env.MAILBOX_MAX_LIMIT || '100000', 10);
  const max = Math.min(parseInt(limit, 10) || 100000, hardCap);

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
  const { limit = 1000 } = req.body || {};
  const result = await syncAllAccounts(Math.min(parseInt(limit, 10) || 1000, 10000));
  res.json(result);
};

exports.clearMessages = async (req, res) => {
  await MailMessage.deleteMany({});
  res.json({ message: 'Mailbox cleared' });
};

exports.updateMessage = async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  // Whitelist updates
  const validUpdates = {};
  if (updates.isRead !== undefined) validUpdates.isRead = updates.isRead;
  if (updates.isStarred !== undefined) validUpdates.isStarred = updates.isStarred;
  if (updates.folder !== undefined) validUpdates.folder = updates.folder;
  if (updates.labels !== undefined) validUpdates.labels = updates.labels;

  const msg = await MailMessage.findOneAndUpdate({ _id: id }, { $set: validUpdates }, { new: true });
  if (!msg) return res.status(404).json({ message: 'Message not found' });

  res.json(msg);
};

exports.debugSent = async (req, res) => {
  try {
    const messages = await MailMessage.find({ folder: 'SENT' }).sort({ createdAt: -1 }).limit(20);
    const allCount = await MailMessage.countDocuments();
    res.json({ count: messages.length, total: allCount, messages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
