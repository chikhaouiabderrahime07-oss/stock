const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  id: { type: String },
  paymentRef: { type: String, default: '' },
  bcId: { type: String, default: '' },
  bcRef: { type: String, default: '' },
  linkedBcIds: { type: [String], default: [] },
  linkedBcRefs: { type: [String], default: [] },
  supplier: { type: String, default: '' },
  beneficiary: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  amountHT: { type: Number, default: 0 },
  amountTTC: { type: Number, default: 0 },
  status: { type: String, default: 'en_attente' },
  requestDate: { type: String, default: '' },
  paidDate: { type: String, default: '' },
  paymentMode: { type: String, default: '' },
  mode: { type: String, default: 'virement' },
  transactionRef: { type: String, default: '' },
  nature: { type: String, default: '' },
  natureExpense: { type: String, default: '' },
  objet: { type: String, default: '' },
  description: { type: String, default: '' },
  notes: { type: String, default: '' },
  department: { type: String, default: '' },
  referenceDocs: { type: String, default: '' },
  isDirect: { type: Boolean, default: false },
  sourceFile: { type: String, default: '' },
  directCategory: { type: String, default: '' },
  aiConfidence: { type: Number, default: 0 },
  aiMatchReason: { type: String, default: '' },
  ignoredBcIds: { type: [String], default: [] },
  delayBcToDpDays: { type: Number, default: 0 },
  totalPaymentDelayDays: { type: Number, default: 0 },
  delayStatus: { type: String, default: 'normal' },
  manualLink: { type: Boolean, default: false }
}, { timestamps: true, id: false, strict: false, minimize: false });

paymentSchema.index({ paymentRef: 1 });
paymentSchema.index({ id: 1 });
paymentSchema.index({ bcId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
