const express = require('express');
const Team = require('../models/Team');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { sendTicketEmail } = require('../utils/email');
const generateTicket = require('../utils/generateTicket');

const router = express.Router();

// create a team for a normal event
router.post('/:eventId/create', auth, authorize('participant'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) return res.status(404).json({ error: 'event not found' });
        if (event.type !== 'normal') return res.status(400).json({ error: 'teams only for normal events' });

        // check if already in a team for this event (as leader or accepted member)
        const inATeam = await Team.findOne({
            event: event._id,
            $or: [
                { leader: req.user._id },
                { 'members.user': req.user._id, 'members.status': 'accepted' }
            ]
        });
        if (inATeam) {
            return res.status(400).json({ error: 'You are already part of a team for this event.' });
        }

        const { name, memberEmails, maxSize, formResponses } = req.body;
        if (!name) return res.status(400).json({ error: 'team name required' });

        // Ensure email matches aren't self
        if (memberEmails && memberEmails.includes(req.user.email)) {
            return res.status(400).json({ error: 'cannot invite yourself' });
        }

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

        const team = new Team({
            event: event._id,
            name,
            leader: req.user._id,
            members,
            maxSize: maxSize || 4, // Fallback, though we should use event limits if available
            formResponses: formResponses || {},
        });
        await team.save();

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
            .populate('event', 'name status startDate customForm registrationDeadline')
            .populate('leader', 'firstName lastName email')
            .populate('members.user', 'firstName lastName email');

        const asMember = await Team.find({ 'members.user': req.user._id })
            .populate('event', 'name status startDate customForm registrationDeadline')
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

        // block if already in another team for this event
        const inAnother = await Team.findOne({
            event: team.event,
            _id: { $ne: team._id },
            $or: [
                { leader: req.user._id },
                { 'members.user': req.user._id, 'members.status': 'accepted' }
            ]
        });
        if (inAnother) {
            return res.status(400).json({ error: 'You are already leading or part of another team for this event. Leave/Disband that team first.' });
        }

        member.status = 'accepted';
        member.formResponses = req.body.formResponses || {};
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

// update member/leader responses
router.put('/:teamId/responses', auth, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId).populate('event');
        if (!team) return res.status(404).json({ error: 'team not found' });

        const event = team.event;
        if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ error: 'Registration deadline has passed. You cannot edit responses anymore.' });
        }

        const { formResponses } = req.body;
        if (!formResponses) return res.status(400).json({ error: 'Form responses required' });

        let updated = false;
        if (team.leader.equals(req.user._id)) {
            team.formResponses = formResponses;
            updated = true;
        } else {
            const member = team.members.find(m => m.user && m.user.equals(req.user._id));
            if (member) {
                member.formResponses = formResponses;
                updated = true;
            }
        }

        if (!updated) {
            return res.status(403).json({ error: 'You are not a member of this team' });
        }

        await team.save();

        // If registered, also update the Registration document
        if (team.status === 'registered') {
            await Registration.findOneAndUpdate(
                { event: event._id, participant: req.user._id },
                { formResponses }
            );
        }

        res.json({ message: 'Responses updated successfully', team });
    } catch (err) {
        console.error('Update Responses Error:', err);
        res.status(500).json({ error: 'Failed to update responses' });
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
        const registrations = [];

        // register leader
        const leaderAlready = await Registration.findOne({ event: event._id, participant: team.leader });
        if (!leaderAlready) {
            const { ticketId, qrCode } = await generateTicket(event.name, req.user.email);
            const reg = await Registration.create({
                event: event._id,
                participant: team.leader,
                team: team._id,
                ticketId, qrCode,
                paymentStatus: event.registrationFee > 0 ? 'pending' : 'paid',
                formResponses: team.formResponses || {},
            });
            registrations.push(reg);
            await sendTicketEmail(req.user.email, event.name, ticketId, qrCode);
        }

        // register members
        for (const m of team.members) {
            if (!m.user) continue;
            const user = await User.findById(m.user);
            if (!user) continue;

            const already = await Registration.findOne({ event: event._id, participant: m.user });
            if (already) continue;

            const { ticketId, qrCode } = await generateTicket(event.name, user.email);
            const reg = await Registration.create({
                event: event._id,
                participant: m.user,
                team: team._id,
                ticketId, qrCode,
                paymentStatus: event.registrationFee > 0 ? 'pending' : 'paid',
                formResponses: m.formResponses || {},
            });
            registrations.push(reg);
            await sendTicketEmail(user.email, event.name, ticketId, qrCode);
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

// invite a new member to an existing team (leader only)
router.post('/:teamId/invite', auth, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findOne({ _id: req.params.teamId, leader: req.user._id });
        if (!team) return res.status(404).json({ error: 'team not found or not leader' });
        if (team.status === 'registered') return res.status(400).json({ error: 'cant invite to a registered team' });

        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'email is required' });
        if (email === req.user.email) return res.status(400).json({ error: 'cannot invite yourself' });

        if (team.members.length >= team.maxSize - 1) { // -1 for leader
            return res.status(400).json({ error: 'team is full' });
        }

        if (team.members.find(m => m.email === email)) {
            return res.status(400).json({ error: 'already invited' });
        }

        const memberUser = await User.findOne({ email, role: 'participant' });
        team.members.push({
            user: memberUser?._id || null,
            email,
            status: 'pending',
        });
        team.status = 'forming'; // resest status if it was ready
        await team.save();

        res.json(team);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'failed to invite' });
    }
});

// remove an invite / member (leader only)
router.delete('/:teamId/member/:email', auth, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findOne({ _id: req.params.teamId, leader: req.user._id });
        if (!team) return res.status(404).json({ error: 'team not found or not leader' });
        if (team.status === 'registered') return res.status(400).json({ error: 'cant remove from a registered team' });

        const email = req.params.email;
        team.members = team.members.filter(m => m.email !== email);

        const allAccepted = team.members.every(m => m.status === 'accepted');
        if (team.members.length > 0 && allAccepted) team.status = 'ready';
        else team.status = 'forming';

        await team.save();
        res.json(team);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'failed to remove member' });
    }
});

module.exports = router;
