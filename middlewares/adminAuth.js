const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
    try {
        // If already authenticated by Authenticated middleware
        if (req.user && req.user.role === 'admin') {
            return next();
        }

        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Authentication token required' });
        }

        const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

        if (!decoded || decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admin access required' });
        }

        req.user = {
            _id: decoded.userId,
            role: decoded.role
        };

        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

module.exports = adminAuth;
