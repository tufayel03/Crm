const { startMailboxSync, syncAllAccounts } = require('./services/mailSync');
const mongoose = require('mongoose');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/matlance');
        console.log('Connected to DB. Starting manual sync...');

        await syncAllAccounts();

        console.log('Sync initiated. Waiting for logs...');
        await new Promise(resolve => setTimeout(resolve, 15000));

        console.log('Sync completed.');
    } catch (e) {
        console.error('Manual Sync Error:', e);
    } finally {
        await mongoose.disconnect();
    }
};
run();
