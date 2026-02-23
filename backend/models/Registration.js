const mongoose = require('mongoose');

// tracks who signed up for what
const registrationSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['registered', 'pending_approval', 'approved', 'rejected', 'cancelled', 'completed'], default: 'registered' },

    formResponses: mongoose.Schema.Types.Mixed, // answers to custom form fields
    merchandiseSelections: [{ // what they picked for merch events (cart array)
        itemName: String,
        size: String,
        color: String,
        variant: String,
        quantity: { type: Number, default: 1 },
    }],
    rejectionComment: { type: String }, // filled by organizer if rejected

    ticketId: { type: String },
    qrCode: String, // base64 data url
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    registeredAt: { type: Date, default: Date.now },

    // attendance tracking (qr scanner feature)
    attended: { type: Boolean, default: false },
    attendedAt: Date,

    // team registration ref
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
}, { timestamps: true });

// cant register twice for same event (handled in logic for normal events now)
// registrationSchema.index({ event: 1, participant: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
