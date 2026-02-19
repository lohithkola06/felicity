const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// all routes here need admin access
router.use(auth, authorize('admin'));

// POST /api/admin/create-organizer
// admin creates a new club/organizer account and gets the generated credentials back
router.post('/create-organizer', async (req, res) => {
    try {
        const { organizerName, category, description, contactEmail } = req.body;

        if (!organizerName || !category || !contactEmail) {
            return res.status(400).json({ error: 'organizerName, category and contactEmail are required' });
        }

        // Strict Email Validation: Organizers must be IIIT domain
        if (!contactEmail.endsWith('@iiit.ac.in')) {
            return res.status(400).json({ error: 'Organizer contact email must be an official @iiit.ac.in address.' });
        }

        // generate login email from the organizer name
        const loginEmail = organizerName.toLowerCase().replace(/\s+/g, '.') + '@fest.org';
        const loginPassword = crypto.randomBytes(8).toString('hex');

        // make sure this email isnt taken already
        const existing = await User.findOne({ email: loginEmail });
        if (existing) {
            return res.status(400).json({ error: `Email ${loginEmail} is already taken, try a different name` });
        }

        const organizer = new User({
            email: loginEmail,
            password: loginPassword,
            role: 'organizer',
            organizerName,
            category,
            description: description || '',
            contactEmail,
        });
        await organizer.save();

        // send back the credentials so admin can share them with the club
        res.status(201).json({
            message: 'Organizer created',
            credentials: {
                email: loginEmail,
                password: loginPassword,
            },
            organizer,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to create organizer' });
    }
});

// GET /api/admin/organizers - list all organizer accounts
router.get('/organizers', async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer' });
        res.json(organizers);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to fetch organizers' });
    }
});

// PATCH /api/admin/organizers/:id/archive
router.patch('/organizers/:id/archive', async (req, res) => {
    try {
        const organizer = await User.findOne({ _id: req.params.id, role: 'organizer' });
        if (!organizer) return res.status(404).json({ error: 'Organizer not found' });

        organizer.isArchived = !organizer.isArchived;
        await organizer.save();

        res.json({ message: organizer.isArchived ? 'Organizer archived' : 'Organizer unarchived', organizer });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to update organizer status' });
    }
});

// DELETE /api/admin/organizers/:id
router.delete('/organizers/:id', async (req, res) => {
    try {
        const organizer = await User.findOneAndDelete({
            _id: req.params.id,
            role: 'organizer',
        });

        if (!organizer) {
            return res.status(404).json({ error: 'Organizer not found' });
        }

        res.json({ message: 'Organizer deleted' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to delete organizer' });
    }
});

module.exports = router;
