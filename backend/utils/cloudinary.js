const cloudinary = require('cloudinary').v2;
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

module.exports = { cloudinary };
