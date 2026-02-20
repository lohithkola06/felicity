const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['participant', 'organizer', 'admin'],
        required: true,
    },

    // participant fields
    firstName: String,
    lastName: String,
    participantType: {
        type: String,
        enum: ['iiit', 'non-iiit'],
    },
    collegeName: String,
    contactNumber: String,
    interests: [String],
    followedOrganizers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],

    // organizer fields
    organizerName: String,
    category: { type: String, enum: ['Technical', 'Cultural', 'Sports', 'Other'] },
    description: String,
    contactEmail: String,
    contactNumber: String,
    discordWebhook: String,
    isArchived: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// hash password before saving to db
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// method to check password during login
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// dont send password in responses
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
