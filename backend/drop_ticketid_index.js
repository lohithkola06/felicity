const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB...');
        const Registration = require('./models/Registration');
        try {
            await Registration.collection.dropIndex('ticketId_1');
            console.log('Dropped unique index on ticketId_1');
        } catch (e) {
            console.log('Index drop error (maybe it did not exist):', e.message);
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
