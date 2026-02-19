const express = require('express');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// organizer submits a password reset request
router.post('/request', auth, authorize('organizer'), async (req, res) => {
    try {
        // check if there's already a pending request
        const existing = await PasswordResetRequest.findOne({
            organizer: req.user._id,
            status: 'pending',
        });
        if (existing) return res.status(400).json({ error: 'you already have a pending request' });

        const request = await PasswordResetRequest.create({
            organizer: req.user._id,
            reason: req.body.reason || '',
        });

        res.status(201).json(request);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not submit request' });
    }
});

// organizer checks their request status
router.get('/my-requests', auth, authorize('organizer'), async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find({ organizer: req.user._id })
            .sort('-createdAt');
        res.json(requests);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not fetch requests' });
    }
});

// admin gets all pending reset requests
router.get('/pending', auth, authorize('admin'), async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find({ status: 'pending' })
            .populate('organizer', 'email organizerName category')
            .sort('-createdAt');
        res.json(requests);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not fetch requests' });
    }
});

// admin gets all requests (history)
router.get('/all', auth, authorize('admin'), async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find()
            .populate('organizer', 'email organizerName category')
            .sort('-createdAt');
        res.json(requests);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not fetch requests' });
    }
});

// admin approves a reset request - generates temp password
router.post('/:id/approve', auth, authorize('admin'), async (req, res) => {
    try {
        const request = await PasswordResetRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ error: 'request not found' });
        if (request.status !== 'pending') return res.status(400).json({ error: 'request already processed' });

        // generate a random temp password
        const tempPassword = crypto.randomBytes(8).toString('hex');

        // update the organizer's password
        const organizer = await User.findById(request.organizer);
        if (!organizer) return res.status(404).json({ error: 'organizer not found' });

        organizer.password = tempPassword;
        await organizer.save(); // pre-save hook will hash it

        request.status = 'approved';
        request.processedBy = req.user._id;
        request.processedAt = new Date();
        request.tempPassword = tempPassword; // store so admin can communicate it
        request.adminNote = req.body.note || '';
        await request.save();

        res.json({ message: 'approved! temp password generated', tempPassword });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not approve request' });
    }
});

// admin rejects a reset request
router.post('/:id/reject', auth, authorize('admin'), async (req, res) => {
    try {
        const request = await PasswordResetRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ error: 'request not found' });
        if (request.status !== 'pending') return res.status(400).json({ error: 'request already processed' });

        request.status = 'rejected';
        request.processedBy = req.user._id;
        request.processedAt = new Date();
        request.adminNote = req.body.note || '';
        await request.save();

        res.json({ message: 'rejected' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'could not reject request' });
    }
});

module.exports = router;
