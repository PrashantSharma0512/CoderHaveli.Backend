/**
 * News Processor Service
 * 
 * Extracts clean, readable article content from a URL using:
 * - axios: HTTP client to fetch the raw HTML page
 * - jsdom: Parses the HTML string into a DOM tree
 * - @mozilla/readability: Mozilla's algorithm to strip ads, nav,
 *   footers, and extract just the main article text
 * 
 * This gives us clean text to feed into Gemini for AI analysis.
 */

const axios = require("axios");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const createLogger = require("../utils/logger");

const log = createLogger("worker");

async function extractArticleContent(articleUrl) {

    try {

        const { data: html } = await axios.get(articleUrl, {
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; CoderHaveliBot/1.0)"
            }
        });

        const dom = new JSDOM(html, { url: articleUrl });

        const reader = new Readability(dom.window.document);

        const article = reader.parse();

        if (!article || !article.textContent) {
            log.warn(`Readability returned empty for: ${articleUrl}`);
            return null;
        }

        // Clean up excessive whitespace
        const cleanText = article.textContent
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 8000); // Limit to avoid oversized Gemini prompts

        return {
            content: cleanText,
            excerpt: article.excerpt || "",
            byline: article.byline || ""
        };

    } catch (error) {

        log.error(`Failed to extract content from ${articleUrl}:`, error.message);
        return null;

    }

}

module.exports = { extractArticleContent };
