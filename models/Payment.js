const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bcId: { type: String, default: '' },
  paymentRef: { type: String, default: '' },
  requestDate: { type: String, default: '' },
  paidDate: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  mode: { type: String, default: 'virement' },
  transactionRef: { type: String, default: '' },
  status: { type: String, default: 'programme' },
  notes: { type: String, default: '' },
  beneficiary: { type: String, default: '' },
  department: { type: String, default: '' },
  natureExpense: { type: String, default: '' },
  referenceDocs: { type: String, default: '' },
  linkedBcRefs: { type: [String], default: [] },
  linkedBcIds: { type: [String], default: [] }
}, { timestamps: true, minimize: false });

paymentSchema.index({ paymentRef: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
