const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    // We store user ID to prevent multiple submissions per user per event,
    // but the API will not expose this to organizers to maintain anonymity.
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 500
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure one review per user per event
feedbackSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
