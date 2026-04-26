// middleware/analytics.middleware.js
const { analyticsQueue } = require("../utils/queue");

const isBot = (userAgent = "") => {
    return /bot|crawler|spider|crawling/i.test(userAgent);
};

const AnalyticsMiddleware = (req, res, next) => {
    try {

        const userAgent = req.headers["user-agent"] || "";
        const metadata = { time: new Date() }

        if (!req.user?._id) {
            metadata.Authenicated_user = false;
        }

        if (isBot(userAgent)) return next();

        const event = {
            userId: req.user?._id || null,
            eventType: req.originalUrl.includes("/api") ? "API CALL" : "PAGE VIEW",
            metadata: metadata,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent
        };

        // fire-and-forget (NO await)
        analyticsQueue.add("track-event", event).catch(() => { });
    } catch (err) {
        // never break request flow
    }

    next();
};

module.exports = AnalyticsMiddleware;