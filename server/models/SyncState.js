const mongoose = require('mongoose');

const SyncStateSchema = new mongoose.Schema({
    accountId: { type: String, required: true, unique: true }, // We will use the email address as the unique ID
    lastUid: { type: Number, default: 0 },
    highestModSeq: { type: String }, // For CONDSTORE/QRESYNC if we supported it, but placeholder for now
    lastSyncAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['idle', 'syncing', 'error'], default: 'idle' },
    lastError: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SyncState', SyncStateSchema);
