const mongoose = require('mongoose');
const Settings = require('./server/models/Settings');
const MailMessage = require('./server/models/MailMessage');
require('dotenv').config({ path: './server/.env' }); // Adjust path if needed

const run = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/matlance'; // Default or from env
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const settings = await Settings.findOne({});
        console.log('--- Settings.mailboxSync ---');
        console.log(JSON.stringify(settings?.mailboxSync || [], null, 2));

        console.log('--- Settings.emailAccounts (IDs) ---');
        if (settings?.emailAccounts) {
            settings.emailAccounts.forEach(acc => {
                console.log(`Email: ${acc.email}, ID: ${acc.id}, _id: ${acc._id}`);
            });
        }

        const msgCount = await MailMessage.countDocuments();
        console.log(`--- MailMessages (Total: ${msgCount}) ---`);
        if (msgCount > 0) {
            const lastMsg = await MailMessage.findOne().sort({ _id: -1 });
            console.log('Last Message Sample:', {
                accountId: lastMsg.accountId,
                accountEmail: lastMsg.accountEmail,
                folder: lastMsg.folder,
                imapUid: lastMsg.imapUid
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
