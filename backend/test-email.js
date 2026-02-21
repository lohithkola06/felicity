require('dotenv').config();

// Inject Resend testing credentials into the environment BEFORE requiring the email utility 
// so the Resend wrapper initializes with the key.
process.env.SMTP_PASS = 're_2V12pE6n_KsPERPMeMtftjDC4uc4GAhgE';
process.env.SMTP_FROM = '"Felicity" <onboarding@resend.dev>';

const { sendTicketEmail } = require('./utils/email');

async function test() {
    console.log('Testing HTTPS Resend Dispatcher...');
    try {
        await sendTicketEmail('lohithkola06@gmail.com', 'Test Event', 'TICKET-123', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        console.log('Email dispatched successfully via HTTPS!');
    } catch (err) {
        console.error('Email sending failed:', err);
    }
}

test();
