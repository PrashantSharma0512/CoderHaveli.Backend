/**
 * News Process Worker
 * 
 * Stage 2 of the pipeline.
 * 
 * Consumes jobs from the "news-process" queue.
 * Each job contains { articleId }.
 * 
 * Flow:
 * 1. Load the News document from MongoDB
 * 2. Fetch the article URL with axios
 * 3. Extract clean text using jsdom + @mozilla/readability
 * 4. Update the News document with extracted content
 * 5. Add to "news-ai" queue for Gemini analysis
 * 
 * Concurrency: 2 (to avoid hammering websites)
 */

require("dotenv").config();

const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const connection = require("../configs/ioreis.config");
const { extractArticleContent } = require("../services/newsProcessor.service");
const createLogger = require("../utils/logger");

const log = createLogger("worker");

function detectCategory(title = "", tags = []) {
    const text = (title + " " + tags.join(" ")).toLowerCase();
    if (/ai|artificial intelligence|llm|gpt|gemini|claude|machine learning|openai/.test(text)) return "AI/ML";
    if (/cloud|aws|azure|gcp|google cloud/.test(text)) return "Cloud";
    if (/devops|docker|kubernetes|ci\/cd|container/.test(text)) return "DevOps";
    if (/security|vulnerability|hack|cve|malware|breach/.test(text)) return "Security";
    if (/web|javascript|typescript|react|next\.?js|node|css|html/.test(text)) return "Web Development";
    if (/mobile|android|ios|apple|swift|flutter/.test(text)) return "Mobile";
    if (/open[- ]source|github|git|linux/.test(text)) return "Open Source";
    return "General Tech";
}

const processWorker = new Worker(
    "news-process",
    async (job) => {

        const { articleId } = job.data;

        const News = mongoose.model("News");

        const article = await News.findById(articleId);

        if (!article) {
            log.warn(`Article not found: ${articleId}`);
            return { articleId, status: "not_found" };
        }

        log.info(`Extracting content: "${article.title}"`);

        const extracted = await extractArticleContent(article.articleUrl);

        const summary = (extracted && extracted.excerpt) 
            ? extracted.excerpt 
            : (article.content ? article.content.substring(0, 300) : article.title);

        const category = detectCategory(article.title, article.tags);

        await News.findByIdAndUpdate(articleId, {
            $set: {
                ...(extracted && extracted.content ? { content: extracted.content } : {}),
                ...(extracted && extracted.byline ? { author: extracted.byline } : {}),
                summary,
                category,
                processed: true
            }
        });

        log.success(`Article processed and marked ready: "${article.title}" (${category})`);

        return { articleId, status: "processed", category };

    },
    {
        connection,
        concurrency: 2
    }
);

processWorker.on("failed", (job, err) => {
    log.error(`Process job failed [${job?.data?.articleId}]:`, err.message);
});

module.exports = processWorker;
