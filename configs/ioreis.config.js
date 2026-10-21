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
    // Do NOT connect when the server boots - only connect when news pipeline runs
    lazyConnect: true,

    tls: {
        servername: parsedUrl.hostname,
    },

    retryStrategy() {
        // Stop reconnecting when idle/sleeping so it does NOT wake Layerbase
        return null;
    },
});

connection.on("connect", () => {
    console.log("✅ Connected to Layerbase Redis (News Pipeline Active)");
});

connection.on("ready", () => {
    console.log("✅ Layerbase Redis ready");
});

connection.on("error", (err) => {
    // Only log errors if the connection was not deliberately closed
    if (connection.status !== "end") {
        console.error("❌ Layerbase Redis Error:", err.message);
    }
});

connection.on("close", () => {
    console.log("💤 Layerbase Redis connection closed (Entering Sleep)");
});

module.exports = connection;