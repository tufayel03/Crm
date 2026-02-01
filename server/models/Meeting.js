const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  agenda: String,
  date: { type: Date, required: true },
  time: String,
  duration: { type: Number, default: 30 },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  leadName: String,
  type: { type: String, enum: ['Discovery', 'Demo', 'Negotiation', 'Check-in'], default: 'Discovery' },
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' },
  platform: { type: String, enum: ['Google Meet', 'Zoom', 'Phone', 'Matlance'], default: 'Google Meet' },
  link: String,
  reminderSent: { type: Boolean, default: false }
}, { timestamps: true });

MeetingSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Meeting', MeetingSchema);

