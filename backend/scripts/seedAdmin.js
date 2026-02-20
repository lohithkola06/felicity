// run this once to create the admin account
// usage: node scripts/seedAdmin.js

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function seed() {
    const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };
    await mongoose.connect(process.env.MONGODB_URI, clientOptions);
    console.log('connected to db');

    const email = process.env.ADMIN_EMAIL || 'admin@iiit.ac.in';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    // Check if an admin account already exists (any email)
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
        // Update email/password if they changed
        if (existingAdmin.email !== email) {
            existingAdmin.email = email;
            existingAdmin.password = password;
            await existingAdmin.save();
            console.log('admin email updated to:', email);
        } else {
            console.log('admin already exists with correct email, nothing to do');
        }
        process.exit(0);
    }

    // Also check if this specific email is taken by a non-admin
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
        console.log('email already taken by a non-admin user');
        process.exit(1);
    }

    await User.create({ email, password, role: 'admin' });
    console.log('admin created');
    console.log('email:', email);
    console.log('password:', password);
    process.exit(0);
}

seed().catch(err => {
    console.log('seed failed:', err.message);
    process.exit(1);
});
