const express = require('express');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { auth, authorize } = require('../middleware/auth');
const generateTicket = require('../utils/generateTicket');
const { sendMerchEmail } = require('../utils/email');

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

// -------------------------------------------------------------------------
// PATCH /api/organizer/events/:id/registrations/:regId/approve
// -------------------------------------------------------------------------
// Approve a pending merch order. Generate ticket and send email.
router.patch('/events/:id/registrations/:regId/approve', async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ error: 'Event not found' });

        let registration = await Registration.findOne({ _id: req.params.regId, event: event._id });
        if (!registration) return res.status(404).json({ error: 'Registration not found' });

        if (registration.status !== 'pending_approval') {
            return res.status(400).json({ error: `Cannot approve order. Current status is ${registration.status}` });
        }

        // Generate Ticket (QR Code)
        // We need the user's email, so let's populate it
        await registration.populate('participant', 'email name firstName');
        const userEmail = registration.participant?.email;

        if (!userEmail) {
            return res.status(400).json({ error: 'Participant email not found' });
        }

        const { ticketId, qrCode } = await generateTicket(event.name, userEmail);

        if (event.type === 'normal') {
            registration.status = 'registered';
            registration.paymentStatus = 'paid';
        } else {
            registration.status = 'approved';
        }

        registration.ticketId = ticketId;
        registration.qrCode = qrCode;
        await registration.save();

        // Send Email Confirmation (Async)
        if (event.type === 'normal') {
            const { sendTicketEmail } = require('../utils/email');
            sendTicketEmail(userEmail, event.name, ticketId, qrCode).catch(err => console.error("Ticket Email Failed:", err));
        } else {
            const itemsList = registration.merchandiseSelections || [];
            sendMerchEmail(userEmail, event.name, ticketId, itemsList, qrCode).catch(err => console.error("Merch Email Failed:", err));
        }

        res.json(registration);
    } catch (err) {
        console.error('Approval Error:', err);
        res.status(500).json({ error: 'Failed to approve order' });
    }
});

// -------------------------------------------------------------------------
// PATCH /api/organizer/events/:id/registrations/:regId/reject
// -------------------------------------------------------------------------
// Reject a pending merch order. Restore stock.
router.patch('/events/:id/registrations/:regId/reject', async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const registration = await Registration.findOne({ _id: req.params.regId, event: event._id });
        if (!registration) return res.status(404).json({ error: 'Registration not found' });

        if (registration.status !== 'pending_approval') {
            return res.status(400).json({ error: `Cannot reject order. Current status is ${registration.status}` });
        }

        const { comment } = req.body;

        registration.status = 'rejected';
        registration.rejectionComment = comment || 'No reason provided.';
        await registration.save();

        if (event.type === 'normal') {
            // Normal event logic
            event.registrationCount = Math.max(0, event.registrationCount - 1);

            // check waitlist
            if (event.waitlist && event.waitlist.length > 0) {
                // notify first person
                const nextUser = event.waitlist.shift();
                const User = require('../models/User');
                const userToNotify = await User.findById(nextUser.user);
                if (userToNotify) {
                    const { sendWaitlistNotification } = require('../utils/email');
                    sendWaitlistNotification(userToNotify.email, event.name, event._id).catch(() => { });
                }
            }
            await event.save();
        } else {
            // Restore Stock for Merch
            if (registration.merchandiseSelections && Array.isArray(registration.merchandiseSelections)) {
                let eventUpdated = false;
                for (const sel of registration.merchandiseSelections) {
                    const itemIndex = event.items.findIndex(i =>
                        i.name === sel.itemName &&
                        i.size === sel.size &&
                        i.color === sel.color &&
                        i.variant === sel.variant
                    );
                    if (itemIndex > -1) {
                        event.items[itemIndex].stock += (sel.quantity || 1);
                        eventUpdated = true;
                    }
                }
                if (eventUpdated) {
                    event.registrationCount = Math.max(0, event.registrationCount - 1);
                    await event.save();
                }
            }
        }

        res.json(registration);
    } catch (err) {
        console.error('Rejection Error:', err);
        res.status(500).json({ error: 'Failed to reject order' });
    }
});

module.exports = router;
