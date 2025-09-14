// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const Authenicated = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1]; // Expect: "Bearer <accessToken>"

    if (!token) {
        return res.status(401).json({ message: 'Access token missing' });
    }

    jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = decoded; // Attach user info to request
        next();
    });
};

module.exports = Authenicated;
