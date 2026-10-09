/**
 * News Cron Scheduler (On-Demand BullMQ Workers)
 * 
 * 1. RSS Fetch (Every day at 8:00 AM IST):
 *    Spawns workers, fetches RSS feeds, extracts content, and closes workers.
 * 
 * 2. Daily Newsletter (Every day at 8:30 AM IST):
 *    Spawns workers, generates daily digest with Gemini, sends emails, and closes workers.
 * 
 * Workers are closed after jobs finish, allowing Layerbase Redis to sleep when idle.
 */

const cron = require("node-cron");
const { runNewsIngestionPipeline, runNewsletterPipeline } = require("../services/pipelineRunner.service");
const createLogger = require("../utils/logger");

const log = createLogger("cron");

// ── RSS Fetch: 8:00 AM IST ──────────────────────────
cron.schedule("0 8 * * *", async () => {
    log.info("Scheduled RSS fetch starting...");
    try {
        await runNewsIngestionPipeline();
    } catch (error) {
        log.error("RSS fetch cron failed:", error.message);
    }
});

log.success("RSS fetch cron registered (8:00 AM IST - On Demand)");

// ── Daily Newsletter: 8:30 AM IST ───────────────
cron.schedule("30 8 * * *", async () => {
    log.info("Daily newsletter generation starting...");
    try {
        await runNewsletterPipeline({ date: new Date().toISOString() });
    } catch (error) {
        log.error("Newsletter cron failed:", error.message);
    }
});

log.success("Daily newsletter cron registered (8:30 AM IST - On Demand)");