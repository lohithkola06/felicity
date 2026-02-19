// Google reCAPTCHA v2 server-side verification middleware
// Validates the recaptchaToken sent from the frontend against Google's API

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;

async function verifyRecaptcha(req, res, next) {
    // skip verification if no secret key (dev mode)
    if (!RECAPTCHA_SECRET) {
        return next();
    }

    const { recaptchaToken } = req.body;

    if (!recaptchaToken) {
        return res.status(400).json({ error: 'Please complete the reCAPTCHA verification.' });
    }

    try {
        const params = new URLSearchParams({
            secret: RECAPTCHA_SECRET,
            response: recaptchaToken,
            remoteip: req.ip,
        });

        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        const data = await response.json();

        if (!data.success) {
            return res.status(400).json({ error: 'reCAPTCHA verification failed. Please try again.' });
        }

        next();
    } catch (err) {
        console.error('reCAPTCHA verification error:', err);
        return res.status(500).json({ error: 'Could not verify reCAPTCHA. Please try again.' });
    }
}

module.exports = { verifyRecaptcha };
