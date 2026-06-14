const analyticsBuffer = require("../utils/analyticsBuffer");
const flushAnalytics = require("../utils/analyticsFlusher");

const MAX_BATCH_SIZE = 1000;

const AnalyticsMiddleware = (req, res, next) => {

    analyticsBuffer.push({
        userId: req.user?._id || null,
        eventType: req.originalUrl.includes("/api")
            ? "API_CALL"
            : "PAGE_VIEW",
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
    });

    // High traffic -> flush immediately
    if (analyticsBuffer.length >= MAX_BATCH_SIZE) {
        flushAnalytics();
    }

    next();
};

module.exports = AnalyticsMiddleware;