const { Queue } = require("bullmq");
const connection = require("../configs/ioreis.config");

const processQueue = new Queue("process-news", {
    connection,
    defaultJobOptions: {
        removeOnComplete: {
            age: 10 * 60,
        },
        removeOnFail: {
            age: 10 * 60,
        },
    },
});

module.exports = processQueue;