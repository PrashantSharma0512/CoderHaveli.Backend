const { createClient } = require("redis");

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

const client = createClient({
    username: "default",
    password: process.env.REDIS_PASS,
    pingInterval: 30000, // Periodically ping Redis to prevent idle timeout

    socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,

        // Layerbase requires TLS
        tls: true,

        // IMPORTANT: Layerbase requires SNI
        servername: REDIS_HOST,
        keepAlive: 5000,

        reconnectStrategy(retries) {
            const delay = Math.min(retries * 100, 3000);
            console.log(`Redis reconnecting in ${delay}ms...`);
            return delay;
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