const mongoose = require('mongoose');

const bcRecordSchema = new mongoose.Schema({
  ref: { type: String, default: '' },
  daRef: { type: String, default: '' },
  daStatus: { type: String, default: 'draft' },
  daValidatedAt: { type: String, default: '' },
  date: { type: String, default: '' },
  supplierId: { type: String, default: null },
  supplierName: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  amountHT: { type: Number, default: 0 },
  amountTTC: { type: Number, default: 0 },
  currency: { type: String, default: 'DZD' },
  type: { type: String, default: 'achat' },
  description: { type: String, default: '' },
  status: { type: String, default: 'importe' },
  promisedDate: { type: String, default: '' },
  goodsReceivedDate: { type: String, default: '' },
  serviceDoneDate: { type: String, default: '' },
  requester: { type: String, default: '' },
  paymentTerms: { type: String, default: '' },
  comments: { type: String, default: '' },
  notes: { type: String, default: '' },
  importedFromBC: { type: Boolean, default: false },
  sourceFile: { type: String, default: '' },
  lineItems: { type: mongoose.Schema.Types.Mixed, default: [] },
  lineCount: { type: Number, default: 0 },
  totalQty: { type: Number, default: 0 }
}, { timestamps: true, minimize: false });

bcRecordSchema.index({ ref: 1 });
bcRecordSchema.index({ supplierName: 1 });
bcRecordSchema.index({ date: -1 });

module.exports = mongoose.model('BcRecord', bcRecordSchema);
