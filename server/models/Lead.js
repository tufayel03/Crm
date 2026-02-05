const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  id: String,
  content: String,
  author: String,
  timestamp: { type: Date, default: Date.now }
});

const LeadSchema = new mongoose.Schema({
  readableId: { type: Number, unique: true }, // Ideally handled by a counter collection
  shortId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  profession: { type: String },
  email: { type: String },
  phone: { type: String },
  country: { type: String },
  status: { type: String, default: 'New' },
  assignedAgentId: { type: String },
  assignedAgentName: { type: String },
  isRevealed: { type: Boolean, default: false },
  notes: [NoteSchema],
  source: String,
}, {
  timestamps: true
});

LeadSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Lead', LeadSchema);

