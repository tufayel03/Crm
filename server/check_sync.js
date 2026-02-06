const mongoose = require('mongoose');
const SyncState = require('./models/SyncState');
const Settings = require('./models/Settings');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/matlance');
        console.log('Connected.');

        const states = await SyncState.find({});
        console.log('SyncStates:', JSON.stringify(states, null, 2));

        const settings = await Settings.findOne({});
        console.log('Settings.mailboxSync:', JSON.stringify(settings?.mailboxSync, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};
run();
