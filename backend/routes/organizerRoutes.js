const express = require('express');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(auth, authorize('organizer'));

// dashboard - all my events + some overall numbers
router.get('/dashboard', async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user._id }).sort('-createdAt');

        // Auto-update event statuses based on current time before computing stats
        const now = new Date();
        const bulkOps = [];
        for (const e of events) {
            let newStatus = null;
            if (e.status === 'published' && e.startDate && new Date(e.startDate) <= now) {
                newStatus = 'ongoing';
            }
            if ((e.status === 'ongoing' || newStatus === 'ongoing') && e.endDate && new Date(e.endDate) <= now) {
                newStatus = 'completed';
            }
            if (newStatus && newStatus !== e.status) {
                bulkOps.push({ updateOne: { filter: { _id: e._id }, update: { $set: { status: newStatus } } } });
                e.status = newStatus;
            }
        }
        if (bulkOps.length > 0) await Event.bulkWrite(bulkOps);

        const eventIds = events.map(e => e._id);
        const registrations = await Registration.find({ event: { $in: eventIds } });

        // aggregated stats
        const totalEvents = events.length;
        const activeEvents = events.filter(e => ['published', 'ongoing'].includes(e.status)).length;
        const totalRegistrations = registrations.length;

        // calc revenue
        let totalRevenue = 0;
        let totalAttendance = 0;

        // map event id to items for quick price lookup
        const eventItems = {};
        events.forEach(e => {
            if (e.type === 'merchandise') {
                eventItems[e._id] = {};
                e.items.forEach(i => eventItems[e._id][i.name] = i.price);
            }
        });

        for (const r of registrations) {
            if (r.attended) totalAttendance++;
            if (r.paymentStatus === 'paid') {
                const event = events.find(e => e._id.equals(r.event));
                if (event) {
                    totalRevenue += event.registrationFee || 0;
                    if (event.type === 'merchandise' && r.merchandiseSelections) {
                        const price = eventItems[event._id]?.[r.merchandiseSelections.itemName] || 0;
                        totalRevenue += price * (r.merchandiseSelections.quantity || 1);
                    }
                }
            }
        }

        res.json({
            events,
            analytics: {
                totalEvents,
                activeEvents,
                totalRegistrations,
                totalRevenue,
                totalAttendance,
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'failed to load dashboard' });
    }
});

// per-event analytics
router.get('/events/:id/analytics', async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ error: 'event not found' });

        const regs = await Registration.find({ event: event._id });
        const attended = regs.filter(r => r.attended).length;

        // Team completion stats
        let teamCompletion = 0;
        try {
            const Team = require('../models/Team');
            const teams = await Team.find({ event: event._id });
            for (const team of teams) {
                const memberIds = team.members.map(m => m.toString());
                const memberRegs = regs.filter(r => memberIds.includes(r.participant.toString()));
                if (memberRegs.length === memberIds.length && memberRegs.every(r => r.attended)) {
                    teamCompletion++;
                }
            }
        } catch (e) { /* teams not applicable */ }

        // for merch events, tally up whats selling
        let itemSales = {};
        if (event.type === 'merchandise') {
            for (const r of regs) {
                const sel = r.merchandiseSelections;
                if (sel?.itemName) {
                    itemSales[sel.itemName] = (itemSales[sel.itemName] || 0) + (sel.quantity || 1);
                }
            }
        }

        res.json({
            eventName: event.name,
            status: event.status,
            registrations: regs.length,
            attendance: attended,
            teamCompletion,
            revenue: regs.length * event.registrationFee,
            registrationLimit: event.registrationLimit,
            ...(event.type === 'merchandise' && { itemSales }),
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'failed to load analytics' });
    }
});

// export participants as csv
router.get('/events/:id/export', async (req, res) => {
    try {
        // Support token via query param for direct browser download
        if (req.query.token && !req.headers.authorization) {
            req.headers.authorization = `Bearer ${req.query.token}`;
        }

        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ error: 'event not found' });

        const regs = await Registration.find({ event: event._id })
            .populate('participant', 'firstName lastName email contactNumber collegeName')
            .populate('team', 'name');

        let csv = 'Name,Email,College,Contact,Registration Date,Payment Status,Ticket ID,Team,Attendance,Status\n';
        for (const r of regs) {
            const p = r.participant;
            const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'Unknown';
            const date = r.registeredAt ? r.registeredAt.toISOString().split('T')[0] : '';
            const teamName = r.team?.name || '';
            const attended = r.attended ? 'Yes' : 'No';
            csv += `"${name}","${p?.email || ''}","${p?.collegeName || ''}","${p?.contactNumber || ''}","${date}","${r.paymentStatus}","${r.ticketId}","${teamName}","${attended}","${r.status}"\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.name}-participants.csv"`);
        res.send(csv);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'export failed' });
    }
});

// get my profile
router.get('/profile', (req, res) => res.json({ user: req.user }));

// update profile - login email cant be changed
router.put('/profile', async (req, res) => {
    try {
        const allowed = ['organizerName', 'category', 'description', 'contactEmail', 'contactNumber', 'discordWebhook'];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        const user = await req.user.constructor.findByIdAndUpdate(
            req.user._id, { $set: updates }, { new: true }
        );
        res.json({ user });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'failed to update profile' });
    }
});

module.exports = router;
