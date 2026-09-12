/**
 * All BullMQ queues for the news pipeline.
 * 
 * Queues are lightweight — they only add jobs and don't process them.
 * Workers (in /workers) consume jobs from these queues.
 * 
 * All queues share the same Upstash Redis (ioredis) connection.
 */

const { Queue } = require("bullmq");
const connection = require("../configs/ioreis.config");

const defaultJobOptions = {
    attempts: 3,
    backoff: {
        type: "exponential",
        delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 50
};

// Stage 1: Fetch RSS feeds from each source
const fetchQueue = new Queue("news-fetch", {
    connection,
    defaultJobOptions
});

// Stage 2: Extract clean article content from URLs
const processQueue = new Queue("news-process", {
    connection,
    defaultJobOptions
});

// Stage 3: Gemini AI analysis (summary, tags, score, duplicates)
const aiQueue = new Queue("news-ai", {
    connection,
    defaultJobOptions
});

// Stage 4: Generate consolidated daily newsletter
const newsletterQueue = new Queue("news-newsletter", {
    connection,
    defaultJobOptions
});

// Stage 5: Send newsletter emails to subscribers
const emailQueue = new Queue("news-email", {
    connection,
    defaultJobOptions
});

module.exports = {
    fetchQueue,
    processQueue,
    aiQueue,
    newsletterQueue,
    emailQueue
};
