const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    matricule: { type: String, required: true, unique: true, trim: true },
    type: { type: String, default: '' },
    brand: { type: String, default: '' },
    model: { type: String, default: '' },
    family: { type: String, default: '' },
    year: { type: Number },
    engine: { type: String, default: '' },
    km: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'repair', 'inactive', 'scrapped'], default: 'active' },
    site: { type: String, default: '' },
    driver: { type: String, default: '' },
    lastOilChange: { type: Date },
    nextOilChangeKm: { type: Number },
    lastTechnicalVisit: { type: Date },
    nextTechnicalVisit: { type: Date },
    insuranceExpiry: { type: Date },
    notes: { type: String, default: '' },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
