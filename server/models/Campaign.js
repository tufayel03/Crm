const mongoose = require('mongoose');
const { createTrackingId } = require('../utils/tracking');

const EmailQueueItemSchema = new mongoose.Schema({
  leadId: String,
  leadName: String,
  leadEmail: String,
  status: { type: String, enum: ['Pending', 'Processing', 'Sent', 'Failed'], default: 'Pending' },
  sentAt: Date,
  sentMessageId: String,
  sentBy: String,
  error: String,
  trackingId: { type: String, index: true },
  openedAt: Date,
  clickedAt: Date,
  repliedAt: Date,
  repliedMessageId: String,
  replyFrom: String,
  replySubject: String
}, { _id: false });

const CampaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  templateId: { type: String, required: true },
  templateName: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Queued', 'Scheduled', 'Sending', 'Paused', 'Completed'], default: 'Draft' },
  targetStatus: { type: String, default: 'All' },
  targetStatuses: { type: [String], default: [] },
  targetAgentId: { type: String, default: 'All' },
  targetAgentIds: { type: [String], default: [] },
  targetOutcome: { type: String, default: 'All' },
  targetOutcomes: { type: [String], default: [] },
  targetServiceStatus: { type: String, default: 'All' },
  targetServicePlan: { type: String, default: 'All' },
  totalRecipients: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  openCount: { type: Number, default: 0 },
  clickCount: { type: Number, default: 0 },
  replyCount: { type: Number, default: 0 },
  queue: [EmailQueueItemSchema],
  previewText: String,
  scheduledAt: Date,
  completedAt: Date
}, { timestamps: true });

CampaignSchema.pre('validate', function ensureUniqueQueueTrackingIds(next) {
  if (!Array.isArray(this.queue)) return next();

  const seen = new Set();
  for (const item of this.queue) {
    while (!item.trackingId || seen.has(item.trackingId)) {
      item.trackingId = createTrackingId();
    }
    seen.add(item.trackingId);
  }

  return next();
});

CampaignSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Campaign', CampaignSchema);
