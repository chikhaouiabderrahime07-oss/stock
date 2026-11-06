const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  quantity: { type: Number, required: true },
  naftalBonRef: { type: String, default: '' },
  driver: { type: String, default: '' },
  pricePerLiter: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { _id: true, timestamps: false });

const distributionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fleet', default: null },
  vehicleName: { type: String, default: '' },
  quantity: { type: Number, required: true },
  km: { type: Number, default: 0 },
  driver: { type: String, default: '' },
  bon: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { _id: true, timestamps: false });

const citerneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 0
  },
  currentLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  fuelType: {
    type: String,
    enum: ['Gasoil', 'Essence', 'Autre'],
    default: 'Gasoil'
  },
  site: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  deliveries: [deliverySchema],
  distributions: [distributionSchema]
}, {
  timestamps: true
});

citerneSchema.index({ name: 1 });
citerneSchema.index({ site: 1 });

module.exports = mongoose.model('Citerne', citerneSchema);
