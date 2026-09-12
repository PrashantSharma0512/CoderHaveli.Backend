/**
 * News Email Service
 * 
 * Sends newsletter HTML emails to subscribed users
 * using the existing Nodemailer/Gmail transporter.
 */

const mongoose = require("mongoose");
const transporter = require("../utils/Mailer");
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

        await transporter.sendMail({
            from: `"CoderHaveli Daily" <${process.env.MAIL_USER}>`,
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
 * delay between sends to avoid rate limiting.
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

        // 500ms delay between emails to avoid Gmail rate limits
        if (users.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
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
