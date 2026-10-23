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
const { getArticlesForNewsletter, getArticlesForSystemDesignNewsletter, getNextSystemDesignTopic, createNewsletter, markArticlesAsIncluded } = require("../services/newsletter.service");
const { generateNewsletterContent, generateSystemDesignNewsletterContent } = require("../services/newsAi.service");
const { emailQueue } = require("../queues/news.queues");
const createLogger = require("../utils/logger");

const log = createLogger("newsletter");

function createNewsletterWorker() {
    const newsletterWorker = new Worker(
        "news-newsletter",
        async (job) => {

            const { date, type = "daily" } = job.data;

            log.info(`Generating ${type} newsletter for: ${date}`);

            const today = new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            });

            let articles = [];
            let aiResult = null;
            let newsletterTitle = "";
            let topicName = "";

            if (type === "system_design") {
                // System Design & Node.js Newsletter with Curated Syllabus
                const curatedTopic = job.data.topic
                    ? (typeof job.data.topic === "string" ? { title: job.data.topic, systemDesignFocus: job.data.topic, nodeJsFocus: "Node.js backend internals" } : job.data.topic)
                    : await getNextSystemDesignTopic(job.data.topicIndex);

                topicName = curatedTopic ? curatedTopic.title : "System Design & Node.js";
                log.info(`Selected Curated Topic [Lesson ${curatedTopic?.syllabusIndex || 1}]: "${topicName}"`);

                articles = await getArticlesForSystemDesignNewsletter(10);
                log.info(`Generating System Design & Node.js newsletter (${articles.length} articles ingested)...`);

                aiResult = await generateSystemDesignNewsletterContent(articles, curatedTopic);

                if (!aiResult || !aiResult.html) {
                    log.error("Gemini failed to generate system design newsletter content");
                    return { status: "failed", reason: "ai_generation_failed" };
                }

                newsletterTitle = aiResult.title || `CoderHaveli Engineering — ${topicName} (${today})`;

            } else {
                // Standard Daily Tech Newsletter
                articles = await getArticlesForNewsletter(15);

                if (articles.length === 0) {
                    log.warn("No articles available for daily newsletter — skipping");
                    return { status: "skipped", reason: "no_articles" };
                }

                log.info(`Generating daily newsletter from ${articles.length} articles in 1 Gemini call...`);
                aiResult = await generateNewsletterContent(articles);

                if (!aiResult || !aiResult.html) {
                    log.error("Gemini failed to generate daily newsletter content");
                    return { status: "failed", reason: "ai_generation_failed" };
                }

                newsletterTitle = `CoderHaveli Daily — ${today}`;
            }

            const html = aiResult.html;

            // Step 3: Save newsletter to database
            const newsletter = await createNewsletter({
                title: newsletterTitle,
                topic: topicName,
                date: new Date(date),
                articles,
                html,
                type
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

            if (articles.length > 0) {
                const articleIds = articles.map(a => a._id);
                await markArticlesAsIncluded(articleIds);
            }

            // Step 5: Queue email delivery
            await emailQueue.add(
                `email-${newsletter._id}`,
                { newsletterId: newsletter._id.toString() },
                { jobId: `email-${newsletter._id}` }
            );

            log.success(`[${type}] Newsletter generated and queued for email: ${newsletter._id}`);

            return {
                status: "generated",
                newsletterId: newsletter._id.toString(),
                type,
                articleCount: articles.length
            };

        },
        {
            connection,
            concurrency: 1,
            settings: {
                lockDuration: 30000,
                lockRenewTime: 15000,
                stalledInterval: 5000,
                maxStalledCount: 2,
                retryProcessDelay: 5000
            }
        }
    );

    newsletterWorker.on("failed", (job, err) => {
        log.error(`Newsletter job failed:`, err.message);
    });

    return newsletterWorker;
}

module.exports = { createNewsletterWorker };
