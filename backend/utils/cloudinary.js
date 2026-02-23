const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configure Cloudinary with credentials from the environment
if (process.env.CLOUDINARY_URL) {
    // CLOUDINARY_URL is automatically picked up by the SDK when present
} else {
    // Fallback if individual keys are used
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'felicity_events', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx'], // Allow images and common document types
        resource_type: 'auto', // Important: Treat PDFs appropriately instead of raw
    },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
