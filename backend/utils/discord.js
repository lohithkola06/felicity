// discord webhook helper - posts to a channel when events go live

async function sendDiscordNotification(webhookUrl, event) {
    if (!webhookUrl) return;

    try {
        const embed = {
            title: `🎉 New Event: ${event.name}`,
            description: event.description?.slice(0, 200) || '',
            color: event.type === 'merchandise' ? 0xff69b4 : 0x7c3aed, // pink for merch, purple for normal
            fields: [
                { name: 'Type', value: event.type, inline: true },
                { name: 'Eligibility', value: event.eligibility || 'all', inline: true },
            ],
        };

        if (event.startDate) {
            embed.fields.push({ name: 'Date', value: new Date(event.startDate).toLocaleDateString(), inline: true });
        }
        if (event.registrationFee > 0) {
            embed.fields.push({ name: 'Fee', value: `₹${event.registrationFee}`, inline: true });
        }
        if (event.venue) {
            embed.fields.push({ name: 'Venue', value: event.venue, inline: true });
        }

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: '📢 A new event just dropped!',
                embeds: [embed],
            }),
        });
        console.log('discord webhook sent for:', event.name);
    } catch (err) {
        // dont crash if webhook fails
        console.log('discord webhook failed:', err.message);
    }
}

module.exports = { sendDiscordNotification };
