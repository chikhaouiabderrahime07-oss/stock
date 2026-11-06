const mongoose = require('mongoose');

const organeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  etat: { type: String, default: '' },
  observation: { type: String, default: '' }
}, { _id: true });

const pneumatiqueSchema = new mongoose.Schema({
  position: { type: String, required: true },
  marque: { type: String, default: '' },
  dimension: { type: String, default: '' },
  etat: { type: String, default: '' },
  observation: { type: String, default: '' }
}, { _id: true });

const bonTravailSchema = new mongoose.Schema({
  ref: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fleet',
    default: null
  },
  vehicleName: {
    type: String,
    default: ''
  },
  vehicleKm: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'closed'],
    default: 'open'
  },
  description: {
    type: String,
    default: ''
  },
  organes: [organeSchema],
  pneumatiques: [pneumatiqueSchema],
  travaux: {
    type: String,
    default: ''
  },
  recommendations: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    default: ''
  },
  closedAt: {
    type: Date,
    default: null
  },
  closedBy: {
    type: String,
    default: ''
  },
  pdfData: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

bonTravailSchema.index({ ref: 1 });
bonTravailSchema.index({ vehicleId: 1 });
bonTravailSchema.index({ status: 1 });
bonTravailSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BonTravail', bonTravailSchema);
