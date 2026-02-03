const mongoose = require('mongoose');

const EmailAccountSchema = new mongoose.Schema({
  email: String,
  label: String,
  provider: String,
  smtpHost: String,
  smtpPort: Number,
  username: String,
  password: String,
  imapHost: String,
  imapPort: Number,
  imapSecure: { type: Boolean, default: true },
  imapStartTLS: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  useForCampaigns: { type: Boolean, default: false },
  useForClients: { type: Boolean, default: false },
  sentCount: { type: Number, default: 0 }
}, { _id: false });

const SettingsSchema = new mongoose.Schema({
  emailAccounts: [EmailAccountSchema],
  generalSettings: {
    companyName: String,
    workspaceSlug: String,
    supportEmail: String,
    companyAddress: String,
    companyPhone: String,
    companyWebsite: String,
    publicTrackingUrl: String,
    timezone: String,
    currency: String,
    dateFormat: String,
    logoUrl: String,
    systemWalletBalance: { type: Number, default: 0 },
    invoiceUseLogo: { type: Boolean, default: true },
    invoiceFooterText: String
  },
  systemTemplates: {
    invoice: { subject: String, body: String },
    meetingSchedule: { subject: String, body: String },
    meetingUpdate: { subject: String, body: String },
    meetingCancel: { subject: String, body: String },
    passwordReset: { subject: String, body: String }
  },
  ipRules: {
    mode: { type: String, enum: ['none', 'whitelist', 'blacklist'], default: 'none' },
    whitelist: [String],
    blacklist: [String]
  },
  campaignLimits: {
    hourly: { type: Number, default: 50 },
    daily: { type: Number, default: 500 }
  },
  leadStatuses: [String],
  leadOutcomes: [String],
  permissions: mongoose.Schema.Types.Mixed
}, { timestamps: true });

SettingsSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Settings', SettingsSchema);

