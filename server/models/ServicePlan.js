const mongoose = require('mongoose');

const ServicePlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true },
  billingCycle: { type: String, enum: ['monthly', 'one-time'], default: 'monthly' },
  description: { type: String, default: '' },
  features: { type: [String], default: [] }
}, { timestamps: true });

ServicePlanSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('ServicePlan', ServicePlanSchema);
