const mongoose = require('mongoose');

// team chat messages for hackathon teams
const chatMessageSchema = new mongoose.Schema({
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

chatMessageSchema.index({ team: 1, sentAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
