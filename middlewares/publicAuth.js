const jwt = require('jsonwebtoken');

const publicAuth = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

        req.user = {
            _id: decoded.userId,
            role: decoded.role
        };

        next();
    } catch (err) {
        // Invalid token → treat as guest
        req.user = null;
        next();
    }
}
module.exports = publicAuth;