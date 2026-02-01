const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  action: String,
  details: String,
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

