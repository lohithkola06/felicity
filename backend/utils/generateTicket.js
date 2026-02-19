const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

// makes a unique ticket id and a qr code for it
async function generateTicket(eventName, email) {
    const ticketId = 'TKT-' + uuidv4().slice(0, 8).toUpperCase();
    const qrData = JSON.stringify({ ticketId, event: eventName, participant: email });
    const qrCode = await QRCode.toDataURL(qrData);
    return { ticketId, qrCode };
}

module.exports = generateTicket;
