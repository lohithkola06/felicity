const express = require('express');
const Team = require('../models/Team');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const generateTicket = require('../utils/generateTicket');

const router = express.Router();

// create a team for a normal event
router.post('/:eventId/create', auth, authorize('participant'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) return res.status(404).json({ error: 'event not found' });
        if (event.type !== 'normal') return res.status(400).json({ error: 'teams only for normal events' });

        // check if already leading a team for this event
        const existing = await Team.findOne({ event: event._id, leader: req.user._id });
        if (existing) return res.status(400).json({ error: 'you already have a team for this event' });

        const { name, memberEmails, maxSize } = req.body;
        if (!name) return res.status(400).json({ error: 'team name required' });

        // look up invited members
        const members = [];
        if (memberEmails?.length) {
            for (const email of memberEmails) {
                const user = await User.findOne({ email, role: 'participant' });
                members.push({
                    user: user?._id || null,
                    email,
                    status: 'pending',
                });
            }
        }

        const team = await Team.create({
            event: event._id,
            name,
            leader: req.user._id,
            members,
            maxSize: maxSize || 4,
        });

        res.status(201).json(team);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'you already have a team' });
        console.log(err);
        res.status(500).json({ error: 'could not create team' });
    }
});

// get my teams (as leader or member)
router.get('/my-teams', auth, authorize('participant'), async (req, res) => {
    try {
        const asLeader = await Team.find({ leader: req.user._id })
            .populate('event', 'name status startDate')
            .populate('leader', 'firstName lastName email')
            .populate('members.user', 'firstName lastName email');

        const asMember = await Team.find({ 'members.user': req.user._id })
            .populate('event', 'name status startDate')
            .populate('leader', 'firstName lastName email')
            .populate('members.user', 'firstName lastName email');

        // merge and deduplicate
        const allTeams = [...asLeader];
        for (const t of asMember) {
            if (!allTeams.find(x => x._id.equals(t._id))) allTeams.push(t);
        }

        res.json(allTeams);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not fetch teams' });
    }
});

// get team detail
router.get('/:teamId', auth, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId)
            .populate('event', 'name status startDate type')
            .populate('leader', 'firstName lastName email')
            .populate('members.user', 'firstName lastName email');
        if (!team) return res.status(404).json({ error: 'team not found' });
        res.json(team);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not fetch team' });
    }
});

// accept a team invite
router.post('/:teamId/accept', auth, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId);
        if (!team) return res.status(404).json({ error: 'team not found' });

        const member = team.members.find(m =>
            (m.user && m.user.equals(req.user._id)) ||
            m.email === req.user.email
        );
        if (!member) return res.status(400).json({ error: 'youre not invited to this team' });
        if (member.status === 'accepted') return res.status(400).json({ error: 'already accepted' });

        member.status = 'accepted';
        if (!member.user) member.user = req.user._id;

        // check if all members accepted -> team is ready
        const allAccepted = team.members.every(m => m.status === 'accepted');
        if (allAccepted) team.status = 'ready';

        await team.save();
        res.json(team);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not accept invite' });
    }
});

// decline a team invite
router.post('/:teamId/decline', auth, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId);
        if (!team) return res.status(404).json({ error: 'team not found' });

        const member = team.members.find(m =>
            (m.user && m.user.equals(req.user._id)) ||
            m.email === req.user.email
        );
        if (!member) return res.status(400).json({ error: 'youre not invited' });

        member.status = 'declined';
        await team.save();
        res.json({ message: 'declined' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not decline' });
    }
});

// register the team (leader only, all must have accepted)
router.post('/:teamId/register', auth, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId).populate('event');
        if (!team) return res.status(404).json({ error: 'team not found' });
        if (!team.leader.equals(req.user._id)) return res.status(403).json({ error: 'only leader can register the team' });
        if (team.status === 'registered') return res.status(400).json({ error: 'team already registered' });

        const pending = team.members.filter(m => m.status !== 'accepted');
        if (pending.length > 0) return res.status(400).json({ error: 'not all members have accepted yet' });

        const event = team.event;
        if (event.status !== 'published' && event.status !== 'ongoing')
            return res.status(400).json({ error: 'registrations arent open' });

        // register all team members (leader + members)
        const allUsers = [team.leader, ...team.members.map(m => m.user)];
        const registrations = [];

        for (const userId of allUsers) {
            const user = await User.findById(userId);
            if (!user) continue;

            const already = await Registration.findOne({ event: event._id, participant: userId });
            if (already) continue;

            const { ticketId, qrCode } = await generateTicket(event.name, user.email);
            const reg = await Registration.create({
                event: event._id,
                participant: userId,
                team: team._id,
                ticketId, qrCode,
                paymentStatus: event.registrationFee > 0 ? 'pending' : 'paid',
            });
            registrations.push(reg);
        }

        event.registrationCount += registrations.length;
        await event.save();

        team.status = 'registered';
        await team.save();

        res.json({ message: 'team registered!', registrations: registrations.length });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'team registration failed' });
    }
});

// disband team (leader only)
router.delete('/:teamId', auth, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findOne({ _id: req.params.teamId, leader: req.user._id });
        if (!team) return res.status(404).json({ error: 'team not found or not leader' });
        if (team.status === 'registered') return res.status(400).json({ error: 'cant disband a registered team' });

        await Team.deleteOne({ _id: team._id });
        res.json({ message: 'team disbanded' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not disband team' });
    }
});

module.exports = router;
