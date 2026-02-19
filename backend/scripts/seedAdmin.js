// run this once to create the admin account
// usage: node scripts/seedAdmin.js

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('connected to db');

    const email = process.env.ADMIN_EMAIL || 'admin@felicity.iiit.ac.in';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = await User.findOne({ email });
    if (existing) {
        console.log('admin already exists, nothing to do');
        process.exit(0);
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
