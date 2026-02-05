const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Attempt to load model
const modelPath = path.join(__dirname, 'server', 'models', 'MailMessage.js');
console.log('Loading model from:', modelPath);
const MailMessage = require(modelPath);

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI is missing from env");
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // Find recent emails (last 2 hours)
        const recent = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const emails = await MailMessage.find({ createdAt: { $gt: recent } }).sort({ createdAt: -1 });

        console.log(`Found ${emails.length} emails created in last 2 hours.`);
        emails.forEach(e => {
            console.log(`[${e.folder}] Subj: "${e.subject}" | To: ${e.to} | From: ${e.from} | ID: ${e._id} | Acc: ${e.accountId}`);
        });

    } catch (e) {
        console.error("Script Error:", e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
