const mongoose = require('mongoose');
const MailMessage = require('./models/MailMessage');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/matlance');
        console.log('Connected.');

        // Fetch last 5 inserted messages (by implicit _id or createdAt)
        const messages = await MailMessage.find().sort({ _id: -1 }).limit(5);

        console.log('--- 5 MOST RECENTLY INSERTED EMAILS ---');
        if (messages.length === 0) {
            console.log('No emails found in DB.');
        } else {
            messages.forEach(m => {
                console.log(`[Inserted: ${m._id.getTimestamp().toISOString()}]`);
                console.log(`Subject: ${m.subject}`);
                console.log(`From: ${m.from}`);
                console.log(`Folder: ${m.folder}`);
                console.log(`UID: ${m.imapUid}`);
                console.log('-----------------------------------');
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};
run();
