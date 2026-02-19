const axios = require('axios');
const API_URL = 'http://localhost:5001/api';

async function verifyMerch() {
    try {
        console.log('--- Merch Verification ---');

        // 1. Admin Login
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@felicity.iiit.ac.in',
            password: 'admin123'
        });
        const adminToken = adminLogin.data.token;

        const orgRes = await axios.post(`${API_URL}/admin/create-organizer`, {
            organizerName: `Merch Club ${Date.now()}`,
            category: 'Fashion',
            contactEmail: 'shop@fest.org',
            description: 'We sell swag'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const { email: orgEmail, password: orgPassword } = orgRes.data.credentials;

        const orgLogin = await axios.post(`${API_URL}/auth/login`, { email: orgEmail, password: orgPassword });
        const orgToken = orgLogin.data.token;

        // 2. Create Merch Event
        // Explicitly set start/end dates that make it "ongoing" if that's required, 
        // OR just rely on status='published' if the backend allows it.
        // The error "purchases arent open" suggests status check failure.
        // Let's check eventRoutes: if (event.status !== 'published' && event.status !== 'ongoing')
        // So 'published' should work. 
        // UNLESS the previous run failed for some other reason? 
        // Ah, in verify_merch.js I sent status: 'published'. that should have worked.
        // Wait, 'registrationDeadline' check? "purchases arent open" comes from line 336:
        // if (event.status !== 'published' && event.status !== 'ongoing') return res.status(400).json({ error: 'purchases arent open' });
        // Maybe the default status override in CreateEvent or Model?
        // Model default is 'draft'.
        // My previous script sent status: 'published'.
        // BUT does the 'create event' endpoint ALLOW setting status directly?
        // backend/routes/eventRoutes.js line 20: 
        // ...req.body, status: 'draft' <-- IT FORCES DRAFT ON CREATE!
        // So I must create THEN publish.

        const eventRes = await axios.post(`${API_URL}/events`, {
            name: 'Swag Drop 2026',
            description: 'Exclusive Merch',
            type: 'merchandise',
            // status: 'published', // Ignored by backend
            registrationLimit: 0,
            purchaseLimitPerUser: 5,
            items: [
                { name: 'T-Shirt', size: 'M', color: 'Black', price: 500, stock: 10 },
                { name: 'Hoodie', size: 'L', color: 'Blue', price: 1200, stock: 2 }
            ]
        }, { headers: { Authorization: `Bearer ${orgToken}` } });
        const eventId = eventRes.data._id;
        console.log(`Event Created (Draft): ${eventId}`);

        // 2.5 Publish Event
        await axios.patch(`${API_URL}/events/${eventId}/status`, {
            status: 'published'
        }, { headers: { Authorization: `Bearer ${orgToken}` } });
        console.log('Event Published');

        // 3. User setup
        const userEmail = `shopper_${Date.now()}@iiit.ac.in`;
        await axios.post(`${API_URL}/auth/register`, {
            firstName: 'Shop', lastName: 'Aholic', email: userEmail, password: 'password123', participantType: 'iiit', contactNumber: '9999999999'
        });
        const userLogin = await axios.post(`${API_URL}/auth/login`, { email: userEmail, password: 'password123' });
        const userToken = userLogin.data.token;

        // 4. Buy Hoodie
        console.log('Buying Hoodie...');
        await axios.post(`${API_URL}/events/${eventId}/purchase`, {
            itemName: 'Hoodie',
            size: 'L',
            color: 'Blue',
            quantity: 1
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        console.log('Success! Hoodie purchased.');

        console.log('--- Merch Test Passed ---');

    } catch (err) {
        console.error('Test Failed:', err.response?.data || err.message);
        process.exit(1);
    }
}
verifyMerch();
