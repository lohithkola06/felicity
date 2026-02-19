const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const Team = require('../models/Team');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// send a message to team chat
router.post('/:teamId/send', auth, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId);
        if (!team) return res.status(404).json({ error: 'team not found' });

        // verify user is leader or member
        const isLeader = team.leader.equals(req.user._id);
        const isMember = team.members.some(m => m.user && m.user.equals(req.user._id) && m.status === 'accepted');
        if (!isLeader && !isMember) return res.status(403).json({ error: 'youre not in this team' });

        const msg = await ChatMessage.create({
            team: team._id,
            sender: req.user._id,
            message: req.body.message,
        });

        // populate sender info for the response
        await msg.populate('sender', 'firstName lastName email');

        // emit via socket if available
        if (req.app.get('io')) {
            req.app.get('io').to(`team-${team._id}`).emit('newMessage', msg);
        }

        res.status(201).json(msg);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not send message' });
    }
});

// get team chat history
router.get('/:teamId/messages', auth, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId);
        if (!team) return res.status(404).json({ error: 'team not found' });

        const isLeader = team.leader.equals(req.user._id);
        const isMember = team.members.some(m => m.user && m.user.equals(req.user._id) && m.status === 'accepted');
        if (!isLeader && !isMember) return res.status(403).json({ error: 'youre not in this team' });

        const messages = await ChatMessage.find({ team: team._id })
            .populate('sender', 'firstName lastName email')
            .sort('sentAt')
            .limit(200); // keep it sane

        res.json(messages);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not fetch messages' });
    }
});

module.exports = router;
