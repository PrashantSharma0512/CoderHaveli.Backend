require('dotenv').config();

const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error(err));

require('../models/modal')(mongoose);

const { Worker } = require("bullmq");
const { connection } = require("../utils/queue");

const buffer = [];
const BATCH_SIZE = 5; // 👈 reduced

const flushBuffer = async () => {
    console.log("⏱ flush triggered | buffer:", buffer.length);

    if (buffer.length === 0) return;

    try {
        const Analytics = mongoose.model('Analytics');

        console.log("📦 inserting:", buffer.length);

        const res = await Analytics.insertMany(buffer);

        console.log("✅ inserted:", res.length);

        buffer.length = 0;
    } catch (err) {
        console.error("❌ insert failed:", err);
    }
};

setInterval(flushBuffer, 30000);

const worker = new Worker(
    "analytics-queue",
    async (job) => {

        buffer.push(job.data);

        if (buffer.length >= BATCH_SIZE) {
            await flushBuffer();
        }
    },
    {
        connection,
        concurrency: 5
    }
);

worker.on("ready", () => console.log("🚀 Worker ready"));
worker.on("failed", (job, err) => console.error("❌ job failed:", err));
worker.on("error", (err) => console.error("💥 worker error:", err));