require("dotenv").config();
const IORedis = require("ioredis");

let upstashUrl = process.env.UPSTASH_URL || "";
if (upstashUrl.includes("upstash.io") && upstashUrl.startsWith("redis://")) {
    upstashUrl = upstashUrl.replace(/^redis:\/\//, "rediss://");
}

const connection = new IORedis(upstashUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

connection.on("connect", () => {
    console.log("✅ BullMQ connected to Upstash");
});

connection.on("error", (err) => {
    console.error("❌ BullMQ Redis Error:", err);
});

module.exports = connection;
