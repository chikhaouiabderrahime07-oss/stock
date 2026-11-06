const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global'
  },
  stockZones: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  stockSites: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  stockSections: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  articleCategories: {
    type: [String],
    default: ['Bureautique', 'Pièces de rechange', 'Consommables', 'Lubrifiant', 'Pneus', 'Filtres', 'Divers']
  },
  articleFamilies: {
    type: [String],
    default: []
  },
  units: {
    type: [String],
    default: ['Pièce', 'Kg', 'Litre', 'Mètre', 'Boîte', 'Rouleau', 'Bidon', 'Paquet', 'Unité', 'Bloc', 'Lot']
  },
  departments: {
    type: [String],
    default: ['Direction Générale', 'Approvisionnement', 'Transport']
  },
  services: {
    type: [String],
    default: []
  },
  beneficiaries: {
    type: [String],
    default: []
  },
  materialFamilies: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  categoryPrefixes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  companyLogoLeft: {
    type: String,
    default: ''
  },
  companyLogoRight: {
    type: String,
    default: ''
  },
  companyName: {
    type: String,
    default: 'SPA DOUROUB ELDJAZAIR'
  },
  gdsEnabled: {
    type: Boolean,
    default: false
  },
  lowStockAlertEnabled: {
    type: Boolean,
    default: true
  },
  defaultSite: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  minimize: false
});

module.exports = mongoose.model('Setting', settingSchema);
