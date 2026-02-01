const mongoose = require('mongoose');

const EmailTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  htmlContent: { type: String, default: '' },
  designJson: String,
  createdBy: { type: String, default: 'System' }
}, { timestamps: true });

EmailTemplateSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);

