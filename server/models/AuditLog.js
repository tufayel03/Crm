const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  userEmail: String,
  action: String,
  details: String,
  module: String,
  severity: { type: String, default: 'info' },
  targetType: String,
  targetId: String,
  method: String,
  path: String,
  ip: String,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

AuditLogSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);

