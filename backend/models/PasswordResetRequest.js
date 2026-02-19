const mongoose = require('mongoose');

// organizer requests admin to reset their password
const resetRequestSchema = new mongoose.Schema({
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminNote: String,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedAt: Date,
    tempPassword: String, // set when approved, cleared after first login
}, { timestamps: true });

module.exports = mongoose.model('PasswordResetRequest', resetRequestSchema);
