const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, trim: true },
    designation: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    family: { type: String, default: '' },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, required: true, default: 'Pièce' },
    price: { type: Number, default: 0, min: 0 },
    minThreshold: { type: Number, default: 0, min: 0 },
    site: { type: String, default: '' },
    zone: { type: String, default: 'Zone A' },
    section: { type: String, default: '' },
    barcode: { type: String, default: '', index: true },
    image: { type: String, default: '' },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: 'system' },
    sourceBcId: { type: String },
    sourceBcRef: { type: String }
}, {
    timestamps: true,
    optimisticConcurrency: true
});

articleSchema.index({ designation: 'text', code: 'text', barcode: 'text' });
articleSchema.index({ category: 1, zone: 1, site: 1 });

module.exports = mongoose.model('Article', articleSchema);
