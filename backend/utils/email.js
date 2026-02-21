// email helper - sends tickets and confirmations
// uses ethereal in dev, real resend api in prod

const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const resend = process.env.SMTP_PASS ? new Resend(process.env.SMTP_PASS) : null;

// lazy init the transport so it doesnt slow startup
let transporter = null;

async function getTestTransporter() {
    if (transporter) return transporter;

    // fallback to ethereal for dev/testing
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('using ethereal email for testing');
    console.log('preview url: https://ethereal.email/login');
    console.log(`ethereal creds: ${testAccount.user} / ${testAccount.pass}`);

    return transporter;
}

// helper to send emails. uses Resend SDK in prod, ethereal in dev
async function dispatchEmail(options) {
    if (resend) {
        // Send via Resend HTTPS API
        const { data, error } = await resend.emails.send({
            from: process.env.SMTP_FROM || '"Felicity" <onboarding@resend.dev>',
            to: options.to,
            subject: options.subject,
            html: options.html
        });

        if (error) {
            console.error('email send failed via Resend:', error);
            throw error;
        }
        return data;
    } else {
        // Send via Nodemailer Ethereal SMTP
        const transport = await getTestTransporter();
        const info = await transport.sendMail({
            from: '"Felicity (Local)" <noreply@felicity.app>',
            ...options
        });

        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) console.log('email preview:', preview);
        return info;
    }
}

// send registration confirmation with ticket
async function sendTicketEmail(to, eventName, ticketId, qrCodeDataUrl) {
    try {
        return await dispatchEmail({
            to,
            subject: `🎟️ registration confirmed - ${eventName}`,
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
                    <h2>You're registered! 🎉</h2>
                    <p>Event: <strong>${eventName}</strong></p>
                    <p>Ticket ID: <strong>${ticketId}</strong></p>
                    <p>Show this QR code at the venue:</p>
                    <img src="${qrCodeDataUrl}" alt="QR Code" style="width:200px;height:200px;" />
                    <p style="color:#888;margin-top:20px;">— Felicity</p>
                </div>
            `
        });
    } catch (err) {
        // dont crash the app if email fails, just log it
        console.log('email send failed:', err.message);
    }
}

// send purchase confirmation for merch
async function sendMerchEmail(to, eventName, ticketId, itemName, qrCodeDataUrl) {
    try {
        return await dispatchEmail({
            to,
            subject: `🛍️ purchase confirmed - ${itemName}`,
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
                    <h2>Purchase Confirmed! 🛍️</h2>
                    <p>Event: <strong>${eventName}</strong></p>
                    <p>Item: <strong>${itemName}</strong></p>
                    <p>Ticket ID: <strong>${ticketId}</strong></p>
                    <img src="${qrCodeDataUrl}" alt="QR Code" style="width:200px;height:200px;" />
                    <p style="color:#888;margin-top:20px;">— Felicity</p>
                </div>
            `
        });
    } catch (err) {
        console.log('email send failed:', err.message);
    }
}

// notify waitlisted user that a spot opened
async function sendWaitlistNotification(to, eventName, eventId) {
    try {
        return await dispatchEmail({
            to,
            subject: `🎫 Spot opened - ${eventName}`,
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
                    <h2>Good news! 🎉</h2>
                    <p>A spot has opened up for <strong>${eventName}</strong>.</p>
                    <p>If you're still interested, please register as soon as possible before someone else grabs it!</p>
                    <p><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/events/${eventId}">Go to Event Page</a></p>
                    <p style="color:#888;margin-top:20px;">— Felicity</p>
                </div>
            `
        });
    } catch (err) {
        console.log('waitlist email failed:', err.message);
    }
}

module.exports = { sendTicketEmail, sendMerchEmail, sendWaitlistNotification };
