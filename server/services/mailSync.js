const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const Settings = require('../models/Settings');
const MailMessage = require('../models/MailMessage');
const SyncState = require('../models/SyncState');
const Lead = require('../models/Lead');
const Client = require('../models/Client');

const fs = require('fs');
const path = require('path');

class MailSyncService {
  constructor() {
    this.activeConnections = new Map(); // email -> client
    this.syncLocks = new Set(); // email
  }

  log(msg, data = '') {
    const line = `[${new Date().toISOString()}] ${msg} ${data ? JSON.stringify(data) : ''}\n`;
    console.log(msg, data);
    try {
      fs.appendFileSync(path.join(__dirname, '../sync_debug.log'), line);
    } catch (e) { }
  }

  async start(options = {}) {
    this.io = options.io; // Store IO instance
    this.log('[MailSync] Starting service...');
    await this.syncAll();

    // Start periodic failsafe sync (default 5m or configured)
    const intervalMs = options.intervalMs || 5 * 60 * 1000;

    // Use setTimeout loop to avoid unhandled rejection crashes from setInterval
    const loop = async () => {
      try {
        await this.syncAll();
      } catch (err) {
        this.log('[MailSync] Interval Sync Error:', err.message);
      } finally {
        setTimeout(loop, intervalMs);
      }
    };

    setTimeout(loop, intervalMs);
  }

  async syncAll() {
    const settings = await Settings.findOne({});
    if (!settings || !settings.emailAccounts) return;

    for (const account of settings.emailAccounts) {
      this.ensureConnection(account);
    }
  }

  async ensureConnection(account) {
    if (this.activeConnections.has(account.email)) {
      const client = this.activeConnections.get(account.email);
      if (client.usable) return; // Already connected and good
    }

    // Connect
    const config = this.buildConfig(account);
    const client = new ImapFlow({
      ...config,
      logger: false,
      emitLogs: false
    });

    client.on('error', (err) => {
      console.error(`[MailSync] Error for ${account.email}:`, err.message);
    });

    client.on('exists', async (data) => {
      console.log(`[MailSync] New email event for ${account.email}:`, data);
      await this.syncAccount(account, client);
    });

    try {
      await client.connect();
      console.log(`[MailSync] IDLE connected for ${account.email}`);
      this.log(`[MailSync] Capabilities for ${account.email}:`, Array.from(client.capabilities || []));

      // Standard Open
      await client.mailboxOpen('INBOX');
      this.activeConnections.set(account.email, client);

      // Initial Sync on Connect
      await this.syncAccount(account, client);

    } catch (err) {
      console.error(`[MailSync] Connection failed for ${account.email}:`, err.message);
      setTimeout(() => this.ensureConnection(account), 30000); // Retry in 30s
    }
  }

  async syncAccount(account, providedClient = null) {
    if (this.syncLocks.has(account.email)) return; // Already syncing
    this.syncLocks.add(account.email);

    let client = providedClient;
    let ownClient = false;

    try {
      if (!client) {
        // One-off connection if not IDLE
        if (this.activeConnections.has(account.email)) {
          client = this.activeConnections.get(account.email);
        } else {
          // Build one-off
          ownClient = true;
          const config = this.buildConfig(account);
          client = new ImapFlow({ ...config, logger: false });
          await client.connect();
          await client.mailboxOpen('INBOX');
        }
      }

      // Get Sync State
      let state = await SyncState.findOne({ accountId: account.email });
      if (!state) state = await SyncState.create({ accountId: account.email });

      await SyncState.updateOne({ accountId: account.email }, { status: 'syncing' });

      // Auto-Reset: If DB is empty but lastUid > 0, reset to 0
      const msgCount = await MailMessage.countDocuments({ accountId: { $in: [account.id, account.email] } });
      if (msgCount === 0 && (state.lastUid || 0) > 0) {
        console.log(`[MailSync] DB empty for ${account.email}, resetting lastUid to 0.`);
        state.lastUid = 0;
        await SyncState.updateOne({ accountId: account.email }, { lastUid: 0 });
      }

      let lastUid = state.lastUid || 0;
      let searchCriteria = '1:*';
      if (lastUid > 0) {
        searchCriteria = `${lastUid + 1}:*`;
      }

      this.log(`[MailSync] Searching ${account.email} range: ${searchCriteria}`);

      // Fetch UIDs
      let maxFoundUid = lastUid;
      let count = 0;

      let uids = await client.search({ uid: searchCriteria }, { uid: true });
      this.log(`[MailSync] Found ${uids.length} UIDs for ${account.email}`);

      // Track max available on server to update lastUid even if we skip all
      if (uids.length > 0) {
        const rawMax = Math.max(...uids);
        if (rawMax > maxFoundUid) maxFoundUid = rawMax;
      }

      // Filter out UIDs we might have locally (double safety)
      if (uids.length > 0) {
        const existing = await MailMessage.find({
          accountId: { $in: [account.id, account.email] },
          imapUid: { $in: uids }
        }).select('imapUid').lean();
        const existingSet = new Set(existing.map(e => e.imapUid));
        const originalCount = uids.length;
        uids = uids.filter(u => !existingSet.has(u));
        if (originalCount !== uids.length) {
          this.log(`[MailSync] Skipped ${originalCount - uids.length} existing UIDs.`);
        }
      }

      if (uids.length > 0) {
        // CRITICAL: Sort Descending (Newest First)
        uids.sort((a, b) => b - a);
        this.log(`[MailSync] Downloading ${uids.length} new messages (Sorted Newest First)`);

        // Download messages
        for (const uid of uids) {
          try {
            // Fix: Use fetchOne with { uid: true } options to strictly treat the first arg as UID
            // fetchOne(seq, query, options)
            const message = await client.fetchOne(uid, { envelope: true, source: true, flags: true }, { uid: true });

            if (message) {
              await this.processMessage(account, message);
              this.log(`[MailSync] Processed UID ${uid}`);
            } else {
              this.log(`[MailSync] UID ${uid} not found or failed fetch`);
            }

            if (uid > maxFoundUid) maxFoundUid = uid;
            count++;

            if (count % 10 === 0) this.log(`[MailSync] Processed ${count}/${uids.length} messages`);

          } catch (e) {
            this.log(`[MailSync] Failed to process msg ${uid}:`, e.message);
          }
        }


      } else if (lastUid > 0) {
        // Check if max UID on server is actually higher? 
      }

      // Update State
      if (maxFoundUid > lastUid) {
        await SyncState.updateOne({ accountId: account.email }, { lastUid: maxFoundUid, lastSyncAt: new Date(), status: 'idle', lastError: null });
      } else {
        await SyncState.updateOne({ accountId: account.email }, { lastSyncAt: new Date(), status: 'idle', lastError: null });
      }

      this.log(`[MailSync] Synced ${count} new messages for ${account.email}. LastUID: ${maxFoundUid}`);

    } catch (err) {
      this.log(`[MailSync] Sync error ${account.email}:`, err.message);
      if (err.response) this.log(`[MailSync] Server Response:`, err.response);
      await SyncState.updateOne({ accountId: account.email }, { status: 'error', lastError: err.message });
    } finally {
      this.syncLocks.delete(account.email);
      if (ownClient) await client.logout();
    }
  }

  async processMessage(account, msg) {
    const parsed = await simpleParser(msg.source);

    const emailParams = {
      accountId: account.email, // Use email as robust ID
      accountEmail: account.email,
      imapUid: msg.uid,
      messageId: parsed.messageId || msg.envelope?.messageId,
      from: parsed.from?.value?.[0]?.address || '',
      fromName: parsed.from?.value?.[0]?.name || parsed.from?.value?.[0]?.address,
      to: parsed.to?.value?.[0]?.address || account.email,
      subject: parsed.subject || '(no subject)',
      body: parsed.html || parsed.textAsHtml || parsed.text,
      timestamp: parsed.date || msg.internalDate || new Date(),
      isRead: (msg.flags && msg.flags.has('\\Seen')),
      isStarred: (msg.flags && msg.flags.has('\\Flagged')),
      attachments: (parsed.attachments || []).map(a => ({
        name: a.filename,
        size: a.size ? Math.round(a.size / 1024) + ' KB' : '0 KB'
      }))
    };

    // Folder Logic (Simplified/Robust)
    let folder = 'General';

    // Auto-categorization
    const fromEmail = emailParams.from.toLowerCase();
    const client = await Client.findOne({ email: fromEmail });
    if (client) folder = 'Clients';
    else {
      const lead = await Lead.findOne({ email: fromEmail });
      if (lead) folder = lead.status === 'Contacted' ? 'Contacted' : (lead.status === 'New' ? 'New' : 'General');
    }

    emailParams.folder = folder;

    await MailMessage.updateOne(
      { accountId: account.email, imapUid: msg.uid },
      { $set: emailParams },
      { upsert: true }
    );

    // REAL-TIME PUSH
    if (this.io) {
      this.io.emit('email:new', {
        ...emailParams,
        id: emailParams.messageId, // Ensure frontend has some ID (though _id is better from DB, this is faster)
        folder: emailParams.folder
      });
      this.log(`[MailSync] Emitted email:new for UID ${msg.uid}`);
    }
  }

  buildConfig(account) {
    return {
      host: account.imapHost || 'mail.privateemail.com',
      port: account.imapPort || 993,
      secure: account.imapSecure !== false,
      auth: {
        user: account.username || account.email,
        pass: account.password
      }
    };
  }
}

// Singleton
const service = new MailSyncService();

module.exports = {
  startMailboxSync: (options) => service.start(options),
  syncAllAccounts: () => service.syncAll()
};
