const mongoose = require('mongoose');

const dechargeItemSchema = new mongoose.Schema({
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
    articleCode: String,
    designation: String,
    quantity: { type: Number, required: true },
    unit: String
}, { _id: true });

const dechargeSchema = new mongoose.Schema({
    ref: { type: String, required: true, unique: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    orderRef: { type: String },
    type: { type: String, enum: ['BSM', 'BL', 'BR', 'Direct'], default: 'BSM' },
    typeDoc: { type: String, enum: ['bsm', 'decharge', 'mixte'], default: 'bsm' },
    status: { type: String, enum: ['pending', 'served', 'signed', 'cancelled'], default: 'pending' },
    date: { type: Date, default: Date.now },
    dateDecharge: { type: Date, default: Date.now },
    items: [dechargeItemSchema],
    beneficiary: { type: String },
    department: { type: String },
    vehicleName: { type: String },
    notes: { type: String, default: '' },
    createdBy: { type: String, required: true },
    servedBy: { type: String },
    servedAt: { type: Date, default: Date.now },
    signature: { type: String },
    signedAt: { type: Date }
}, { timestamps: true, strict: false });

dechargeSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Decharge', dechargeSchema);
