/**
 * News Email Worker
 * 
 * Stage 5 (final) of the pipeline.
 * 
 * Consumes jobs from the "news-email" queue.
 * Each job contains { newsletterId }.
 * 
 * Flow:
 * 1. Load the Newsletter document
 * 2. Find all users with news_subscribe: true
 * 3. Send the newsletter HTML to each subscriber
 * 4. Update newsletter status to "sent" with sentAt timestamp
 * 
 * Concurrency: 1 (sending emails sequentially with delay)
 */

require("dotenv").config();

const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const connection = require("../configs/ioreis.config");
const { sendToAllSubscribers } = require("../services/newsEmail.service");
const createLogger = require("../utils/logger");

const log = createLogger("email");

const emailWorker = new Worker(
    "news-email",
    async (job) => {

        const { newsletterId } = job.data;

        const Newsletter = mongoose.model("NewsLetter");

        const newsletter = await Newsletter.findById(newsletterId);

        if (!newsletter) {
            log.warn(`Newsletter not found: ${newsletterId}`);
            return { status: "not_found" };
        }

        if (newsletter.status === "sent") {
            log.info(`Newsletter already sent: ${newsletterId}`);
            return { status: "already_sent" };
        }

        log.info(`Sending newsletter: "${newsletter.title}"`);

        const subject = newsletter.title || "CoderHaveli Daily Tech Newsletter";

        const { sent, failed } = await sendToAllSubscribers(subject, newsletter.html);

        // Update newsletter status
        await Newsletter.findByIdAndUpdate(newsletterId, {
            $set: {
                status: "sent",
                sentAt: new Date()
            }
        });

        log.success(`Newsletter "${newsletter.title}" delivered: ${sent} sent, ${failed} failed`);

        return { status: "sent", sent, failed };

    },
    {
        connection,
        concurrency: 1
    }
);

emailWorker.on("failed", (job, err) => {
    log.error(`Email job failed [${job?.data?.newsletterId}]:`, err.message);
});

module.exports = emailWorker;
