const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to DB');

    let admin = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@felicity.iiit.ac.in' });
    if (!admin) {
        console.log('Creating Admin...');
        // Pass plain text, model pre-save hook will hash it
        admin = await User.create({
            firstName: 'System',
            lastName: 'Admin',
            email: process.env.ADMIN_EMAIL || 'admin@felicity.iiit.ac.in',
            password: process.env.ADMIN_PASSWORD || 'admin123',
            role: 'admin'
        });
        console.log('Admin Created:', admin.email);
    } else {
        console.log('Admin already exists. Resetting password...');
        // Pass plain text, model pre-save hook will hash it
        admin.password = 'admin123';
        await admin.save();
        console.log('Admin password reset to admin123');
    }

    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
