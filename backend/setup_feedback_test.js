const axios = require('axios');
const API_URL = 'https://felicity-backend-xwx8.onrender.com/api';

async function run() {
    try {
        console.log('1. Login as Admin...');
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@felicity.iiit.ac.in',
            password: 'admin123' // default from seedAdmin usually, let's check view_file output if this fails
        });
        const adminToken = adminLogin.data.token;
        console.log('Admin logged in.');

        console.log('2. Create Organizer...');
        const orgName = `TestOrg_${Date.now()}`;
        const orgEmail = `org_${Date.now()}@test.com`;
        const orgCreate = await axios.post(`${API_URL}/admin/create-organizer`, {
            organizerName: orgName,
            category: 'technical',
            contactEmail: orgEmail,
            description: 'Test Organizer'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });

        const { email: orgLoginEmail, password: orgPassword } = orgCreate.data.credentials;
        console.log(`Organizer created: ${orgLoginEmail} / ${orgPassword}`);

        console.log('3. Login as Organizer...');
        const orgLogin = await axios.post(`${API_URL}/auth/login`, {
            email: orgLoginEmail,
            password: orgPassword
        });
        const orgToken = orgLogin.data.token;

        console.log('4. Create Event...');
        const eventRes = await axios.post(`${API_URL}/events`, {
            name: `Feedback Test Event ${Date.now()}`,
            description: 'Event to test feedback system',
            startDate: new Date(Date.now() + 86400000).toISOString(),
            endDate: new Date(Date.now() + 172800000).toISOString(),
            type: 'normal',
            venue: 'Test Venue',
            registrationLimit: 100,
            registrationFee: 0,
            registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
            eligibility: 'open'
        }, { headers: { Authorization: `Bearer ${orgToken}` } });
        const eventId = eventRes.data._id;
        console.log(`Event Created: ${eventId}`);

        console.log('5. Publish Event...');
        await axios.patch(`${API_URL}/events/${eventId}/status`, { status: 'published' }, {
            headers: { Authorization: `Bearer ${orgToken}` }
        });
        console.log('Event Published.');

        console.log('6. Register Participant...');
        // Register a new participant
        const partEmail = `part_${Date.now()}@test.com`;
        const partPass = 'password123';
        await axios.post(`${API_URL}/auth/register`, {
            firstName: 'Test',
            lastName: 'Participant',
            email: partEmail,
            password: partPass,
            contactNumber: '1234567890',
            participantType: 'outsider',
            collegeName: 'Test College'
        });

        // Login Participant
        const partLogin = await axios.post(`${API_URL}/auth/login`, {
            email: partEmail,
            password: partPass
        });
        const partToken = partLogin.data.token;
        console.log(`Participant logged in: ${partEmail}`);

        // Register for event
        const regRes = await axios.post(`${API_URL}/events/${eventId}/register`, {}, {
            headers: { Authorization: `Bearer ${partToken}` }
        });
        const ticketId = regRes.data.ticketId;
        console.log(`Registered! Ticket ID: ${ticketId}`);

        console.log('7. Mark Attendance...');
        await axios.post(`${API_URL}/attendance/mark`, { ticketId }, {
            headers: { Authorization: `Bearer ${orgToken}` }
        });
        console.log('Attendance Marked.');

        console.log('---------------------------------------------------');
        console.log('SETUP COMPLETE');
        console.log(`Event ID: ${eventId}`);
        console.log(`Participant: ${partEmail} / ${partPass}`);
        console.log(`Organizer: ${orgLoginEmail} / ${orgPassword}`);
        console.log('---------------------------------------------------');

    } catch (err) {
        console.error('Setup Failed:', err.response?.data || err.message);
    }
}

run();
