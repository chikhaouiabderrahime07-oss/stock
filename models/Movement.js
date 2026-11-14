const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
    articleCode: { type: String },
    articleDesignation: { type: String },
    type: { type: String, enum: ['Entrée', 'Sortie', 'Ajustement', 'Transfert'], required: true },
    quantity: { type: Number, required: true },
    previousQty: { type: Number },
    newQty: { type: Number },
    reason: { type: String, default: '' },
    reference: { type: String, default: '' },
    user: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    dechargeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Decharge' }
}, { timestamps: true });

movementSchema.index({ createdAt: -1 });
movementSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Movement', movementSchema);
