const mongoose = require('mongoose');

// event team - leader creates, invites members, all must accept
const teamSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email: String, // invited by email
        status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
        formResponses: mongoose.Schema.Types.Mixed, // member's answers to custom form fields
    }],
    status: { type: String, enum: ['forming', 'ready', 'registered'], default: 'forming' },
    maxSize: { type: Number, default: 4 },
    formResponses: mongoose.Schema.Types.Mixed, // Leader's answers to custom form fields
    paymentProof: { type: String }, // Leader's uploaded payment proof for the team
}, { timestamps: true });

// one team per event per leader
teamSchema.index({ event: 1, leader: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
