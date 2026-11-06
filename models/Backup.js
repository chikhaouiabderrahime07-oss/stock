const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  type: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  collections: {
    articles: { type: mongoose.Schema.Types.Mixed, default: [] },
    users: { type: mongoose.Schema.Types.Mixed, default: [] },
    orders: { type: mongoose.Schema.Types.Mixed, default: [] },
    decharges: { type: mongoose.Schema.Types.Mixed, default: [] },
    movements: { type: mongoose.Schema.Types.Mixed, default: [] },
    fleet: { type: mongoose.Schema.Types.Mixed, default: [] },
    citernes: { type: mongoose.Schema.Types.Mixed, default: [] },
    bonsTravail: { type: mongoose.Schema.Types.Mixed, default: [] },
    settings: { type: mongoose.Schema.Types.Mixed, default: [] }
  },
  sizeBytes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'in_progress'],
    default: 'completed'
  },
  error: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

backupSchema.index({ date: -1 });
backupSchema.index({ type: 1 });

module.exports = mongoose.model('Backup', backupSchema);
