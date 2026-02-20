const jwt = require('jsonwebtoken');
const User = require('../models/User');

// middleware to check if user is logged in
const auth = async (req, res, next) => {
    try {
        const header = req.header('Authorization');
        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Please log in first' });
        }

        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // If an admin archived or disabled this account, reject further requests.
        // The user will effectively be logged out on their next interaction.
        if (user.isArchived) {
            return res.status(403).json({ error: 'This account has been deactivated by an administrator.' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// middleware to restrict routes to certain roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to do this' });
        }
        next();
    };
};

module.exports = { auth, authorize };
