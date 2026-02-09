const mongoose = require('mongoose');

const UserSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userName: { type: String, default: '' },
  userEmail: { type: String, default: '' },
  userRole: { type: String, default: '' },
  device: { type: String, default: 'Unknown Device' },
  browser: { type: String, default: 'Unknown Browser' },
  os: { type: String, default: 'Unknown OS' },
  ip: { type: String, default: 'Unknown' },
  location: { type: String, default: 'Unknown' },
  coords: {
    lat: { type: Number },
    lng: { type: Number }
  },
  locationPermission: { type: String, enum: ['granted', 'prompt', 'denied', 'unknown'], default: 'unknown' },
  lastActive: { type: Date, default: Date.now, index: true },
  revokedAt: { type: Date, default: null, index: true }
}, { timestamps: true });

UserSessionSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('UserSession', UserSessionSchema);
