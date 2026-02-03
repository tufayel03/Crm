const mongoose = require('mongoose');

const ServiceSubscriptionSchema = new mongoose.Schema({
  id: String,
  type: String,
  price: Number,
  duration: Number,
  billingCycle: String,
  status: { type: String, enum: ['Active', 'Paused', 'Cancelled'] },
  startDate: Date
});

const ClientDocumentSchema = new mongoose.Schema({
  id: String,
  name: String,
  type: String,
  url: String, // S3 URL
  key: String,
  size: Number,
  uploadDate: Date,
  category: String
});

const ClientSchema = new mongoose.Schema({
  readableId: { type: Number, unique: true },
  uniqueId: { type: String, required: true, unique: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  companyName: { type: String, required: true },
  contactName: { type: String, required: true },
  email: { type: String },
  phone: String,
  country: String,
  accountManagerId: String,
  accountManagerName: String,
  services: [ServiceSubscriptionSchema],
  onboardedAt: Date,
  walletBalance: { type: Number, default: 0 },
  documents: [ClientDocumentSchema],
  invoices: [ClientDocumentSchema], // Storing generated invoice PDFs references
  notes: [{
    id: String,
    content: String,
    author: String,
    timestamp: Date
  }]
}, {
  timestamps: true
});

ClientSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Client', ClientSchema);

