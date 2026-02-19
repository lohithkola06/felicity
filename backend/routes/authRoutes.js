const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { verifyRecaptcha } = require('../middleware/captcha');

const router = express.Router();

// Helper function to generate a JWT token for a user
// This token includes their ID and Role so we can easily check permissions later
function signToken(user) {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // Users stay logged in for a week
    );
}

// -------------------------------------------------------------------------
// POST /api/auth/register
// -------------------------------------------------------------------------
// This endpoint is for new participants (students) to sign up.
// Organizers are created by the Admin, not here.
router.post('/register', verifyRecaptcha, async (req, res) => {
    try {
        const { firstName, lastName, email, password, participantType, collegeName, contactNumber } = req.body;

        // Basic validation: Ensure all fields are present
        if (!firstName || !lastName || !email || !password || !participantType) {
            return res.status(400).json({ error: 'Please provide all required fields, including your name and email.' });
        }

        // Specific validation for IIIT Students
        // We enforce the use of the institute email to automate verification
        if (participantType === 'iiit') {
            if (!email.match(/@(students\.)?iiit\.ac\.in$/i)) {
                return res.status(400).json({ error: 'To register as an IIIT student, you must use your @iiit.ac.in email address.' });
            }
        }

        // Check if a user with this email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Note: This email is already registered. Please try logging in instead.' });
        }

        // Create the new participant
        const user = new User({
            firstName,
            lastName,
            email,
            password,
            participantType,
            // If they are IIIT, we know the college name. Otherwise, use what they typed.
            collegeName: participantType === 'iiit' ? 'IIIT Hyderabad' : collegeName,
            contactNumber,
            role: 'participant',
        });
        await user.save();

        // Generate a token so they are logged in immediately
        const token = signToken(user);
        res.status(201).json({ token, user });

    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Sorry, we encountered an issue while registering you. Please try again later.' });
    }
});

// -------------------------------------------------------------------------
// POST /api/auth/login
// -------------------------------------------------------------------------
// Standard login for all users (Participants, Organizers, Admin)
router.post('/login', verifyRecaptcha, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please enter both your email and password.' });
        }

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'We could not find an account with that email.' });
        }

        // Check if the account has been disabled/archived by an admin
        if (user.isArchived) {
            return res.status(403).json({ error: 'This account has been deactivated. Please contact the administrators for assistance.' });
        }

        // Validate the password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect password. Please try again.' });
        }

        // Login successful, send back the token
        const token = signToken(user);
        res.json({ token, user });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'An unexpected error occurred during login.' });
    }
});

// -------------------------------------------------------------------------
// GET /api/auth/me
// -------------------------------------------------------------------------
// Returns the profile of the currently logged-in user.
// Used by the frontend to persist the user session on visual refresh.
router.get('/me', auth, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
