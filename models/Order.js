const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
    articleCode: String,
    designation: String,
    quantity: { type: Number, required: true, min: 1 },
    unit: String,
    motif: { type: String, default: '' },
    served: { type: Boolean, default: false },
    servedQty: { type: Number, default: 0 }
}, { _id: true });

const orderSchema = new mongoose.Schema({
    ref: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'approved', 'served', 'partial', 'rejected', 'cancelled'], default: 'pending' },
    items: [orderItemSchema],
    vehicleId: { type: String },
    vehicleName: { type: String },
    btRef: { type: String },
    department: { type: String },
    beneficiary: { type: String },
    notes: { type: String, default: '' },
    createdBy: { type: String, required: true },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    servedBy: { type: String },
    servedAt: { type: Date },
    qrCode: { type: String },
    signature: { type: String }
}, { timestamps: true });

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdById: 1 });

module.exports = mongoose.model('Order', orderSchema);
