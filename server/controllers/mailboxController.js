const Settings = require('../models/Settings');
const MailMessage = require('../models/MailMessage');
const { syncAllAccounts } = require('../services/mailSync');

exports.getMessages = async (req, res) => {
  const { accountId = 'all', limit = '100000', skip = '0' } = req.query;
  const hardCap = parseInt(process.env.MAILBOX_MAX_LIMIT || '100000', 10);
  const max = Math.min(parseInt(limit, 10) || 100000, hardCap);
  const skipVal = parseInt(skip, 10) || 0;

  const settings = await Settings.findOne({});
  if (!settings) return res.status(404).json({ message: 'Settings not found' });

  // Filter by account
  const validAccounts = settings.emailAccounts.map(acc => acc.email);
  const accountEmails = settings.emailAccounts.map(acc => acc.email);

  let query = {};

  if (accountId !== 'all') {
    // Check if accountId matches an ID or Email
    const matched = settings.emailAccounts.find(acc => acc.id === accountId || acc.email === accountId);
    if (matched) {
      query = {
        $or: [
          { accountId: { $in: [matched.id, matched.email] } },
          { accountEmail: matched.email }
        ]
      };
    } else {
      // If valid account requested but not found in settings, return empty
      return res.json({ messages: [], errors: ['Account not found'] });
    }
  } else {
    // Show all messages for configured accounts
    // query.accountId = { $in: [...validAccounts, ...settings.emailAccounts.map(a => a.id)] };
    // actually, we might want all messages even if account deleted? 
    // For now, let's show all messages in DB.
    query = {};
  }

  const messages = await MailMessage.find(query).sort({ timestamp: -1 }).skip(skipVal).limit(max);

  res.json({ messages, errors: [] });
};

exports.syncNow = async (req, res) => {
  const { limit = 100000, force = false, accountId } = req.body || {};
  const hardCap = parseInt(process.env.MAILBOX_MAX_LIMIT || '100000', 10);
  const safeLimit = Math.min(parseInt(limit, 10) || 100000, hardCap);

  if (force) {
    const settings = await Settings.findOne({});
    if (settings) {
      const nextSync = settings.mailboxSync || [];
      if (accountId && accountId !== 'all') {
        const idx = nextSync.findIndex(s => String(s.accountId) === String(accountId));
        const entry = { accountId: String(accountId), lastUid: 0, lastSyncAt: new Date() };
        if (idx >= 0) nextSync[idx] = { ...nextSync[idx], ...entry };
        else nextSync.push(entry);
      } else {
        for (let i = 0; i < nextSync.length; i += 1) {
          nextSync[i] = { ...nextSync[i], lastUid: 0, lastSyncAt: new Date() };
        }
      }
      settings.mailboxSync = nextSync;
      await settings.save();
    }
  }

  const result = await syncAllAccounts(safeLimit);
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

exports.deleteMessage = async (req, res) => {
  const { id } = req.params;
  await MailMessage.findByIdAndDelete(id);
  res.json({ message: 'Message deleted permanent' });
};
