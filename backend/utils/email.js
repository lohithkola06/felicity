// email helper - sends tickets and confirmations
// uses ethereal in dev, real smtp in prod

const nodemailer = require('nodemailer');

// lazy init the transport so it doesnt slow startup
let transporter = null;

async function getTransporter() {
    if (transporter) return transporter;

    // check if real smtp is configured
    if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
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
    }
    return transporter;
}

// send registration confirmation with ticket
async function sendTicketEmail(to, eventName, ticketId, qrCodeDataUrl) {
    try {
        const transport = await getTransporter();

        let attachments = [];
        if (qrCodeDataUrl) {
            const base64Data = qrCodeDataUrl.split(',')[1];
            if (base64Data) {
                attachments.push({
                    filename: 'ticket-qr.png',
                    content: Buffer.from(base64Data, 'base64'),
                    contentType: 'image/png',
                    cid: 'qr_code'
                });
            }
        }

        const info = await transport.sendMail({
            from: process.env.SMTP_FROM || '"Felicity" <noreply@felicity.app>',
            to,
            subject: `🎟️ registration confirmed - ${eventName}`,
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
                    <h2>You're registered! 🎉</h2>
                    <p>Event: <strong>${eventName}</strong></p>
                    <p>Ticket ID: <strong>${ticketId}</strong></p>
                    ${qrCodeDataUrl ? '<div style="margin:20px 0;"><p>Show this QR at entry:</p><img src="cid:qr_code" alt="QR Code" width="220" style="max-width:100%; height:auto;" /></div>' : ''}
                    <p>You can view your Ticket and QR Code anytime in your Participant Dashboard.</p>
                    <p style="color:#888;margin-top:20px;">— Felicity</p>
                </div>
            `,
            attachments
        });
        // log preview url if using ethereal
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) console.log('email preview:', preview);
        return info;
    } catch (err) {
        // dont crash the app if email fails, just log it
        console.log('email send failed:', err.message);
    }
}

// send purchase confirmation for merch
async function sendMerchEmail(to, eventName, ticketId, itemName, qrCodeDataUrl) {
    try {
        const transport = await getTransporter();

        let attachments = [];
        if (qrCodeDataUrl) {
            const base64Data = qrCodeDataUrl.split(',')[1];
            if (base64Data) {
                attachments.push({
                    filename: 'merch-qr.png',
                    content: Buffer.from(base64Data, 'base64'),
                    contentType: 'image/png',
                    cid: 'qr_code'
                });
            }
        }

        const info = await transport.sendMail({
            from: process.env.SMTP_FROM || '"Felicity" <noreply@felicity.app>',
            to,
            subject: `🛍️ purchase confirmed - ${itemName}`,
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
                    <h2>Purchase Confirmed! 🛍️</h2>
                    <p>Event: <strong>${eventName}</strong></p>
                    <p>Item: <strong>${itemName}</strong></p>
                    <p>Ticket ID: <strong>${ticketId}</strong></p>
                    ${qrCodeDataUrl ? '<div style="margin:20px 0;"><p>Show this QR for pickup:</p><img src="cid:qr_code" alt="QR Code" width="220" style="max-width:100%; height:auto;" /></div>' : ''}
                    <p>You can view your QR Code anytime in your Participant Dashboard.</p>
                    <p style="color:#888;margin-top:20px;">— Felicity</p>
                </div>
            `,
            attachments
        });
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) console.log('email preview:', preview);
        return info;
    } catch (err) {
        console.log('email send failed:', err.message);
    }
}

// notify waitlisted user that a spot opened
async function sendWaitlistNotification(to, eventName, eventId) {
    try {
        const transport = await getTransporter();
        const info = await transport.sendMail({
            from: process.env.SMTP_FROM || '"Felicity" <noreply@felicity.app>',
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
            `,
        });
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) console.log('email preview:', preview);
        return info;
    } catch (err) {
        console.log('waitlist email failed:', err.message);
    }
}

module.exports = { sendTicketEmail, sendMerchEmail, sendWaitlistNotification };
