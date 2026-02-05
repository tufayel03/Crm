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

const fetchMessagesForAccount = async (account, limit = 1000, lastUid = 0) => {
  const config = buildAccountConfig(account);
  console.log('[MailSync] Config:', { ...config, auth: { user: config.auth.user, pass: '***' } });


  const client = new ImapFlow({
    ...config,
    socketTimeout: 60000,
    greetingTimeout: 60000,
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
    console.log(`[MailSync] Connected to ${account.email} at ${account.imapHost || 'default-host'}`);
    const lock = await client.getMailboxLock('INBOX');
    try {
      const exists = client.mailbox.exists || 0;
      console.log(`[MailSync] Mailbox has ${exists} messages.`);
      if (exists === 0) return [];

      const fetchByUids = async (uids) => {
        if (!uids || uids.length === 0) return;
        const existing = await MailMessage.find({ accountId: String(account.id), imapUid: { $in: uids } })
          .select('imapUid')
          .lean();
        const existingSet = new Set(existing.map(e => e.imapUid));
        const newUids = uids.filter(uid => !existingSet.has(uid));
        if (newUids.length === 0) return;

        const chunkSize = 50;
        for (let i = 0; i < newUids.length; i += chunkSize) {
          const chunk = newUids.slice(i, i + chunkSize);
          const uidRange = chunk.join(',');
          const fetchOpts = { uid: true, flags: true, source: true, internalDate: true, envelope: true };
          console.log(`[MailSync] Fetching UID set: ${uidRange}`);
          for await (const msg of client.fetch(uidRange, fetchOpts)) {
            console.log(`[MailSync] Processing msg UID: ${msg.uid}`);
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
              isRead: (msg.flags instanceof Set ? msg.flags.has('\\Seen') : (msg.flags || []).includes('\\Seen')),
              isStarred: (msg.flags instanceof Set ? msg.flags.has('\\Flagged') : (msg.flags || []).includes('\\Flagged')),
              attachments: (parsed.attachments || []).map(a => ({
                name: a.filename || 'attachment',
                size: a.size ? `${Math.round(a.size / 1024)} KB` : 'unknown'
              }))
            });
          }
        }
      };

      try {
        let uids = await client.search({ all: true }, { uid: true });
        if (!Array.isArray(uids)) uids = [];
        uids = uids.map(n => Number(n)).filter(n => !Number.isNaN(n)).sort((a, b) => a - b);

        if (uids.length === 0) return [];

        let targetUids = [];
        if (lastUid && lastUid > 0) {
          targetUids = uids.filter(uid => uid > lastUid);
        } else {
          targetUids = uids.slice(-limit);
        }

        if (targetUids.length === 0) return [];
        await fetchByUids(targetUids);
      } catch (err) {
        const message = String(err?.message || '');
        const responseText = String(err?.responseText || '');
        if (message.toLowerCase().includes('invalid messageset') || responseText.toLowerCase().includes('invalid messageset')) {
          const uids = await client.search({ all: true }, { uid: true });
          const clean = (uids || []).map(n => Number(n)).filter(n => !Number.isNaN(n)).sort((a, b) => a - b);
          const targetUids = clean.slice(-limit);
          await fetchByUids(targetUids);
        } else {
          throw err;
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    if (lastError) throw lastError;
    throw err;
  } finally {
    await client.logout().catch(() => { });
  }

  return results;
};

const syncAccount = async (account, limit = 1000) => {
  const settings = await Settings.findOne({});
  const syncState = (settings?.mailboxSync || []).find(s => String(s.accountId) === String(account.id));
  let lastUid = Number(syncState?.lastUid || 0);
  if (Number.isNaN(lastUid) || lastUid < 0) lastUid = 0;

  let messages = [];
  try {
    messages = await fetchMessagesForAccount(account, limit, lastUid);
  } catch (err) {
    const message = String(err?.message || '');
    const responseText = String(err?.responseText || '');
    if (message.toLowerCase().includes('invalid messageset') || responseText.toLowerCase().includes('invalid messageset')) {
      if (settings) {
        const nextSync = settings.mailboxSync || [];
        const idx = nextSync.findIndex(s => String(s.accountId) === String(account.id));
        const entry = { accountId: String(account.id), lastUid: 0, lastSyncAt: new Date() };
        if (idx >= 0) nextSync[idx] = { ...nextSync[idx], ...entry };
        else nextSync.push(entry);
        settings.mailboxSync = nextSync;
        await settings.save();
      }
      messages = await fetchMessagesForAccount(account, limit, 0);
    } else {
      throw err;
    }
  }
  if (messages.length === 0) return 0;


  // Import models inside the function or top level to ensure they are available
  // (Already imported at top)
  const Lead = require('../models/Lead');
  const Client = require('../models/Client');

  let maxUid = lastUid;
  for (const msg of messages) {
    if (msg.imapUid && msg.imapUid > maxUid) maxUid = msg.imapUid;
    // Determine Folder Logic
    let folder = 'General';
    const email = msg.from.toLowerCase();

    // 1. Check Clients
    const client = await Client.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (client) {
      folder = 'Clients';
    } else {
      // 2. Check Leads
      const lead = await Lead.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
      if (lead) {
        if (lead.status === 'Contacted') {
          folder = 'Contacted';
        } else if (lead.status === 'New') {
          folder = 'New';
        } else {
          // If lead exists but status is other, maybe default to General or keep status name?
          // User requirement: "if email has new satus then it goes to new folder"
          // "if ... contacted status then it goes to contacted folder"
          // "other all email goes to general" -> potentially implies other statuses go to General?
          // But usually we want to group by status. For now, let's respect the explicit rules.
          folder = 'General';
          // Optional: You could use lead.status if you want dynamic folders for all statuses
          // folder = lead.status;
        }
      }
    }

    // 3. Prevent Overwriting TRASH or SENT
    // We need to check if the message already exists and has a restricted folder
    const existingMsg = await MailMessage.findOne({ accountId: msg.accountId, imapUid: msg.imapUid }).select('folder');

    if (existingMsg) {
      if (existingMsg.folder === 'TRASH' || existingMsg.folder === 'SENT') {
        msg.folder = existingMsg.folder;
        // If it was trash, we might want to keep it read? Or update other flags?
        // For now, just preserving the folder is key.
      } else if (existingMsg.folder !== 'General' && folder === 'General') {
        // Optional: If user manually moved to a custom folder (that is not Trash/Sent), 
        // and our logic says "General", maybe we should preserve the custom folder too?
        // For now, let's strictly protect TRASH and SENT.
        // If we want to persist ALL manual moves, we should prioritize existing folder unless it was 'General'.
        if (existingMsg.folder && existingMsg.folder !== 'General') {
          msg.folder = existingMsg.folder;
        }
      }
    } else {
      msg.folder = folder;
    }

    await MailMessage.updateOne(
      { accountId: msg.accountId, imapUid: msg.imapUid },
      { $set: msg },
      { upsert: true }
    );
  }

  if (settings) {
    const nextSync = settings.mailboxSync || [];
    const idx = nextSync.findIndex(s => String(s.accountId) === String(account.id));
    const entry = { accountId: String(account.id), lastUid: maxUid, lastSyncAt: new Date() };
    if (idx >= 0) nextSync[idx] = { ...nextSync[idx], ...entry };
    else nextSync.push(entry);
    settings.mailboxSync = nextSync;
    await settings.save();
  }

  return messages.length;
};

const syncAllAccounts = async (limit = 1000) => {
  const settings = await Settings.findOne({});
  const accounts = settings?.emailAccounts || [];
  if (accounts.length === 0) return { synced: 0, errors: [] };

  let synced = 0;
  const errors = [];
  for (const account of accounts) {
    try {
      console.log(`[MailSync] Syncing account: ${account.email}`);
      const count = await syncAccount(account, limit);
      synced += count;
      console.log(`[MailSync] Account ${account.email} synced ${count} messages.`);
    } catch (err) {
      console.error(`[MailSync] Error syncing ${account.email}:`, err);
      errors.push(`Account ${account.email || account.id}: ${err.message || 'Sync failed'}`);
    }
  }

  return { synced, errors };
};

const startMailboxSync = ({ intervalMs = 5 * 60 * 1000, limit = 1000 } = {}) => {
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
