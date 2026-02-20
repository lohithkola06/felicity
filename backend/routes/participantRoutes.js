const express = require('express');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { sendWaitlistNotification } = require('../utils/email');

const router = express.Router();
router.use(auth, authorize('participant'));

// dashboard - upcoming events + history sorted into tabs
router.get('/dashboard', async (req, res) => {
    try {
        const regs = await Registration.find({ participant: req.user._id })
            .populate({ path: 'event', populate: { path: 'organizer', select: 'organizerName' } })
            .populate('team', 'name')
            .sort('-registeredAt');

        const now = new Date();
        const upcoming = [], normal = [], merchandise = [], completed = [], cancelled = [];

        for (const r of regs) {
            if (!r.event) continue;

            const entry = {
                registrationId: r._id,
                eventId: r.event._id,
                eventName: r.event.name,
                eventType: r.event.type,
                organizer: r.event.organizer?.organizerName || 'Unknown',
                startDate: r.event.startDate,
                endDate: r.event.endDate,
                status: r.status,
                ticketId: r.ticketId,
                teamName: r.team?.name || null,
            };

            // sort into buckets
            if (r.status === 'cancelled') cancelled.push(entry);
            else if (r.status === 'completed') completed.push(entry);
            else if (r.event.startDate && r.event.startDate > now) upcoming.push(entry);

            // type tabs (skip cancelled ones)
            if (r.status !== 'cancelled') {
                if (r.event.type === 'normal') normal.push(entry);
                else if (r.event.type === 'merchandise') merchandise.push(entry);
            }
        }

        res.json({ upcoming, history: { normal, merchandise, completed, cancelled } });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'failed to load dashboard' });
    }
});

// get my profile - populate followed clubs so the frontend can display them
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('followedOrganizers', 'organizerName category description');
        res.json({ user });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'failed to load profile' });
    }
});

// update profile - email and participantType cant be changed
router.put('/profile', async (req, res) => {
    try {
        const allowed = ['firstName', 'lastName', 'contactNumber', 'collegeName', 'interests'];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
        res.json({ user });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'failed to update profile' });
    }
});

// change password
router.put('/change-password', async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword)
            return res.status(400).json({ error: 'need both old and new password' });
        if (newPassword.length < 6)
            return res.status(400).json({ error: 'password too short, min 6 chars' });

        const user = await User.findById(req.user._id);
        const match = await user.comparePassword(oldPassword);
        if (!match) return res.status(400).json({ error: 'wrong current password' });

        user.password = newPassword;
        await user.save(); // pre-save hook hashes it
        res.json({ message: 'password changed' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'failed to change password' });
    }
});

// list all clubs/organizers
router.get('/clubs', async (req, res) => {
    try {
        const clubs = await User.find({ role: 'organizer' })
            .select('organizerName category description contactEmail');

        const myFollows = req.user.followedOrganizers || [];
        const result = clubs.map(c => ({
            ...c.toJSON(),
            isFollowing: myFollows.some(id => id.toString() === c._id.toString()),
        }));
        res.json(result);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'failed to fetch clubs' });
    }
});

// club detail page - info + their events
router.get('/clubs/:id', async (req, res) => {
    try {
        const club = await User.findOne({ _id: req.params.id, role: 'organizer' })
            .select('organizerName category description contactEmail');
        if (!club) return res.status(404).json({ error: 'club not found' });

        const now = new Date();
        const upcomingEvents = await Event.find({
            organizer: club._id,
            status: { $in: ['published', 'ongoing'] },
            startDate: { $gte: now },
        }).sort('startDate');

        const pastEvents = await Event.find({
            organizer: club._id,
            status: { $in: ['completed', 'closed'] },
        }).sort('-endDate');

        const isFollowing = (req.user.followedOrganizers || [])
            .some(id => id.toString() === club._id.toString());

        res.json({ club, upcomingEvents, pastEvents, isFollowing });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not load club' });
    }
});

// follow a club
router.post('/clubs/:id/follow', async (req, res) => {
    try {
        const club = await User.findOne({ _id: req.params.id, role: 'organizer' });
        if (!club) return res.status(404).json({ error: 'club not found' });

        const already = (req.user.followedOrganizers || [])
            .some(id => id.toString() === club._id.toString());
        if (already) return res.status(400).json({ error: 'already following' });

        await User.findByIdAndUpdate(req.user._id, { $addToSet: { followedOrganizers: club._id } });
        res.json({ message: `now following ${club.organizerName}` });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not follow' });
    }
});

// unfollow
router.post('/clubs/:id/unfollow', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { $pull: { followedOrganizers: req.params.id } });
        res.json({ message: 'unfollowed' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not unfollow' });
    }
});

// cancel registration (not allowed for merchandise orders)
router.post('/registrations/:id/cancel', async (req, res) => {
    try {
        const reg = await Registration.findOne({ _id: req.params.id, participant: req.user._id });
        if (!reg) return res.status(404).json({ error: 'registration not found' });
        if (reg.status === 'cancelled') return res.status(400).json({ error: 'already cancelled' });

        // Merchandise orders cannot be cancelled once placed
        const event = await Event.findById(reg.event);
        if (event && event.type === 'merchandise') {
            return res.status(400).json({ error: 'Merchandise orders cannot be cancelled once placed.' });
        }

        // mark cancelled
        reg.status = 'cancelled';
        await reg.save();

        // decrement event count
        if (event) {
            event.registrationCount = Math.max(0, event.registrationCount - 1);

            // check waitlist
            if (event.waitlist && event.waitlist.length > 0) {
                // notify first person
                const nextUser = event.waitlist.shift();
                const userToNotify = await User.findById(nextUser.user);
                if (userToNotify) {
                    sendWaitlistNotification(userToNotify.email, event.name, event._id).catch(() => { });
                }
            }
            await event.save();
        }

        res.json({ message: 'registration cancelled' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'cancellation failed' });
    }
});

module.exports = router;
