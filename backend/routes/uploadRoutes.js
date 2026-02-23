const express = require('express');
const { cloudinary } = require('../utils/cloudinary');
const { auth } = require('../middleware/auth');
const fs = require('fs');
const os = require('os');
const path = require('path');

const router = express.Router();

// POST /api/upload
// Accepts base64 encoded file data
// Returns the secure URL and canonical details provided by Cloudinary
router.post('/', auth, async (req, res) => {
    try {
        const { filename, data, mimetype } = req.body;

        if (!filename || !data) {
            return res.status(400).json({ error: 'filename and data (base64) required.' });
        }

        if (!mimetype || (!mimetype.startsWith('image/') && mimetype !== 'application/pdf')) {
            return res.status(400).json({ error: 'Only images and PDFs are allowed.' });
        }

        const isPdf = mimetype === 'application/pdf';

        const uploadParams = {
            folder: 'felicity_events',
            resource_type: isPdf ? 'raw' : 'auto'
        };

        let uploadRes;

        if (isPdf) {
            // Raw files in Cloudinary don't auto-append extensions from base64 streams.
            // We physically construct a temporary file to bypass corrupted raw deliveries.
            const safeName = filename.replace(/[^a-zA-Z0-9]/g, '_').replace(/_pdf$/i, '');
            uploadParams.public_id = `${safeName}_${Date.now()}.pdf`;

            const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}_${safeName}.pdf`);
            // Strip metadata prefix if the frontend sent the complete dataUri instead of raw base64
            const base64Data = data.replace(/^data:[a-zA-Z0-9\/+-]+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(tempFilePath, buffer);

            try {
                uploadRes = await cloudinary.uploader.upload(tempFilePath, uploadParams);
            } finally {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            }
        } else {
            const dataUri = `data:${mimetype};base64,${data}`;
            uploadRes = await cloudinary.uploader.upload(dataUri, uploadParams);
        }

        // Extract format (extension) from the filename or mime type
        const format = mimetype ? mimetype.split('/')[1] : filename.split('.').pop();

        res.json({
            url: uploadRes.secure_url,
            publicId: uploadRes.public_id,
            resourceType: uploadRes.resource_type || 'image',
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
