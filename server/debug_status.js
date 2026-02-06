const mongoose = require('mongoose');
const Settings = require('./models/Settings');
const MailMessage = require('./models/MailMessage');
const SyncState = require('./models/SyncState');

const run = async () => {
    try {
        const mongoUri = 'mongodb://127.0.0.1:27017/matlance';
        await mongoose.connect(mongoUri);
        console.log('--- DB Connected ---');

        console.log('\n--- Email Accounts ---');
        const settings = await Settings.findOne({});
        const accounts = settings?.emailAccounts || [];
        accounts.forEach(a => {
            console.log(`Email: ${a.email} | Provider: ${a.provider} | Host: ${a.imapHost} | ID: ${a.id}`);
        });

        console.log('\n--- Sync State ---');
        const states = await SyncState.find({});
        states.forEach(s => {
            console.log(`Account: ${s.accountId}`);
            console.log(`  Status: ${s.status}`);
            console.log(`  LastUID: ${s.lastUid}`);
            console.log(`  LastError: ${s.lastError || 'None'}`);
            console.log(`  LastSync: ${s.lastSyncAt}`);
        });

        console.log('\n--- Message Counts ---');
        for (const a of accounts) {
            if (!a.email) continue;
            const total = await MailMessage.countDocuments({ accountId: { $in: [String(a.id), a.email] } });
            console.log(`${a.email}: Total=${total}`);

            if (total > 0) {
                const latest = await MailMessage.findOne({ accountId: { $in: [String(a.id), a.email] } }).sort({ timestamp: -1 });
                console.log(`   Latest: ${latest.subject} (${latest.timestamp}) [Folder: ${latest.folder}]`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
