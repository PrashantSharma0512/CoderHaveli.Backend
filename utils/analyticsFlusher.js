const analyticsBuffer = require("./analyticsBuffer");
const mongoose = require("mongoose");

const Analytics = mongoose.model("Analytics");

const MAX_BATCH_SIZE = 1000;

let isFlushing = false;

async function flushAnalytics() {

    if (isFlushing) return;

    if (analyticsBuffer.length === 0) return;

    isFlushing = true;

    try {

        const batch = analyticsBuffer.splice(0, MAX_BATCH_SIZE);

        await Analytics.insertMany(batch);

        console.log(`Inserted ${batch.length} events`);

    } catch (err) {

        console.error(err);

    } finally {

        isFlushing = false;

    }
}

module.exports = flushAnalytics;