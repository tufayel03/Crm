const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: String,
  quantity: Number,
  unitPrice: Number,
  amount: Number
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName: { type: String, required: true },
  amount: { type: Number, required: true },
  serviceType: { type: String, required: true },
  status: { type: String, enum: ['Paid', 'Due', 'Overdue'], default: 'Due' },
  date: { type: Date, default: Date.now },
  dueDate: Date,
  items: [InvoiceItemSchema]
}, { timestamps: true });

PaymentSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Payment', PaymentSchema);

