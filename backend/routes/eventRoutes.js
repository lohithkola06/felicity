const express = require('express');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const generateTicket = require('../utils/generateTicket');
const { sendTicketEmail, sendMerchEmail } = require('../utils/email');
const { sendDiscordNotification } = require('../utils/discord');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper: Automatically reconcile an event's status with the current time.
// If the event has a start/end date, the stored status may be stale —
// e.g. a "published" event whose start date has already passed should
// appear as "ongoing", and an "ongoing" event whose end date has passed
// should appear as "completed".  This keeps things accurate without
// requiring organizers to babysit status toggles.
// ---------------------------------------------------------------------------
async function reconcileEventStatus(event) {
    if (!event) return event;
    const now = new Date();
    let changed = false;

    if (event.status === 'published' && event.startDate && new Date(event.startDate) <= now) {
        event.status = 'ongoing';
        changed = true;
    }
    if (event.status === 'ongoing' && event.endDate && new Date(event.endDate) <= now) {
        event.status = 'completed';
        changed = true;
    }

    if (changed) {
        await event.save();
    }
    return event;
}

// Batch version for arrays of events (lean or mongoose docs)
async function reconcileMany(events) {
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
            e.status = newStatus; // reflect in the returned data too
        }
    }

    if (bulkOps.length > 0) {
        await Event.bulkWrite(bulkOps);
    }
    return events;
}

// =============================================================================
// ORGANIZER ROUTES
// =============================================================================

// -------------------------------------------------------------------------
// POST /api/events
// -------------------------------------------------------------------------
// Create a new event.
// By default events are saved as 'draft' so the organizer can review before
// going live, but we also allow a direct publish if the organizer chooses to.
router.post('/', auth, authorize('organizer'), async (req, res) => {
    try {
        // Allow the organizer to optionally publish immediately
        const initialStatus = req.body.publishNow ? 'published' : 'draft';

        const event = await Event.create({
            ...req.body,
            organizer: req.user._id,
            status: initialStatus,
        });

        // If publishing right away, fire off a Discord notification
        if (initialStatus === 'published' && req.user.discordWebhook) {
            sendDiscordNotification(req.user.discordWebhook, event).catch(err => console.error('Discord Hook Failed:', err));
        }

        res.status(201).json(event);
    } catch (err) {
        console.error('Create Event Error:', err);
        res.status(500).json({ error: 'We could not create your event. Please check your data and try again.' });
    }
});

// -------------------------------------------------------------------------
// GET /api/events/my-events
// -------------------------------------------------------------------------
// List all events managed by the currently logged-in organizer.
router.get('/my-events', auth, authorize('organizer'), async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user._id }).sort('-createdAt');
        await reconcileMany(events);
        res.json(events);
    } catch (err) {
        console.error('Fetch My Events Error:', err);
        res.status(500).json({ error: 'Could not load your events list.' });
    }
});

// -------------------------------------------------------------------------
// PUT /api/events/:id
// -------------------------------------------------------------------------
// Update an existing event.
// Security: We strictly limit what can be edited based on the event's status.
router.put('/:id', auth, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        if (event.status === 'draft') {
            // Draft mode: Complete freedom to edit everything.
            Object.assign(event, req.body);
        } else if (event.status === 'published') {
            // Published mode: Restricted editing to prevent user confusion.
            // Allowed: Description, Deadline, Limit (only increase).
            const allowedFields = ['description', 'registrationDeadline', 'registrationLimit'];
            const attemptToEdit = Object.keys(req.body);
            const invalidFields = attemptToEdit.filter(k => !allowedFields.includes(k));

            if (invalidFields.length > 0) {
                return res.status(400).json({ error: `You cannot edit fields like used '${invalidFields.join(', ')}' while the event is published.` });
            }

            // Logic Check: Deadlines can only be extended, not shortened.
            if (req.body.registrationDeadline && new Date(req.body.registrationDeadline) < event.registrationDeadline) {
                return res.status(400).json({ error: 'You can only extend the registration deadline, not shorten it.' });
            }
            // Logic Check: Capacity can only be increased, not decreased.
            if (req.body.registrationLimit && req.body.registrationLimit < event.registrationLimit) {
                return res.status(400).json({ error: 'You can only increase the registration limit to accommodate more people.' });
            }

            Object.assign(event, req.body);
        } else {
            return res.status(400).json({ error: 'This event cannot be edited in its current status.' });
        }

        await event.save();
        res.json(event);
    } catch (err) {
        console.error('Update Event Error:', err);
        res.status(500).json({ error: 'Failed to update the event.' });
    }
});

// -------------------------------------------------------------------------
// DELETE /api/events/:id
// -------------------------------------------------------------------------
// Delete an event and all associated data (registrations, teams, chat, feedback).
// Only the organizer who owns the event can delete it.
// Events that are currently ongoing cannot be deleted.
router.delete('/:id', auth, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        if (event.status === 'ongoing') {
            return res.status(400).json({ error: 'Cannot delete an event that is currently ongoing. Close it first.' });
        }

        const Team = require('../models/Team');
        const ChatMessage = require('../models/ChatMessage');
        const Feedback = require('../models/Feedback');

        // Cascade delete all associated data
        await Registration.deleteMany({ event: event._id });
        await Team.deleteMany({ event: event._id });
        await ChatMessage.deleteMany({ event: event._id });
        await Feedback.deleteMany({ event: event._id });
        await Event.findByIdAndDelete(event._id);

        res.json({ message: 'Event and all associated data deleted successfully.' });
    } catch (err) {
        console.error('Delete Event Error:', err);
        res.status(500).json({ error: 'Failed to delete the event.' });
    }
});

// -------------------------------------------------------------------------
// PATCH /api/events/:id/status
// -------------------------------------------------------------------------
// Manage the lifecycle of an event (Draft -> Published -> Ongoing -> Closed).
const validStatusTransitions = {
    draft: ['published'],
    published: ['ongoing', 'closed'],
    ongoing: ['completed', 'closed'],
    completed: [], // End of lifecycle
    closed: [], // End of lifecycle
};

router.patch('/:id/status', auth, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        const nextStatus = req.body.status;
        if (!validStatusTransitions[event.status].includes(nextStatus)) {
            return res.status(400).json({ error: `Invalid status change. You cannot move from '${event.status}' to '${nextStatus}'.` });
        }

        event.status = nextStatus;
        await event.save();

        // Notification Hook: Alert Discord community when an event goes live.
        if (nextStatus === 'published' && req.user.discordWebhook) {
            sendDiscordNotification(req.user.discordWebhook, event).catch(err => console.error("Discord Hook Failed:", err));
        }

        res.json(event);
    } catch (err) {
        console.error('Status Update Error:', err);
        res.status(500).json({ error: 'Could not update event status.' });
    }
});

// -------------------------------------------------------------------------
// GET /api/events/:id/participants
// -------------------------------------------------------------------------
// Get the list of all users registered for a specific event.
router.get('/:id/participants', auth, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        const registrations = await Registration.find({ event: req.params.id })
            .populate('participant', 'firstName lastName email contactNumber collegeName');

        res.json(registrations);
    } catch (err) {
        console.error('Fetch Participants Error:', err);
        res.status(500).json({ error: 'Could not fetch the participant list.' });
    }
});

// =============================================================================
// PUBLIC / PARTICIPANT ROUTES
// =============================================================================

// -------------------------------------------------------------------------
// GET /api/events/analytics
// -------------------------------------------------------------------------
// aggregated stats for the organizer dashboard
router.get('/analytics', auth, authorize('organizer'), async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user._id });
        const eventIds = events.map(e => e._id);
        const registrations = await Registration.find({ event: { $in: eventIds } });

        const totalEvents = events.length;
        const eventsByStatus = events.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {});
        const totalRegistrations = registrations.length;

        // Revenue Calculation
        let totalRevenue = 0;
        let totalAttendance = 0;

        // Pre-map item prices for O(1) lookup during revenue calc
        const eventItemsMap = {};
        events.forEach(e => {
            if (e.type === 'merchandise') {
                eventItemsMap[e._id] = {};
                e.items.forEach(i => eventItemsMap[e._id][i.name] = i.price);
            }
        });

        for (const reg of registrations) {
            if (reg.attended) totalAttendance++;

            if (reg.paymentStatus === 'paid') {
                const event = events.find(e => e._id.equals(reg.event));
                if (event) {
                    // Add base registration fee
                    totalRevenue += event.registrationFee || 0;

                    // Add merch cost if applicable
                    if (event.type === 'merchandise' && reg.merchandiseSelections) {
                        const price = eventItemsMap[event._id]?.[reg.merchandiseSelections.itemName] || 0;
                        totalRevenue += price * (reg.merchandiseSelections.quantity || 1);
                    }
                }
            }
        }

        res.json({
            totalEvents,
            eventsByStatus,
            totalRegistrations,
            totalRevenue,
            totalAttendance,
        });
    } catch (err) {
        console.error('Analytics Error:', err);
        res.status(500).json({ error: 'Failed to generate analytics.' });
    }
});

// -------------------------------------------------------------------------
// GET /api/events/browse
// -------------------------------------------------------------------------
// Public endpoint to list events (Published or Ongoing only) with filters.
router.get('/browse', async (req, res) => {
    try {
        const { search, type, eligibility, startDate, endDate, followedOnly, trending } = req.query;
        let queryFilter = { status: { $in: ['published', 'ongoing'] } };

        // Search: Matches Name, Description, Tags, or Organizer Name
        if (search) {
            queryFilter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } },
                { 'organizer.organizerName': { $regex: search, $options: 'i' } }
            ];
        }

        if (type) queryFilter.type = new RegExp(`^${type}$`, 'i');
        if (eligibility) queryFilter.eligibility = eligibility;

        if (startDate || endDate) {
            queryFilter.startDate = {};
            if (startDate) queryFilter.startDate.$gte = new Date(startDate);
            if (endDate) queryFilter.startDate.$lte = new Date(endDate);
        }

        // Logic for "Followed Only" filter
        let currentUser = null;
        if (req.header('Authorization')?.startsWith('Bearer ')) {
            try {
                const token = req.header('Authorization').split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                currentUser = await User.findById(decoded.id);
            } catch (e) { /* ignore invalid token for public browse */ }
        }

        if (followedOnly === 'true' && currentUser) {
            if (currentUser.followedOrganizers?.length) {
                queryFilter.organizer = { $in: currentUser.followedOrganizers };
            } else {
                return res.json([]); // User follows no one, so empty result
            }
        }

        let events = await Event.find(queryFilter)
            .populate('organizer', 'organizerName category')
            .lean();

        // Auto-update stale statuses so participants see accurate info
        await reconcileMany(events);

        // Sorting Logic
        if (trending === 'true') {
            // "Trending" = Most registrations
            events.sort((a, b) => b.registrationCount - a.registrationCount);
            events = events.slice(0, 5); // Top 5
        } else if (currentUser && currentUser.interests?.length > 0) {
            // Interest Matching: +5 for tag match, +2 for category match
            events.forEach(e => {
                let score = 0;
                if (e.tags && e.tags.some(t => currentUser.interests.includes(t))) score += 5;
                if (currentUser.interests.some(i => e.organizer?.category?.toLowerCase() === i.toLowerCase())) score += 2;
                if (currentUser.interests.some(i => e.type === i.toLowerCase())) score += 2;
                e.searchScore = score;
            });
            // Sort by Score DESC, then Date ASC
            events.sort((a, b) => {
                if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
                return new Date(a.startDate || 0) - new Date(b.startDate || 0);
            });
        } else {
            // Default: Chronological
            events.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
        }

        res.json(events);
    } catch (err) {
        console.error('Browse Events Error:', err);
        res.status(500).json({ error: 'Could not load events.' });
    }
});

// -------------------------------------------------------------------------
// GET /api/events/:id
// -------------------------------------------------------------------------
// Fetch a single event's public details.
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'organizerName category description contactEmail');

        if (!event) return res.status(404).json({ error: 'Event not found.' });

        // Make sure the status reflects reality before sending it out
        await reconcileEventStatus(event);

        res.json(event);
    } catch (err) {
        console.error('Fetch Event Detail Error:', err);
        res.status(500).json({ error: 'Could not load event details.' });
    }
});

// -------------------------------------------------------------------------
// GET /api/events/:id/my-status
// -------------------------------------------------------------------------
// Check if the current user is registered/attended
router.get('/:id/my-status', auth, async (req, res) => {
    try {
        const registration = await Registration.findOne({ event: req.params.id, participant: req.user._id });
        if (!registration || registration.status === 'cancelled') return res.json({ registered: false });
        res.json({ registered: true, ...registration.toJSON() });
    } catch (err) {
        console.error('Fetch My Status Error:', err);
        res.status(500).json({ error: 'Could not fetch status' });
    }
});

// -------------------------------------------------------------------------
// POST /api/events/:id/register
// -------------------------------------------------------------------------
// Register a participant for a "Normal" event.
router.post('/:id/register', auth, authorize('participant'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        // Checks: Status, Type, Deadlines, Limits
        if (event.status !== 'published' && event.status !== 'ongoing')
            return res.status(400).json({ error: 'Registration for this event is not open.' });
        if (event.type !== 'normal')
            return res.status(400).json({ error: 'This is a merchandise item. Please use the purchase option.' });
        if (event.registrationDeadline && new Date() > event.registrationDeadline)
            return res.status(400).json({ error: 'Registration deadline has passed.' });
        if (event.registrationLimit > 0 && event.registrationCount >= event.registrationLimit)
            return res.status(400).json({ error: 'This event is full.' });
        if (event.eligibility === 'iiit-only' && req.user.participantType !== 'iiit')
            return res.status(400).json({ error: 'This event is restricted to IIIT students only.' });

        // Check for double registration
        let registration = await Registration.findOne({ event: event._id, participant: req.user._id });
        if (registration) {
            if (registration.status !== 'cancelled') {
                return res.status(400).json({ error: 'You are already registered for this event.' });
            }
        }

        // Generate Ticket (QR Code)
        const { ticketId, qrCode } = await generateTicket(event.name, req.user.email);

        if (registration) {
            // Repurpose the cancelled registration to avoid unique index collision
            registration.status = 'registered';
            registration.formResponses = req.body.formResponses || {};
            registration.ticketId = ticketId;
            registration.qrCode = qrCode;
            registration.paymentStatus = event.registrationFee > 0 ? 'pending' : 'paid';
            registration.registeredAt = Date.now();
            await registration.save();
        } else {
            registration = await Registration.create({
                event: event._id,
                participant: req.user._id,
                formResponses: req.body.formResponses || {},
                ticketId,
                qrCode,
                paymentStatus: event.registrationFee > 0 ? 'pending' : 'paid',
            });
        }

        // Update Event Stats
        event.registrationCount += 1;
        if (!event.formLocked) event.formLocked = true; // Lock schema once data exists
        await event.save();

        // Send Email Confirmation (Async)
        sendTicketEmail(req.user.email, event.name, ticketId, qrCode).catch(err => console.error("Email Failed:", err));

        res.status(201).json({ registration, ticketId });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'You are already registered.' });
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// -------------------------------------------------------------------------
// POST /api/events/:id/purchase
// -------------------------------------------------------------------------
// Purchase merchandise items.
router.post('/:id/purchase', auth, authorize('participant'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        if (event.type !== 'merchandise')
            return res.status(400).json({ error: 'This event is not selling merchandise.' });
        if (event.status !== 'published' && event.status !== 'ongoing')
            return res.status(400).json({ error: 'Sales are currently closed.' });

        const { itemName, size, color, variant, quantity } = req.body;
        if (!itemName) return res.status(400).json({ error: 'Please specify which item you want to buy.' });

        // Find the specific item variant in the event's inventory
        const desiredItem = event.items.find(i =>
            i.name === itemName &&
            (!size || i.size === size) &&
            (!color || i.color === color) &&
            (!variant || i.variant === variant)
        );

        if (!desiredItem) return res.status(404).json({ error: 'We could not find that specific item configuration.' });

        const qtyToBuy = quantity || 1;
        if (desiredItem.stock < qtyToBuy) return res.status(400).json({ error: `Sorry, we only have ${desiredItem.stock} left in stock.` });

        // User purchase limit check
        const userPurchases = await Registration.countDocuments({ event: event._id, participant: req.user._id });
        if (userPurchases + qtyToBuy > event.purchaseLimitPerUser)
            return res.status(400).json({ error: `You have reached the purchase limit of ${event.purchaseLimitPerUser} items for this event.` });

        const { ticketId, qrCode } = await generateTicket(event.name, req.user.email);

        const registration = await Registration.create({
            event: event._id,
            participant: req.user._id,
            merchandiseSelections: { itemName, size, color, variant, quantity: qtyToBuy },
            ticketId,
            qrCode,
            paymentStatus: 'pending', // Assume payment gateway integration here
        });

        // Deduct Stock
        desiredItem.stock -= qtyToBuy;
        event.registrationCount += 1; // Count transactions
        await event.save();

        sendMerchEmail(req.user.email, event.name, ticketId, itemName, qrCode).catch(err => console.error("Merch Email Failed:", err));

        res.status(201).json({ registration, ticketId });
    } catch (err) {
        console.error('Purchase Error:', err);
        res.status(500).json({ error: 'Purchase failed. Please try again.' });
    }
});

// -------------------------------------------------------------------------
// POST /api/events/:id/waitlist
// -------------------------------------------------------------------------
// Join the waitlist for a full event.
router.post('/:id/waitlist', auth, authorize('participant'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        if (event.type !== 'normal')
            return res.status(400).json({ error: 'Waitlists are only available for standard events.' });

        // Validation: Only allow waitlist if event is actually full
        if (event.registrationLimit === 0 || event.registrationCount < event.registrationLimit)
            return res.status(400).json({ error: 'This event still has open spots! You can register normally.' });

        const alreadyRegistered = await Registration.findOne({ event: event._id, participant: req.user._id });
        if (alreadyRegistered) return res.status(400).json({ error: 'You are already registered.' });

        // Check if already in waitlist
        const isWaitlisted = event.waitlist.some(w => w.user.toString() === req.user._id.toString());
        if (isWaitlisted) return res.status(400).json({ error: 'You are already on the waitlist.' });

        event.waitlist.push({ user: req.user._id });
        await event.save();

        res.json({ message: 'You have been added to the waitlist. We will notify you if a spot opens up.' });
    } catch (err) {
        console.error('Waitlist Error:', err);
        res.status(500).json({ error: 'Failed to join waitlist.' });
    }
});

// -------------------------------------------------------------------------
// GET /api/events/my/registrations
// -------------------------------------------------------------------------
// List all events the user has registered for or purchased from.
router.get('/my/registrations', auth, authorize('participant'), async (req, res) => {
    try {
        const registrations = await Registration.find({ participant: req.user._id })
            .populate('event', 'name type status startDate endDate organizer')
            .sort('-registeredAt');
        res.json(registrations);
    } catch (err) {
        console.error('Fetch Registrations Error:', err);
        res.status(500).json({ error: 'Could not load your registrations.' });
    }
});

module.exports = router;
