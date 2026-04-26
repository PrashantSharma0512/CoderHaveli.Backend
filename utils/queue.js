const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(process.env.UPSTASH_URL, {
    maxRetriesPerRequest: null,
    tls: {}
});

const analyticsQueue = new Queue("analytics-queue", {
    connection
});

module.exports = { analyticsQueue, connection };