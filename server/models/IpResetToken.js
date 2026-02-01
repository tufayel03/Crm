const mongoose = require('mongoose');

const IpResetTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('IpResetToken', IpResetTokenSchema);
