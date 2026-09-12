/**
 * News Fetcher Service
 * 
 * Dispatches RSS source fetch jobs to the BullMQ fetch queue.
 * Each RSS source becomes a separate job so they are fetched
 * in parallel by the fetch worker.
 */

const newsSources = require("../configs/news.configs");
const { fetchQueue } = require("../queues/news.queues");
const createLogger = require("../utils/logger");

const log = createLogger("news");

async function dispatchFetchJobs() {

    log.info(`Dispatching ${newsSources.length} RSS source fetch jobs...`);

    for (const source of newsSources) {

        await fetchQueue.add(
            `fetch-${source.name}`,
            { name: source.name, url: source.url },
            {
                jobId: `fetch-${source.name}-${Date.now()}`,
            }
        );

    }

    log.success(`${newsSources.length} fetch jobs dispatched`);

}

module.exports = { dispatchFetchJobs };