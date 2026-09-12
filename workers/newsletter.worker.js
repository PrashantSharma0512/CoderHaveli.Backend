/**
 * Newsletter Worker
 * 
 * Stage 4 of the pipeline.
 * 
 * Consumes jobs from the "news-newsletter" queue.
 * Each job contains { date } — the target newsletter date.
 * 
 * Flow:
 * 1. Fetch top processed, non-duplicate, non-included articles
 * 2. Send all summaries to Gemini to generate consolidated HTML newsletter
 * 3. Save newsletter to Newsletter collection
 * 4. Mark articles as newsletter-included
 * 5. Add to "news-email" queue for delivery
 * 
 * Concurrency: 1 (only one newsletter should be generated at a time)
 */

require("dotenv").config();

const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const connection = require("../configs/ioreis.config");
const { getArticlesForNewsletter, createNewsletter, markArticlesAsIncluded } = require("../services/newsletter.service");
const { generateNewsletterContent } = require("../services/newsAi.service");
const { emailQueue } = require("../queues/news.queues");
const createLogger = require("../utils/logger");

const log = createLogger("newsletter");

const newsletterWorker = new Worker(
    "news-newsletter",
    async (job) => {

        const { date } = job.data;

        log.info(`Generating newsletter for: ${date}`);

        // Step 1: Get eligible articles
        const articles = await getArticlesForNewsletter(15);

        if (articles.length === 0) {
            log.warn("No articles available for newsletter — skipping");
            return { status: "skipped", reason: "no_articles" };
        }

        log.info(`Generating newsletter from ${articles.length} articles in 1 Gemini call...`);

        // Step 2: Generate consolidated HTML + structured article data via Gemini (1 single call)
        const aiResult = await generateNewsletterContent(articles);

        if (!aiResult || !aiResult.html) {
            log.error("Gemini failed to generate newsletter content");
            return { status: "failed", reason: "ai_generation_failed" };
        }

        const html = aiResult.html;

        // Step 3: Save newsletter to database
        const today = new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        });

        const newsletter = await createNewsletter({
            title: `CoderHaveli Daily — ${today}`,
            date: new Date(date),
            articles,
            html
        });

        // Step 4: Backfill AI summaries and categories to News documents & mark as included
        const News = mongoose.model("News");
        if (Array.isArray(aiResult.articles) && aiResult.articles.length > 0) {
            for (const item of aiResult.articles) {
                if (item.id) {
                    try {
                        await News.findByIdAndUpdate(item.id, {
                            $set: {
                                ...(item.summary ? { summary: item.summary } : {}),
                                ...(item.category ? { category: item.category } : {}),
                                ...(item.importanceScore ? { importanceScore: Number(item.importanceScore) } : {})
                            }
                        });
                    } catch (updateErr) {
                        log.warn(`Failed to update article ${item.id}:`, updateErr.message);
                    }
                }
            }
        }

        const articleIds = articles.map(a => a._id);
        await markArticlesAsIncluded(articleIds);

        // Step 5: Queue email delivery
        await emailQueue.add(
            `email-${newsletter._id}`,
            { newsletterId: newsletter._id.toString() },
            { jobId: `email-${newsletter._id}` }
        );

        log.success(`Newsletter generated and queued for email: ${newsletter._id}`);

        return {
            status: "generated",
            newsletterId: newsletter._id.toString(),
            articleCount: articles.length
        };

    },
    {
        connection,
        concurrency: 1
    }
);

newsletterWorker.on("failed", (job, err) => {
    log.error(`Newsletter job failed:`, err.message);
});

module.exports = newsletterWorker;
