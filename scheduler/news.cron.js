/**
 * News Cron Scheduler
 * 
 * Two scheduled jobs:
 * 
 * 1. RSS Fetch (every 30 minutes):
 *    Dispatches all RSS sources to the fetch queue.
 *    The pipeline then flows: Fetch → Process → AI automatically.
 * 
 * 2. Daily Newsletter (every day at 8:00 AM IST):
 *    Adds a newsletter generation job to the newsletter queue.
 *    The pipeline then flows: Newsletter → Email automatically.
 */

const cron = require("node-cron");
const { dispatchFetchJobs } = require("../services/newsfetcher.service");
const { newsletterQueue } = require("../queues/news.queues");
const createLogger = require("../utils/logger");

const log = createLogger("cron");

// ── RSS Fetch: 6:00 AM  ──────────────────────────

cron.schedule("0 6 * * *", async () => {

    log.info("Scheduled RSS fetch starting...");

    try {

        await dispatchFetchJobs();

    } catch (error) {

        log.error("RSS fetch cron failed:", error.message);

    }

});

log.success("RSS fetch cron registered 6: 00 AM");

// ── Daily Newsletter: 8:00 AM IST (2:30 AM UTC) ─────────

cron.schedule("56 12 * * *", async () => { 

    log.info("Daily newsletter generation starting...");

    try {

        await newsletterQueue.add(
            `daily-newsletter-${Date.now()}`,
            { date: new Date().toISOString() },
            { jobId: `daily-newsletter-${Date.now()}` }
        );

        log.success("Newsletter generation job queued");

    } catch (error) {

        log.error("Newsletter cron failed:", error.message);

    }

});

log.success("Daily newsletter cron registered (8:00 AM IST)");