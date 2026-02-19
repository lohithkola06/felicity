const express = require('express');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// scan qr / mark attendance by ticket id
router.post('/mark', auth, authorize('organizer'), async (req, res) => {
    try {
        const { ticketId } = req.body;
        if (!ticketId) return res.status(400).json({ error: 'need ticketId' });

        const reg = await Registration.findOne({ ticketId })
            .populate('event', 'name organizer')
            .populate('participant', 'firstName lastName email');

        if (!reg) return res.status(404).json({ error: 'ticket not found' });

        // verify this organizer owns the event
        if (!reg.event.organizer.equals(req.user._id)) {
            return res.status(403).json({ error: 'not your event' });
        }

        if (reg.attended) {
            return res.status(400).json({ error: 'already marked as attended', registration: reg });
        }

        reg.attended = true;
        reg.attendedAt = new Date();
        await reg.save();

        res.json({
            message: 'attendance marked!',
            participant: {
                name: `${reg.participant.firstName} ${reg.participant.lastName}`,
                email: reg.participant.email,
            },
            event: reg.event.name,
            ticketId: reg.ticketId,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not mark attendance' });
    }
});

// get attendance list for an event
router.get('/event/:eventId', auth, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.eventId, organizer: req.user._id });
        if (!event) return res.status(404).json({ error: 'event not found' });

        const regs = await Registration.find({ event: event._id })
            .populate('participant', 'firstName lastName email contactNumber collegeName');

        const total = regs.length;
        const attended = regs.filter(r => r.attended).length;

        res.json({ total, attended, rate: total > 0 ? ((attended / total) * 100).toFixed(1) : 0, registrations: regs });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not fetch attendance' });
    }
});

// export attendance as csv
router.get('/event/:eventId/csv', auth, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.eventId, organizer: req.user._id });
        if (!event) return res.status(404).json({ error: 'event not found' });

        const regs = await Registration.find({ event: event._id })
            .populate('participant', 'firstName lastName email contactNumber collegeName');

        let csv = 'Name,Email,Contact,College,TicketID,Attended,AttendedAt\n';
        for (const r of regs) {
            const p = r.participant;
            csv += `${p.firstName} ${p.lastName},${p.email},${p.contactNumber || ''},${p.collegeName || ''},${r.ticketId},${r.attended ? 'Yes' : 'No'},${r.attendedAt || ''}\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.name}-attendance.csv"`);
        res.send(csv);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'export failed' });
    }
});

module.exports = router;
