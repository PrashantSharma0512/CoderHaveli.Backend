/**
 * News Fetch Worker
 * 
 * Stage 1 of the pipeline.
 * 
 * Consumes jobs from the "news-fetch" queue.
 * Each job contains a single RSS source { name, url }.
 * 
 * Flow:
 * 1. Parse the RSS feed using rss-parser
 * 2. For each article in the feed:
 *    - Generate a SHA-256 hash of the title for dedup
 *    - Upsert into the News collection (skip if already exists)
 *    - If newly inserted, add to "news-process" queue
 * 3. Logs results per source
 * 
 * Concurrency: 3 (fetch multiple RSS sources in parallel)
 */

require("dotenv").config();

const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const connection = require("../configs/ioreis.config");
const fetchRSS = require("../utils/parser");
const generateHash = require("../utils/hash");
const { processQueue } = require("../queues/news.queues");
const createLogger = require("../utils/logger");

const log = createLogger("worker");

const fetchWorker = new Worker(
    "news-fetch",
    async (job) => {

        const { name, url } = job.data;

        log.info(`Fetching RSS: ${name} → ${url}`);

        const articles = await fetchRSS(url);

        if (!articles || articles.length === 0) {
            log.warn(`No articles from ${name}`);
            return { source: name, fetched: 0, saved: 0 };
        }

        const MAX_ARTICLES_PER_SOURCE = parseInt(process.env.MAX_ARTICLES_PER_SOURCE) || 3;
        const targetArticles = articles.slice(0, MAX_ARTICLES_PER_SOURCE);
        log.info(`${name}: ${articles.length} articles found, processing top ${targetArticles.length}`);

        const News = mongoose.model("News");
        let saved = 0;

        for (const article of targetArticles) {

            const title = article.title || "";
            const articleUrl = article.link || "";

            if (!title || !articleUrl) continue;

            try {

                const hash = generateHash(title);

                // Check if article already exists
                const exists = await News.findOne({
                    $or: [{ hash }, { articleUrl }]
                });

                if (exists) continue;

                // Insert new article
                const news = await News.create({
                    title,
                    source: name,
                    articleUrl,
                    content: article.contentSnippet || article.content || "",
                    author: article.creator || article.author || "Unknown",
                    publishedAt: article.pubDate
                        ? new Date(article.pubDate)
                        : new Date(),
                    hash,
                    tags: article.categories || []
                });

                // Queue for content extraction (Stage 2)
                await processQueue.add(
                    `process-${news._id}`,
                    { articleId: news._id.toString() },
                    { jobId: `process-${news._id}` }
                );

                saved++;
                log.info(`New article saved: "${title}"`);

            } catch (error) {

                // E11000 = duplicate key — expected for concurrent fetches
                if (error.code === 11000) continue;

                log.error(`Error saving "${title}":`, error.message);

            }

        }

        log.success(`${name}: ${saved} new articles saved`);

        return { source: name, fetched: articles.length, saved };

    },
    {
        connection,
        concurrency: 3
    }
);

fetchWorker.on("failed", (job, err) => {
    log.error(`Fetch job failed [${job?.data?.name}]:`, err.message);
});

fetchWorker.on("completed", (job, result) => {
    log.success(`Fetch job completed: ${result?.source} (${result?.saved} new)`);
});

module.exports = fetchWorker;
