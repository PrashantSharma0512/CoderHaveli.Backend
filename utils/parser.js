const Parser = require("rss-parser");

const parser = new Parser({
    timeout: 10000
});

async function fetchRSS(url) {

    try {

        const feed = await parser.parseURL(url);

        return feed.items;

    } catch (error) {

        console.error(error.message);

        return [];
    }

}

module.exports = fetchRSS;