/**
 * News AI Worker
 * 
 * Stage 3 of the pipeline.
 * 
 * Consumes jobs from the "news-ai" queue.
 * Each job contains { articleId }.
 * 
 * Flow:
 * 1. Load the News document
 * 2. Fetch recent article titles for duplicate detection
 * 3. Send content + title to Gemini for analysis
 * 4. Update News with: summary, category, tags, importanceScore, duplicate flag
 * 5. Mark as processed
 * 
 * Concurrency: 2 (to respect Gemini API rate limits)
 */

require("dotenv").config();

const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const connection = require("../configs/ioreis.config");
const { analyzeArticle } = require("../services/newsAi.service");
const createLogger = require("../utils/logger");

const log = createLogger("ai");

const aiWorker = new Worker(
    "news-ai",
    async (job) => {

        const { articleId } = job.data;

        const News = mongoose.model("News");

        const article = await News.findById(articleId);

        if (!article) {
            log.warn(`Article not found: ${articleId}`);
            return { articleId, status: "not_found" };
        }

        if (article.processed) {
            log.info(`Already processed: "${article.title}"`);
            return { articleId, status: "already_processed" };
        }

        log.info(`AI analyzing: "${article.title}"`);

        // Get recent processed article titles for duplicate detection
        const recentArticles = await News.find({
            processed: true,
            _id: { $ne: article._id },
            createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
        })
            .select("title")
            .lean();

        const existingTitles = recentArticles.map(a => a.title);

        const content = article.content || article.title;

        const result = await analyzeArticle(article.title, content, existingTitles);

        // Update the article with AI results
        await News.findByIdAndUpdate(articleId, {
            $set: {
                summary: result.summary,
                category: result.category,
                tags: result.tags,
                importanceScore: result.importanceScore,
                duplicate: result.isDuplicate,
                processed: true
            }
        });

        log.success(`AI done: "${article.title}" → ${result.category} (${result.importanceScore}/10)${result.isDuplicate ? " [DUPLICATE]" : ""}`);

        return {
            articleId,
            status: "analyzed",
            category: result.category,
            score: result.importanceScore,
            isDuplicate: result.isDuplicate
        };

    },
    {
        connection,
        concurrency: 2
    }
);

aiWorker.on("failed", (job, err) => {
    log.error(`AI job failed [${job?.data?.articleId}]:`, err.message);
});

module.exports = aiWorker;
