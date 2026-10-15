const { createClient } = require("redis");

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

const client = createClient({
    username: "default",
    password: process.env.REDIS_PASS,
    // Note: pingInterval removed to allow Layerbase Free tier to sleep when idle

    socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,

        // Layerbase requires TLS
        tls: true,

        // IMPORTANT: Layerbase requires SNI
        servername: REDIS_HOST,

        reconnectStrategy(retries) {
            // If the server closed the connection because it entered idle sleep mode,
            // stop retrying after 3 attempts so it can sleep peacefully.
            // connectRedis() will automatically reconnect on the next request.
            if (retries > 3) {
                console.log("Redis is idle/sleeping. Will reconnect on next user request.");
                return false;
            }
            return Math.min(retries * 200, 2000);
        },
    },
});

client.on("error", (err) => {
    console.error("Redis Client Error:", err);
});

client.on("connect", () => {
    console.log("Redis connecting...");
});

client.on("ready", () => {
    console.log("Redis connected and ready");
});

client.on("reconnecting", () => {
    console.log("Redis reconnecting...");
});

client.on("end", () => {
    console.log("Redis connection closed");
});

async function connectRedis() {
    if (!client.isOpen) {
        await client.connect();
    }

    return client;
}

module.exports = connectRedis;