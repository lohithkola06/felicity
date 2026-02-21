const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// all routes here need admin access
router.use(auth, authorize('admin'));

// POST /api/admin/create-organizer
// admin creates a new club/organizer account
// System auto-generates BOTH login email and password; admin receives them to share.
router.post('/create-organizer', async (req, res) => {
    try {
        const { organizerName, category, description } = req.body;

        if (!organizerName || !category) {
            return res.status(400).json({ error: 'Organizer name and category are required.' });
        }

        // Auto-generate login email from the club/organizer name
        // e.g. "Tech Club" → "tech.club@iiit.ac.in"
        const baseLocal = organizerName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')  // remove special chars
            .replace(/\s+/g, '.');          // spaces → dots
        let generatedEmail = `${baseLocal}@iiit.ac.in`;

        // If that email already exists, append a numeric suffix
        let suffix = 1;
        while (await User.findOne({ email: generatedEmail })) {
            generatedEmail = `${baseLocal}${suffix}@iiit.ac.in`;
            suffix++;
        }

        // Auto-generate a secure password
        const generatedPassword = crypto.randomBytes(10).toString('hex');

        const organizer = new User({
            email: generatedEmail,
            password: generatedPassword,
            role: 'organizer',
            organizerName,
            category,
            description: description || '',
            contactEmail: generatedEmail,
        });
        await organizer.save();

        res.status(201).json({
            message: 'Organizer created successfully',
            organizer,
            credentials: {
                email: generatedEmail,
                password: generatedPassword,
            },
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
// When an organizer is permanently deleted, all associated data must go with them:
// their events, registrations on those events, teams, chat messages, and feedback.
router.delete('/organizers/:id', async (req, res) => {
    try {
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');
        const Team = require('../models/Team');
        const ChatMessage = require('../models/ChatMessage');
        const Feedback = require('../models/Feedback');

        const organizer = await User.findOne({
            _id: req.params.id,
            role: 'organizer',
        });

        if (!organizer) {
            return res.status(404).json({ error: 'Organizer not found' });
        }

        // Find all events created by this organizer
        const orgEvents = await Event.find({ organizer: organizer._id });
        const eventIds = orgEvents.map(e => e._id);

        // Cascade: remove all registrations tied to those events
        await Registration.deleteMany({ event: { $in: eventIds } });

        // Cascade: remove teams that were formed for those events
        await Team.deleteMany({ event: { $in: eventIds } });

        // Cascade: remove chat messages from those teams/events
        await ChatMessage.deleteMany({ event: { $in: eventIds } });

        // Cascade: remove feedback submitted for those events
        await Feedback.deleteMany({ event: { $in: eventIds } });

        // Remove the events themselves
        await Event.deleteMany({ organizer: organizer._id });

        // Finally, remove the organizer account
        await User.findByIdAndDelete(organizer._id);

        res.json({
            message: 'Organizer and all associated data deleted successfully',
            deletedEvents: eventIds.length,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to delete organizer' });
    }
});

// TEMPORARY: DELETE /api/admin/dev-reset
router.delete('/dev-reset', async (req, res) => {
    try {
        const Event = require('../models/Event');
        const Registration = require('../models/Registration');
        const Team = require('../models/Team');
        const ChatMessage = require('../models/ChatMessage');
        const Feedback = require('../models/Feedback');

        const eventsResult = await Event.deleteMany({});
        const regsResult = await Registration.deleteMany({});
        const teamsResult = await Team.deleteMany({});
        const chatsResult = await ChatMessage.deleteMany({});
        const feedbackResult = await Feedback.deleteMany({});
        const usersResult = await User.deleteMany({ role: { $ne: 'admin' } });

        res.json({
            message: 'Database cleared completely.',
            deleted: {
                events: eventsResult.deletedCount,
                registrations: regsResult.deletedCount,
                teams: teamsResult.deletedCount,
                chats: chatsResult.deletedCount,
                feedback: feedbackResult.deletedCount,
                users: usersResult.deletedCount
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to clear database' });
    }
});

module.exports = router;
