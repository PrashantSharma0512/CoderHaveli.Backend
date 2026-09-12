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
 * Create a newsletter record in the database.
 */
async function createNewsletter({ title, date, articles, html, markdown }) {

    const Newsletter = mongoose.model("NewsLetter");

    const newsletter = await Newsletter.create({
        title,
        date,
        articles: articles.map(a => a._id),
        totalArticles: articles.length,
        html,
        markdown: markdown || "",
        status: "generated"
    });

    log.success(`Newsletter created: ${newsletter._id}`);

    return newsletter;

}

/**
 * Mark articles as included in a newsletter so they
 * won't be picked up again.
 */
async function markArticlesAsIncluded(articleIds) {

    const News = mongoose.model("News");

    await News.updateMany(
        { _id: { $in: articleIds } },
        { $set: { newsletterIncluded: true } }
    );

    log.info(`Marked ${articleIds.length} articles as newsletter-included`);

}

/**
 * Get the latest newsletter.
 */
async function getLatestNewsletter() {

    const Newsletter = mongoose.model("NewsLetter");

    return Newsletter.findOne({ status: { $in: ["generated", "sent"] } })
        .sort({ createdAt: -1 })
        .populate("articles", "title source category tags importanceScore publishedAt")
        .lean();

}

/**
 * Get newsletter history with pagination.
 */
async function getNewsletterHistory(page = 1, limit = 10) {

    const Newsletter = mongoose.model("NewsLetter");

    const skip = (page - 1) * limit;

    const [newsletters, total] = await Promise.all([
        Newsletter.find({ status: { $in: ["generated", "sent"] } })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("title date totalArticles status sentAt createdAt")
            .lean(),
        Newsletter.countDocuments({ status: { $in: ["generated", "sent"] } })
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
    createNewsletter,
    markArticlesAsIncluded,
    getLatestNewsletter,
    getNewsletterHistory
};
