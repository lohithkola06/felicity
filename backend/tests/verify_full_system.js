const mongoose = require('mongoose');
const User = require('./models/User');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
const bcrypt = require('bcryptjs');
const axios = require('axios');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/felicity_test_db';
const API_URL = 'http://localhost:5001/api';

async function runVerification() {
    console.log("🚀 Starting Full System Verification...");

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Custom test DB connected");

        // CLEANUP
        await User.deleteMany({});
        await Event.deleteMany({});
        await Registration.deleteMany({});
        console.log("🧹 Database cleared.");

        // 1. ADMIN SETUP
        console.log("\n--- 1. Admin & Organizer Setup ---");
        // FIX: userSchema pre-save hook hashes password, so pass plain text here
        await User.create({
            firstName: 'Super', lastName: 'Admin', email: 'admin@felicity.iiit.ac.in',
            password: 'admin123', role: 'admin'
        });

        // Login Admin
        let res = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@felicity.iiit.ac.in',
            password: 'admin123',
            recaptchaToken: 'BYPASS_CAPTCHA'
        });
        const adminToken = res.data.token;
        if (!adminToken) throw new Error("Admin login failed");
        console.log("✅ Admin logged in");

        // Create Organizer (Correct Payload)
        res = await axios.post(`${API_URL}/admin/create-organizer`,
            {
                organizerName: 'Felicity Tech Team',
                category: 'Technical',
                contactEmail: 'tech@felicity.iiit.ac.in',
                description: 'We run the servers.'
            },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );

        const orgCredentials = res.data.credentials;
        console.log(`✅ Organizer created: ${orgCredentials.email}`);

        // 2. ORGANIZER ACTIONS
        console.log("\n--- 2. Organizer Actions ---");
        // Login Organizer using GENERATED credentials
        res = await axios.post(`${API_URL}/auth/login`, {
            email: orgCredentials.email,
            password: orgCredentials.password,
            recaptchaToken: 'BYPASS_CAPTCHA'
        });
        const orgToken = res.data.token;
        if (!orgToken) throw new Error("Organizer login failed");
        console.log("✅ Organizer logged in");

        // Create Standard Event
        const standardEventData = {
            name: 'Felicity Inauguration', description: 'Opening ceremony',
            startDate: new Date(), endDate: new Date(Date.now() + 86400000),
            venue: 'Amphitheatre', registrationLimit: 2, registrationFee: 0, type: 'normal'
        };
        res = await axios.post(`${API_URL}/events`, standardEventData, { headers: { Authorization: `Bearer ${orgToken}` } });
        let standardEventId = res.data._id;
        console.log("✅ Standard Event Draft Created");

        // Publish Standard Event
        res = await axios.patch(`${API_URL}/events/${standardEventId}/status`,
            { status: 'published' },
            { headers: { Authorization: `Bearer ${orgToken}` } }
        );
        console.log("✅ Standard Event Published");

        // Create Merch Event
        const merchEventData = {
            name: 'Felicity Hoodie Drop', description: 'Limited edition hoodies',
            startDate: new Date(), endDate: new Date(Date.now() + 86400000),
            type: 'merchandise', purchaseLimitPerUser: 1,
            items: [{ name: 'Hoodie', size: 'L', color: 'Black', stock: 2, price: 1000 }]
        };
        res = await axios.post(`${API_URL}/events`, merchEventData, { headers: { Authorization: `Bearer ${orgToken}` } });
        let merchEventId = res.data._id;
        console.log("✅ Merch Event Draft Created");

        // Publish Merch Event
        await axios.patch(`${API_URL}/events/${merchEventId}/status`,
            { status: 'published' },
            { headers: { Authorization: `Bearer ${orgToken}` } }
        );
        console.log("✅ Merch Event Published");


        // 3. PARTICIPANT ACTIONS
        console.log("\n--- 3. Participant Actions ---");

        // Register IIIT Student (Valid)
        res = await axios.post(`${API_URL}/auth/register`, {
            firstName: 'Student', lastName: 'One', email: 's1@students.iiit.ac.in', password: 'pass',
            participantType: 'iiit', collegeName: 'IIIT Hyderabad', contactNumber: '1234567890',
            captchaToken: 'BYPASS_CAPTCHA'
        });
        const user1Token = res.data.token;
        console.log("✅ IIIT Student Registered & Logged In");

        // Register Non-IIIT Student
        res = await axios.post(`${API_URL}/auth/register`, {
            firstName: 'Guest', lastName: 'Two', email: 'g2@gmail.com', password: 'pass',
            participantType: 'non-iiit', collegeName: 'IIT Bombay', contactNumber: '0987654321',
            captchaToken: 'BYPASS_CAPTCHA'
        });
        const user2Token = res.data.token;
        console.log("✅ Non-IIIT Student Registered & Logged In");

        // Register User 3 for Waitlist Test
        res = await axios.post(`${API_URL}/auth/register`, {
            firstName: 'Late', lastName: 'Three', email: 'l3@gmail.com', password: 'pass',
            participantType: 'non-iiit', collegeName: 'IIT Delhi', contactNumber: '1122334455',
            captchaToken: 'BYPASS_CAPTCHA'
        });
        const user3Token = res.data.token;
        console.log("✅ User 3 Registered");


        // 4. EVENT REGISTRATION & WAITLIST
        console.log("\n--- 4. Registration & Waitlist ---");

        // User 1 Registers (Spot 1/2)
        await axios.post(`${API_URL}/events/${standardEventId}/register`, {}, { headers: { Authorization: `Bearer ${user1Token}` } });
        console.log("✅ User 1 Registered for Event");

        // User 2 Registers (Spot 2/2 - Full)
        await axios.post(`${API_URL}/events/${standardEventId}/register`, {}, { headers: { Authorization: `Bearer ${user2Token}` } });
        console.log("✅ User 2 Registered for Event (Event now Full)");

        // User 3 Tries to Register -> Should Fail
        try {
            await axios.post(`${API_URL}/events/${standardEventId}/register`, {}, { headers: { Authorization: `Bearer ${user3Token}` } });
            throw new Error("User 3 should have been blocked");
        } catch (err) {
            if (err.response && err.response.status === 400) console.log("✅ User 3 correctly blocked from direct registration");
            else throw err;
        }

        // User 3 Joins Waitlist
        await axios.post(`${API_URL}/events/${standardEventId}/waitlist`, {}, { headers: { Authorization: `Bearer ${user3Token}` } });
        console.log("✅ User 3 joined Waitlist");


        // 5. MERCHANDISE PURCHASE
        console.log("\n--- 5. Merchandise Purchase ---");

        // User 1 Buys Hoodie (Stock 2 -> 1)
        await axios.post(`${API_URL}/events/${merchEventId}/purchase`,
            { itemName: 'Hoodie', size: 'L', color: 'Black', quantity: 1 },
            { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        console.log("✅ User 1 bought Hoodie");

        // User 1 Tries to Buy Again (Should Fail due to limit 1)
        try {
            await axios.post(`${API_URL}/events/${merchEventId}/purchase`,
                { itemName: 'Hoodie', size: 'L', color: 'Black', quantity: 1 },
                { headers: { Authorization: `Bearer ${user1Token}` } }
            );
            throw new Error("User 1 should be blocked by purchase limit");
        } catch (err) {
            if (err.response && err.response.status === 400) console.log("✅ User 1 blocked by purchase limit");
            else throw err;
        }

        // User 2 Buys Hoodie (Stock 1 -> 0)
        await axios.post(`${API_URL}/events/${merchEventId}/purchase`,
            { itemName: 'Hoodie', size: 'L', color: 'Black', quantity: 1 },
            { headers: { Authorization: `Bearer ${user2Token}` } }
        );
        console.log("✅ User 2 bought Hoodie");

        // User 3 Tries to Buy (Stock 0 -> Should Fail)
        try {
            await axios.post(`${API_URL}/events/${merchEventId}/purchase`,
                { itemName: 'Hoodie', size: 'L', color: 'Black', quantity: 1 },
                { headers: { Authorization: `Bearer ${user3Token}` } }
            );
            throw new Error("User 3 should be blocked by OOS");
        } catch (err) {
            if (err.response && err.response.status === 400) console.log("✅ User 3 blocked by Out of Stock");
            else throw err;
        }

        console.log("\n🎉 ALL SYSTEMS VERIFIED SUCCESSFULLY 🎉");
        process.exit(0);

    } catch (err) {
        console.error("\n❌ VERIFICATION FAILED:", err.message);
        if (err.response) console.error("Response Body:", err.response.data);
        process.exit(1);
    }
}

runVerification();
