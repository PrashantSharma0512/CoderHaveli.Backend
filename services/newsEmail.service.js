/**
 * News Email Service
 * 
 * Sends newsletter HTML emails to subscribed users
 * using Resend.
 */

const mongoose = require("mongoose");
const Mailer = require("../utils/Mailer");
const createLogger = require("../utils/logger");

const log = createLogger("email");

/**
 * Get all users subscribed to the newsletter.
 */
async function getSubscribedUsers() {
    const User = mongoose.model("User");

    const users = await User.find(
        { news_subscribe: true, isDeleted: false },
        { email: 1, name: 1 }
    ).lean();

    log.info(`Found ${users.length} newsletter subscribers`);
    return users;
}

/**
 * Send a newsletter email to a single user.
 */
async function sendNewsletterEmail(to, subject, html) {
    try {
        const from = process.env.RESEND_FROM_EMAIL || "CoderHaveli Daily <onboarding@resend.dev>";

        await Mailer.sendMail({
            from,
            to,
            subject,
            html
        });

        return true;
    } catch (error) {
        log.error(`Failed to send email to ${to}:`, error.message);
        return false;
    }
}

/**
 * Send newsletter to all subscribed users with a small
 * delay between sends to respect provider rate limits.
 */
async function sendToAllSubscribers(subject, html) {
    const users = await getSubscribedUsers();

    if (users.length === 0) {
        log.warn("No subscribers found — skipping email send");
        return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const user of users) {
        const success = await sendNewsletterEmail(user.email, subject, html);

        if (success) {
            sent++;
        } else {
            failed++;
        }

        // 600ms delay between emails to stay within rate limits (e.g. Resend free tier: 2 req/sec)
        if (users.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 600));
        }
    }

    log.success(`Newsletter sent: ${sent} delivered, ${failed} failed`);
    return { sent, failed };
}

module.exports = {
    getSubscribedUsers,
    sendNewsletterEmail,
    sendToAllSubscribers
};
