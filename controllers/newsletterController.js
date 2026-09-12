/**
 * Newsletter Controller
 * 
 * Handles API requests for:
 * - User newsletter subscription/unsubscription
 * - Fetching latest newsletter and history
 * - Fetching processed news articles
 * - Manual trigger for newsletter generation (admin)
 */

const mongoose = require("mongoose");
const { getLatestNewsletter, getNewsletterHistory } = require("../services/newsletter.service");
const { newsletterQueue } = require("../queues/news.queues");
const createLogger = require("../utils/logger");

const log = createLogger("newsletter");

/**
 * POST /api/newsletter/subscribe
 * Subscribe the authenticated user to the newsletter.
 */
async function subscribe(req, res) {

    try {

        const User = mongoose.model("User");

        await User.findByIdAndUpdate(req.user._id, {
            $set: { news_subscribe: true }
        });

        res.json({
            success: true,
            message: "Successfully subscribed to the newsletter!"
        });

    } catch (error) {

        log.error("Subscribe error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to subscribe"
        });

    }

}

/**
 * POST /api/newsletter/unsubscribe
 * Unsubscribe the authenticated user from the newsletter.
 */
async function unsubscribe(req, res) {

    try {

        const User = mongoose.model("User");

        await User.findByIdAndUpdate(req.user._id, {
            $set: { news_subscribe: false }
        });

        res.json({
            success: true,
            message: "Successfully unsubscribed from the newsletter"
        });

    } catch (error) {

        log.error("Unsubscribe error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to unsubscribe"
        });

    }

}

/**
 * GET /api/newsletter/status
 * Get the current user's subscription status.
 */
async function getStatus(req, res) {

    try {

        const User = mongoose.model("User");

        const user = await User.findById(req.user._id)
            .select("news_subscribe")
            .lean();

        res.json({
            success: true,
            subscribed: user?.news_subscribe || false
        });

    } catch (error) {

        log.error("Status error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch status"
        });

    }

}

/**
 * GET /api/newsletter/latest
 * Get the most recent newsletter (public).
 */
async function latest(req, res) {

    try {

        const newsletter = await getLatestNewsletter();

        if (!newsletter) {
            return res.status(404).json({
                success: false,
                message: "No newsletters available yet"
            });
        }

        res.json({
            success: true,
            newsletter
        });

    } catch (error) {

        log.error("Latest newsletter error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch newsletter"
        });

    }

}

/**
 * GET /api/newsletter/history?page=1&limit=10
 * Get paginated newsletter history (public).
 */
async function history(req, res) {

    try {

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        const result = await getNewsletterHistory(page, limit);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {

        log.error("History error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch history"
        });

    }

}

/**
 * GET /api/newsletter/news?page=1&limit=20
 * Get latest processed news articles (public).
 */
async function getNews(req, res) {

    try {

        const News = mongoose.model("News");

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [articles, total] = await Promise.all([
            News.find({ processed: true, duplicate: false })
                .sort({ importanceScore: -1, publishedAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("title source summary category tags importanceScore publishedAt createdAt")
                .lean(),
            News.countDocuments({ processed: true, duplicate: false })
        ]);

        res.json({
            success: true,
            articles,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {

        log.error("News error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch news"
        });

    }

}

/**
 * POST /api/newsletter/generate (admin only)
 * Manually trigger newsletter generation.
 */
async function triggerGenerate(req, res) {

    try {

        await newsletterQueue.add(
            `manual-newsletter-${Date.now()}`,
            { date: new Date().toISOString() },
            { jobId: `manual-newsletter-${Date.now()}` }
        );

        res.json({
            success: true,
            message: "Newsletter generation queued"
        });

    } catch (error) {

        log.error("Manual trigger error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to trigger newsletter generation"
        });

    }

}

module.exports = {
    subscribe,
    unsubscribe,
    getStatus,
    latest,
    history,
    getNews,
    triggerGenerate
};
