const { ImapFlow } = require('imapflow');
const Settings = require('./models/Settings');
const mongoose = require('mongoose');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/matlance');
        const settings = await Settings.findOne({});
        const account = settings.emailAccounts[0]; // Check first account

        const client = new ImapFlow({
            host: account.imapHost || 'mail.privateemail.com',
            port: account.imapPort || 993,
            secure: account.imapSecure !== false,
            auth: {
                user: account.username || account.email,
                pass: account.password
            },
            logger: false
        });

        await client.connect();
        console.log('IMAP Connected.');
        let lock = await client.getMailboxLock('INBOX');

        try {
            const status = await client.status('INBOX', { messages: true });
            console.log('Total Messages on Server:', status.messages);

            // Fetch latest
            const message = await client.fetchOne('*', { envelope: true });
            console.log('--- LATEST EMAIL ON SERVER ---');
            console.log('Subject:', message.envelope.subject);
            console.log('Date:', message.envelope.date);
            console.log('UID:', message.uid);

        } finally {
            lock.release();
        }

        await client.logout();

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};
run();
