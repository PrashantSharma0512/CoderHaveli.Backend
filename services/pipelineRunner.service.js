/**
 * News & Newsletter On-Demand Pipeline Runner
 * 
 * Instead of keeping 5 BullMQ workers continuously polling Redis 24/7
 * (which prevents free-tier Redis providers like Layerbase from entering sleep mode),
 * this runner:
 * 
 * 1. Spawns workers on-demand when cron or manual triggers fire.
 * 2. Enqueues the jobs into the BullMQ queues.
 * 3. Monitors queues until all jobs are processed and queues are drained.
 * 4. Gracefully closes all workers (releasing all Redis connections).
 * 
 * Result: Redis is 100% idle for ~23.5 hours every day.
 */

const { createFetchWorker } = require("../workers/newsFetch.worker");
const { createProcessWorker } = require("../workers/newsProcess.worker");
const { createNewsletterWorker } = require("../workers/newsletter.worker");
const { createEmailWorker } = require("../workers/newsEmail.worker");
const { fetchQueue, processQueue, newsletterQueue, emailQueue } = require("../queues/news.queues");
const { dispatchFetchJobs } = require("./newsfetcher.service");
const createLogger = require("../utils/logger");

const log = createLogger("pipeline");

let isIngestionRunning = false;
let isNewsletterRunning = false;

/**
 * Helper to wait until a list of queues are completely empty and inactive.
 * Ensures the pipeline has settled before shutting down workers.
 */
async function waitForQueuesToDrain(queues, maxWaitMs = 10 * 60 * 1000) {
    const startTime = Date.now();
    let consecutiveIdleChecks = 0;
    const REQUIRED_IDLE_CHECKS = 3; // Must be idle 3 checks in a row (6 seconds)
    const CHECK_INTERVAL_MS = 2000;

    while (Date.now() - startTime < maxWaitMs) {
        let totalActive = 0;
        let totalWaiting = 0;

        for (const queue of queues) {
            const active = await queue.getActiveCount();
            const waiting = await queue.getWaitingCount();
            const delayed = await queue.getDelayedCount();
            totalActive += active;
            totalWaiting += waiting + delayed;
        }

        if (totalActive === 0 && totalWaiting === 0) {
            consecutiveIdleChecks++;
            if (consecutiveIdleChecks >= REQUIRED_IDLE_CHECKS) {
                log.info("All pipeline queues are verified empty and idle.");
                return true;
            }
        } else {
            consecutiveIdleChecks = 0;
            log.info(`Pipeline in progress: ${totalActive} active, ${totalWaiting} waiting...`);
        }

        await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
    }

    log.warn(`Pipeline wait timed out after ${maxWaitMs / 1000}s. Closing workers anyway.`);
    return false;
}

/**
 * Stage 1 & 2: Run News Ingestion (RSS Fetch -> Content Extract)
 */
async function runNewsIngestionPipeline() {
    if (isIngestionRunning) {
        log.warn("News ingestion pipeline is already running. Skipping trigger.");
        return;
    }

    isIngestionRunning = true;
    log.info("🚀 Starting On-Demand News Ingestion Pipeline...");

    let fetchWorker = null;
    let processWorker = null;

    try {
        // 1. Start workers on demand
        fetchWorker = createFetchWorker();
        processWorker = createProcessWorker();
        log.info("On-demand fetch and process workers started.");

        // 2. Dispatch RSS fetch jobs
        await dispatchFetchJobs();

        // 3. Wait for all fetch and extraction jobs to finish
        await waitForQueuesToDrain([fetchQueue, processQueue]);

    } catch (err) {
        log.error("Error during news ingestion pipeline:", err.message);
    } finally {
        // 4. Shut down workers to allow Redis to sleep
        if (fetchWorker) {
            await fetchWorker.close();
            log.info("Fetch worker closed.");
        }
        if (processWorker) {
            await processWorker.close();
            log.info("Process worker closed.");
        }

        isIngestionRunning = false;
        log.success("✅ News Ingestion Pipeline finished. Workers disconnected. Redis is now idle.");
    }
}

/**
 * Stage 4 & 5: Run Newsletter Generation & Email Distribution
 */
async function runNewsletterPipeline(options = {}) {
    if (isNewsletterRunning) {
        log.warn("Newsletter pipeline is already running. Skipping trigger.");
        return;
    }

    isNewsletterRunning = true;
    log.info("🚀 Starting On-Demand Newsletter Pipeline...");

    let newsletterWorker = null;
    let emailWorker = null;

    try {
        // 1. Start workers on demand
        newsletterWorker = createNewsletterWorker();
        emailWorker = createEmailWorker();
        log.info("On-demand newsletter and email workers started.");

        // 2. Add newsletter job
        const targetDate = options.date || new Date().toISOString();
        const jobId = `newsletter-${Date.now()}`;
        await newsletterQueue.add(jobId, { date: targetDate }, { jobId });
        log.info(`Newsletter job queued [${jobId}]`);

        // 3. Wait for newsletter generation and email sending to finish
        await waitForQueuesToDrain([newsletterQueue, emailQueue]);

    } catch (err) {
        log.error("Error during newsletter pipeline:", err.message);
    } finally {
        // 4. Shut down workers to allow Redis to sleep
        if (newsletterWorker) {
            await newsletterWorker.close();
            log.info("Newsletter worker closed.");
        }
        if (emailWorker) {
            await emailWorker.close();
            log.info("Email worker closed.");
        }

        isNewsletterRunning = false;
        log.success("✅ Newsletter Pipeline finished. Workers disconnected. Redis is now idle.");
    }
}

module.exports = {
    runNewsIngestionPipeline,
    runNewsletterPipeline
};
