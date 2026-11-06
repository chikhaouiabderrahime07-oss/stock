const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global'
  },
  stockZones: {
    type: [String],
    default: []
  },
  stockSites: {
    type: [{
      name: { type: String, required: true },
      zones: { type: [String], default: [] }
    }],
    default: []
  },
  stockSections: {
    type: [String],
    default: []
  },
  articleCategories: {
    type: [String],
    default: ['Pièces de rechange', 'Consommables', 'Outillage', 'Lubrifiants', 'Électricité', 'Pneumatiques']
  },
  articleFamilies: {
    type: [String],
    default: []
  },
  units: {
    type: [String],
    default: ['Unité', 'Kg', 'Litre', 'Mètre', 'Boîte', 'Paire', 'Jeu', 'Rouleau', 'Sac', 'Bidon']
  },
  departments: {
    type: [String],
    default: []
  },
  services: {
    type: [String],
    default: []
  },
  beneficiaries: {
    type: [String],
    default: []
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
    default: ''
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
  timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);
