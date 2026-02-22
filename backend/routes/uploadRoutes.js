const express = require('express');
const { upload } = require('../utils/cloudinary');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/upload
// Accepts a single file under the field name 'file'
// Returns the secure URL provided by Cloudinary
router.post('/', auth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        res.json({ url: req.file.path });
    } catch (error) {
        console.error('File Upload Error:', error);
        res.status(500).json({ error: 'Failed to upload file. Please try again.' });
    }
});

module.exports = router;
