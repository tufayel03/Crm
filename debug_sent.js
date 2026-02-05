const mongoose = require('mongoose');
const MailMessage = require('./server/models/MailMessage');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const sentEmails = await MailMessage.find({ folder: 'SENT' });
        console.log(`Found ${sentEmails.length} SENT emails.`);
        sentEmails.forEach(e => {
            console.log(`- ID: ${e._id}, Subject: ${e.subject}, AccountId: ${e.accountId}, Folder: ${e.folder}`);
        });

        const allEmails = await MailMessage.countDocuments();
        console.log(`Total emails in DB: ${allEmails}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
