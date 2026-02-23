const express = require('express');
const { upload, cloudinary } = require('../utils/cloudinary');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/upload
// Accepts a single file under the field name 'file'
// Returns the secure URL and canonical details provided by Cloudinary
router.post('/', auth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        // Extract format (extension) from the filename or mime type
        const format = req.file.mimetype ? req.file.mimetype.split('/')[1] : req.file.filename.split('.').pop();

        res.json({
            url: req.file.path,
            publicId: req.file.filename,
            resourceType: req.file.resource_type || 'image', // Default to image (which Cloudinary uses for PDFs via auto)
            format: format
        });
    } catch (error) {
        console.error('File Upload Error:', error);
        res.status(500).json({ error: 'Failed to upload file. Please try again.' });
    }
});

// POST /api/upload/resolve
// Creates a robust, viewable URL given the canonical file object or a legacy URL
router.post('/resolve', auth, (req, res) => {
    try {
        const { url, publicId, resourceType, format } = req.body;

        if (publicId) {
            // Generate a fresh secure URL
            const resolvedUrl = cloudinary.url(publicId, {
                secure: true,
                resource_type: resourceType || 'image',
                format: format || undefined // Use format if provided
            });
            return res.json({ url: resolvedUrl });
        }

        // Fallback for legacy string URLs. If it looks like a PDF but lacks an extension, try appending it.
        if (typeof url === 'string' && url.includes('pdf') && !url.endsWith('.pdf')) {
            return res.json({ url: `${url}.pdf` });
        }

        return res.json({ url });
    } catch (error) {
        console.error('URL Resolve Error:', error);
        res.status(500).json({ error: 'Failed to resolve file URL.' });
    }
});

module.exports = router;
