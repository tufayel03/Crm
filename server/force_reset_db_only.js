const mongoose = require('mongoose');
const SyncState = require('./models/SyncState');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/matlance');
        console.log('Connected.');

        // FORCE RESET ONLY
        console.log('--- RESETTING SYNC STATE ---');
        await SyncState.updateMany({}, { $set: { lastUid: 0, status: 'idle', lastError: null } });
        console.log('All SyncStates reset to lastUid: 0, status: idle');

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};
run();
