const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const { auth } = require('../middleware/auth');

const Registration = require('../models/Registration');

// POST /api/feedback
// Submit anonymous feedback for an event
router.post('/', auth, async (req, res) => {
    try {
        const { eventId, rating, comment } = req.body;

        if (!eventId || !rating) {
            return res.status(400).json({ error: 'Event ID and rating are required.' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
        }

        // Verify event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        // Verify user attended the event
        const registration = await Registration.findOne({
            event: eventId,
            participant: req.user.id,
            attended: true
        });

        if (!registration) {
            return res.status(403).json({ error: 'You can only submit feedback for events you have attended.' });
        }

        // Check for existing feedback
        const existingFeedback = await Feedback.findOne({ event: eventId, user: req.user.id });
        if (existingFeedback) {
            // Update existing feedback? or block? Requirement says "submit... feedback". 
            // Usually we allow update or block. Let's block for simplicity or allow update.
            // Let's allow update for better UX.
            existingFeedback.rating = rating;
            existingFeedback.comment = comment;
            existingFeedback.createdAt = Date.now(); // update time
            await existingFeedback.save();
            return res.json({ message: 'Feedback updated successfully.', feedback: existingFeedback });
        }

        // Create new feedback
        const feedback = new Feedback({
            event: eventId,
            user: req.user.id,
            rating,
            comment
        });

        await feedback.save();
        res.status(201).json({ message: 'Feedback submitted successfully.', feedback });

    } catch (err) {
        console.error('Feedback Submission Error:', err);
        res.status(500).json({ error: 'Failed to submit feedback.' });
    }
});

// GET /api/feedback/event/:eventId
// Get aggregated feedback for an event (Organizer/Admin only or public? "Organizers can view...")
// We'll gate it to auth users for now, maybe specific roles if strictly required, but "Organizers can view" implies role check.
// Let's allow any auth user to keep it simple or restrict to organizer/admin.
router.get('/event/:eventId', auth, async (req, res) => {
    try {
        // Strict check: Only Admin or Organizer can view? 
        // "Organizers can view aggregated ratings..."
        if (req.user.role === 'participant') {
            return res.status(403).json({ error: 'Access denied. Only organizers can view feedback.' });
        }

        const { eventId } = req.params;
        const { rating } = req.query; // Filter by rating

        let query = { event: eventId };
        if (rating) {
            query.rating = parseInt(rating);
        }

        // Fetch feedback - EXCLUDING user field to ensure anonymity
        const feedbacks = await Feedback.find(query)
            .select('-user')
            .sort({ createdAt: -1 });

        // Calculate aggregates manually or via Mongo aggregation
        // Since we filtered by rating potentially, aggregates should probably be on the WHOLE set, 
        // but the UI might want aggregates distinct from the list.
        // Let's just return the list and let frontend calculate avg if list is small, 
        // OR do a separate aggregation.

        // Let's do a quick aggregation for the average on the *unfiltered* set
        const stats = await Feedback.aggregate([
            { $match: { event: new mongoose.Types.ObjectId(eventId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    count: { $sum: 1 },
                    distribution: { $push: '$rating' }
                }
            }
        ]);

        const average = stats.length > 0 ? stats[0].averageRating.toFixed(1) : 0;
        const total = stats.length > 0 ? stats[0].count : 0;

        // Distribution count
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        if (stats.length > 0) {
            stats[0].distribution.forEach(r => distribution[r] = (distribution[r] || 0) + 1);
        }

        res.json({
            feedbacks,
            stats: {
                average,
                total,
                distribution
            }
        });

    } catch (err) {
        console.error('Fetch Feedback Error:', err);
        res.status(500).json({ error: 'Failed to fetch feedback.' });
    }
});

module.exports = router;
