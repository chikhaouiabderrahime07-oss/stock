const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['superadmin', 'admin', 'magasinier', 'mag', 'gds', 'normal', 'chef_section', 'directeur'], default: 'normal' },
    department: { type: String, default: 'Direction Générale' },
    service: { type: String, default: '' },
    qualite: { type: String, default: 'Agent' },
    canDeductStock: { type: Boolean, default: false },
    gdsOption: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    avatar: { type: String }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = async function(candidate) {
    return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublic = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
