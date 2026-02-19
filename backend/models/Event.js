const mongoose = require('mongoose');

// event schema - handles both normal events and merch
const eventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['normal', 'merchandise'], required: true },
    status: { type: String, enum: ['draft', 'published', 'ongoing', 'completed', 'closed'], default: 'draft' },
    eligibility: { type: String, default: 'all' }, // 'all' or 'iiit-only'

    registrationDeadline: Date,
    startDate: Date,
    endDate: Date,
    registrationLimit: { type: Number, default: 0 }, // 0 means no cap
    registrationFee: { type: Number, default: 0 },
    registrationCount: { type: Number, default: 0 },
    tags: [String],
    venue: String, // physical location
    platform: String, // online link if virtual

    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // normal events have a dynamic form builder
    customForm: [{
        label: String,
        fieldType: { type: String, enum: ['text', 'textarea', 'dropdown', 'checkbox', 'file'] },
        required: { type: Boolean, default: false },
        options: [String], // dropdown/checkbox choices
    }],
    formLocked: { type: Boolean, default: false }, // locks after first signup

    // merch event stuff
    items: [{
        name: String,
        size: String,
        color: String,
        variant: String,
        stock: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
    }],
    purchaseLimitPerUser: { type: Number, default: 1 },
    waitlist: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requestedAt: { type: Date, default: Date.now }
    }],
}, { timestamps: true });

// for searching events by name/desc/tags
eventSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Event', eventSchema);
