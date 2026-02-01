const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const Settings = require('../models/Settings');
const MailMessage = require('../models/MailMessage');

const buildAccountConfig = (account) => {
  const user = account.username || account.email;
  const pass = account.password;
  const host = account.imapHost || account.smtpHost || 'mail.privateemail.com';
  const port = parseInt(account.imapPort || 993, 10);
  const explicitStartTLS = account.imapStartTLS === true;
  const inferredStartTLS = account.imapStartTLS === undefined && port === 143;
  const startTLS = explicitStartTLS || inferredStartTLS;
  const secure = startTLS ? false : (account.imapSecure !== undefined ? account.imapSecure : port === 993);

  if (!user || !pass) {
    throw new Error('IMAP credentials missing for this account');
  }

  return { host, port, secure, doSTARTTLS: startTLS, auth: { user, pass } };
};

const fetchMessagesForAccount = async (account, limit = 50) => {
  const client = new ImapFlow({
    ...buildAccountConfig(account),
    socketTimeout: 30000,
    greetingTimeout: 30000,
    logger: false
  });
  let lastError = null;
  client.on('error', (err) => {
    lastError = err;
    console.error('IMAP client error:', err?.message || err);
  });
  const results = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const exists = client.mailbox.exists || 0;
      if (exists === 0) return [];

      const start = Math.max(1, exists - limit + 1);
      const range = `${start}:${exists}`;

      for await (const msg of client.fetch(range, { uid: true, flags: true, source: true, internalDate: true, envelope: true })) {
        const parsed = await simpleParser(msg.source);
        const fromAddress = parsed.from?.value?.[0]?.address || '';
        const fromName = parsed.from?.value?.[0]?.name || fromAddress;
        const toAddress = parsed.to?.value?.[0]?.address || account.email;
        const subject = parsed.subject || '(no subject)';
        const html = parsed.html || parsed.textAsHtml || (parsed.text ? `<pre>${parsed.text}</pre>` : '');
        const messageId = parsed.messageId || msg.envelope?.messageId || '';

        results.push({
          accountId: String(account.id),
          accountEmail: account.email,
          imapUid: msg.uid,
          messageId,
          from: fromAddress,
          fromName,
          to: toAddress,
          subject,
          body: html,
          timestamp: parsed.date || msg.internalDate || new Date(),
          isRead: (msg.flags || []).includes('\\Seen'),
          isStarred: (msg.flags || []).includes('\\Flagged'),
          attachments: (parsed.attachments || []).map(a => ({
            name: a.filename || 'attachment',
            size: a.size ? `${Math.round(a.size / 1024)} KB` : 'unknown'
          }))
        });
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    if (lastError) throw lastError;
    throw err;
  } finally {
    await client.logout().catch(() => {});
  }

  return results;
};

const syncAccount = async (account, limit = 50) => {
  const messages = await fetchMessagesForAccount(account, limit);
  if (messages.length === 0) return 0;

  for (const msg of messages) {
    await MailMessage.updateOne(
      { accountId: msg.accountId, imapUid: msg.imapUid },
      { $set: msg },
      { upsert: true }
    );
  }

  return messages.length;
};

const syncAllAccounts = async (limit = 50) => {
  const settings = await Settings.findOne({});
  const accounts = settings?.emailAccounts || [];
  if (accounts.length === 0) return { synced: 0, errors: [] };

  let synced = 0;
  const errors = [];
  for (const account of accounts) {
    try {
      synced += await syncAccount(account, limit);
    } catch (err) {
      errors.push(`Account ${account.email || account.id}: ${err.message || 'Sync failed'}`);
    }
  }

  return { synced, errors };
};

const startMailboxSync = ({ intervalMs = 5 * 60 * 1000, limit = 50 } = {}) => {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await syncAllAccounts(limit);
    } catch (err) {
      // Never crash the process for sync errors
      console.error('Mailbox sync failed:', err?.message || err);
    } finally {
      running = false;
    }
  };

  tick();
  return setInterval(tick, intervalMs);
};

module.exports = { syncAllAccounts, startMailboxSync };
