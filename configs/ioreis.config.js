require("dotenv").config();

const IORedis = require("ioredis");

const redisUrl = process.env.LAYERBASE_REDIS_URL;

if (!redisUrl) {
    throw new Error("LAYERBASE_REDIS_URL is not defined");
}

const parsedUrl = new URL(redisUrl);

const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // Note: keepAlive removed to allow Layerbase Free tier to sleep when idle

    tls: {
        servername: parsedUrl.hostname,
    },

    retryStrategy(times) {
        // Back off exponentially up to 30s when idle/sleeping
        return Math.min(times * 1000, 30000);
    },
});

connection.on("connect", () => {
    console.log("✅ Connected to Layerbase Redis");
});

connection.on("ready", () => {
    console.log("✅ Layerbase Redis ready");
});

connection.on("error", (err) => {
    console.error("❌ Layerbase Redis Error:", err.message);
});

connection.on("close", () => {
    console.log("⚠️ Layerbase Redis connection closed");
});

module.exports = connection;