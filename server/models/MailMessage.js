const mongoose = require('mongoose');

const MailAttachmentSchema = new mongoose.Schema({
  name: String,
  size: String
}, { _id: false });

const MailMessageSchema = new mongoose.Schema({
  accountId: { type: String, index: true },
  accountEmail: String,
  folder: { type: String, default: 'INBOX' },
  imapUid: { type: Number, index: true },
  clientRequestId: { type: String, sparse: true, unique: true },
  messageId: String,
  inReplyTo: String,
  references: { type: [String], default: [] },
  threadId: { type: String, index: true },
  from: String,
  fromName: String,
  to: String,
  cc: String,
  subject: String,
  body: String,
  timestamp: Date,
  isRead: Boolean,
  isStarred: Boolean,
  labels: { type: [String], default: [] },
  attachments: [MailAttachmentSchema],
  trackingId: { type: String, sparse: true, unique: true }, // For open tracking
  openedAt: Date
}, { timestamps: true });

MailMessageSchema.index(
  { accountId: 1, imapUid: 1 },
  {
    unique: true,
    partialFilterExpression: { imapUid: { $type: 'number' } }
  }
);

MailMessageSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('MailMessage', MailMessageSchema);
