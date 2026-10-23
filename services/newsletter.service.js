/**
 * Newsletter Service
 * 
 * Business logic for newsletter operations:
 * - Fetching articles eligible for newsletter inclusion
 * - Creating newsletter records in MongoDB
 * - Marking articles as included in a newsletter
 */

const mongoose = require("mongoose");
const createLogger = require("../utils/logger");

const log = createLogger("newsletter");

/**
 * Get processed, non-duplicate articles that haven't been
 * included in a newsletter yet. Sorted by importance score.
 */
async function getArticlesForNewsletter(limit = 15) {

    const News = mongoose.model("News");

    const articles = await News.find({
        processed: true,
        duplicate: false,
        newsletterIncluded: false
    })
        .sort({ importanceScore: -1, publishedAt: -1 })
        .limit(limit)
        .lean();

    log.info(`Found ${articles.length} articles for newsletter`);

    return articles;

}

/**
 * Get articles specifically tailored for System Design & Node.js newsletter.
 * Prioritizes System Design and Node.js categories, with fallback to technical Cloud/DevOps.
 */
async function getArticlesForSystemDesignNewsletter(limit = 10) {

    const News = mongoose.model("News");

    // 1. First priority: Articles explicitly categorized as System Design or Node.js
    let articles = await News.find({
        processed: true,
        duplicate: false,
        newsletterIncluded: false,
        category: { $in: ["System Design", "Node.js"] }
    })
        .sort({ importanceScore: -1, publishedAt: -1 })
        .limit(limit)
        .lean();

    // 2. If fewer than limit, find articles matching relevant technical keywords
    if (articles.length < limit) {
        const existingIds = articles.map(a => a._id);
        const remainingLimit = limit - articles.length;

        const additional = await News.find({
            _id: { $nin: existingIds },
            processed: true,
            duplicate: false,
            newsletterIncluded: false,
            $or: [
                { category: { $in: ["Cloud", "DevOps", "Open Source", "Web Development"] } },
                { title: { $regex: /architecture|scale|distributed|node|redis|database|system|performance|event loop|microservice/i } }
            ]
        })
            .sort({ importanceScore: -1, publishedAt: -1 })
            .limit(remainingLimit)
            .lean();

        articles = [...articles, ...additional];
    }

    log.info(`Found ${articles.length} articles for System Design & Node.js newsletter`);

    return articles;

}

/**
 * Create a newsletter record in the database.
 */
async function createNewsletter({ title, date, articles = [], html, markdown, type = "daily" }) {

    const Newsletter = mongoose.model("NewsLetter");

    const newsletter = await Newsletter.create({
        title,
        date,
        type,
        articles: (articles || []).map(a => a._id).filter(Boolean),
        totalArticles: (articles || []).length,
        html,
        markdown: markdown || "",
        status: "generated"
    });

    log.success(`Newsletter created [${type}]: ${newsletter._id}`);

    return newsletter;

}

/**
 * Mark articles as included in a newsletter so they
 * won't be picked up again.
 */
async function markArticlesAsIncluded(articleIds) {

    if (!articleIds || articleIds.length === 0) return;

    const News = mongoose.model("News");

    await News.updateMany(
        { _id: { $in: articleIds } },
        { $set: { newsletterIncluded: true } }
    );

    log.info(`Marked ${articleIds.length} articles as newsletter-included`);

}

/**
 * Get the latest newsletter. Optionally filter by type ('daily' or 'system_design').
 */
async function getLatestNewsletter(type) {

    const Newsletter = mongoose.model("NewsLetter");

    const query = { status: { $in: ["generated", "sent"] } };
    if (type) {
        query.type = type;
    }

    return Newsletter.findOne(query)
        .sort({ createdAt: -1 })
        .populate("articles", "title source category tags importanceScore publishedAt")
        .lean();

}

/**
 * Get newsletter history with pagination. Optionally filter by type.
 */
async function getNewsletterHistory(page = 1, limit = 10, type) {

    const Newsletter = mongoose.model("NewsLetter");

    const skip = (page - 1) * limit;

    const query = { status: { $in: ["generated", "sent"] } };
    if (type) {
        query.type = type;
    }

    const [newsletters, total] = await Promise.all([
        Newsletter.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("title date type totalArticles status sentAt createdAt")
            .lean(),
        Newsletter.countDocuments(query)
    ]);

    return {
        newsletters,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };

}

module.exports = {
    getArticlesForNewsletter,
    getArticlesForSystemDesignNewsletter,
    createNewsletter,
    markArticlesAsIncluded,
    getLatestNewsletter,
    getNewsletterHistory
};
