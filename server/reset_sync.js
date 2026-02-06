const mongoose = require('mongoose');
const MailMessage = require('./models/MailMessage');
const SyncState = require('./models/SyncState');
const { syncAllAccounts } = require('./services/mailSync');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/matlance');
        console.log('Connected.');

        // 1. Show Last 5 Emails
        const messages = await MailMessage.find().sort({ timestamp: -1 }).limit(5);
        console.log('--- Last 5 Emails in DB ---');
        messages.forEach(m => {
            console.log(`[${m.timestamp}] ${m.subject} (UID: ${m.imapUid})`);
        });

        // 2. Show Sync State
        const states = await SyncState.find({});
        console.log('--- Current Sync States ---');
        console.log(JSON.stringify(states, null, 2));

        // 3. FORCE RESET
        console.log('--- RESETTING COMPLETED ---');
        await SyncState.updateMany({}, { $set: { lastUid: 0, status: 'idle' } });
        console.log('All SyncStates reset to lastUid: 0');

        // 4. Trigger Sync
        console.log('--- TRIGGERING SYNC ---');
        await syncAllAccounts();
        console.log('--- SYNC FINISHED ---');

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};
run();
