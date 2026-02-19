const axios = require('axios');
const API_URL = 'http://localhost:5001/api';

async function runTests() {
    try {
        console.log('--- Starting API Verification ---');

        // 1. Admin Login
        console.log('1. Admin Login...');
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@felicity.iiit.ac.in',
            password: 'admin123'
        });
        const adminToken = adminLogin.data.token;
        console.log('   Success! Token received.');

        // 2. Create Organizer
        console.log('2. Creating Organizer (Tech Club)...');
        const orgRes = await axios.post(`${API_URL}/admin/create-organizer`, {
            organizerName: `Tech Club ${Date.now()}`,
            category: 'Technical',
            contactEmail: 'contact@tech.org',
            description: 'Tech club description'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });

        const orgCreds = orgRes.data.credentials;
        console.log(`   Success! Organizer created: ${orgCreds.email} / ${orgCreds.password}`);

        // 3. Organizer Login
        console.log('3. Organizer Login...');
        const orgLogin = await axios.post(`${API_URL}/auth/login`, {
            email: orgCreds.email,
            password: orgCreds.password
        });
        const orgToken = orgLogin.data.token;
        console.log('   Success! Org Token received.');

        // 4. Create Event
        console.log('4. Creating Hackathon Event...');
        const eventRes = await axios.post(`${API_URL}/events`, {
            name: 'Test Hackathon 2026',
            description: 'A test event',
            startDate: new Date(Date.now() + 86400000).toISOString(),
            endDate: new Date(Date.now() + 172800000).toISOString(),
            registrationDeadline: new Date(Date.now() + 80000000).toISOString(),
            venue: 'Labs',
            type: 'normal',
            eligibility: 'all',
            registrationLimit: 100,
            registrationFee: 0,
            tags: ['coding', 'hackathon'],
            customForm: [{ label: 'Team', fieldType: 'text', required: true }]
        }, { headers: { Authorization: `Bearer ${orgToken}` } });
        const eventId = eventRes.data._id;
        console.log(`   Success! Event created: ${eventId}`);

        // 4.5 Publish Event
        console.log('4.5 Publishing Event...');
        await axios.patch(`${API_URL}/events/${eventId}/status`, {
            status: 'published'
        }, { headers: { Authorization: `Bearer ${orgToken}` } });
        console.log('   Success! Event published.');

        // 5. Participant Register
        console.log('5. Participant Registration...');
        const userEmail = `student_${Date.now()}@iiit.ac.in`;
        await axios.post(`${API_URL}/auth/register`, {
            firstName: 'Test',
            lastName: 'Student',
            email: userEmail,
            password: 'password123',
            participantType: 'iiit',
            contactNumber: '1234567890'
        });
        console.log('   Success! Participant registered.');

        // 6. Participant Login
        console.log('6. Participant Login...');
        const userLogin = await axios.post(`${API_URL}/auth/login`, {
            email: userEmail,
            password: 'password123'
        });
        const userToken = userLogin.data.token;
        console.log('   Success! Participant Token received.');

        // 7. Register for Event
        console.log('7. Registering for Hackathon...');
        await axios.post(`${API_URL}/events/${eventId}/register`, {
            formResponses: { 'Team': 'AlphaTeam' }
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        console.log('   Success! Registered for event.');

        console.log('--- ALL TESTS PASSED ---');

    } catch (err) {
        console.error('--- TEST FAILED ---');
        console.error(err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
        process.exit(1);
    }
}

runTests();
