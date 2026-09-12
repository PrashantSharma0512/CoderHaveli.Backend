const { Queue } = require("bullmq");
const connection = require("../configs/ioreis.config");

const processQueue = new Queue("process-news", {
    connection
});

module.exports = processQueue;