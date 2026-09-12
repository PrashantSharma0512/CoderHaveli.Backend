/**
 * Simple prefixed logger for the news pipeline.
 * Provides categorized console output without heavy dependencies.
 */

const PREFIXES = {
    news: "[NEWS]",
    worker: "[WORKER]",
    cron: "[CRON]",
    email: "[EMAIL]",
    ai: "[AI]",
    queue: "[QUEUE]",
    newsletter: "[NEWSLETTER]"
};

function createLogger(category) {

    const prefix = PREFIXES[category] || `[${category.toUpperCase()}]`;

    return {

        info: (...args) => console.log(`${prefix}`, ...args),

        error: (...args) => console.error(`${prefix} ❌`, ...args),

        warn: (...args) => console.warn(`${prefix} ⚠️`, ...args),

        success: (...args) => console.log(`${prefix} ✅`, ...args)

    };

}

module.exports = createLogger;
