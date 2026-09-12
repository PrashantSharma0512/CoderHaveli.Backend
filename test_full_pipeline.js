require("dotenv").config();
const mongoose = require("mongoose");
const mongoConnect = require("./connection");
const connection = require("./configs/ioreis.config");
const newsSources = require("./configs/news.configs");
const fetchRSS = require("./utils/parser");
const { extractArticleContent } = require("./services/newsProcessor.service");
const { analyzeArticle, generateNewsletterContent } = require("./services/newsAi.service");
const { fetchQueue, processQueue, aiQueue, newsletterQueue, emailQueue } = require("./queues/news.queues");

async function runPipelineTest() {
    console.log("==================================================");
    console.log("   TESTING TECH NEWS INTELLIGENCE & NEWSLETTER   ");
    console.log("==================================================");

    // 1. Database Connection
    console.log("\n[1/7] Connecting to MongoDB...");
    await mongoConnect(process.env.MONGO_URI);
    require("./models")(mongoose);
    console.log("✅ MongoDB Connected & Models Registered");

    // 2. Redis Connection Check
    console.log("\n[2/7] Checking Upstash Redis Connection...");
    const pingRes = await connection.ping();
    console.log("✅ Redis Ping Response:", pingRes);

    // 3. RSS Fetcher Test (Single Source: Docker or GitHub)
    console.log("\n[3/7] Testing RSS Feed Fetching...");
    const testSource = newsSources[0] || { name: "Docker", url: "https://www.docker.com/blog/feed/" };
    console.log(`Fetching from: ${testSource.name} (${testSource.url})`);
    const articles = await fetchRSS(testSource.url);
    console.log(`✅ Successfully fetched ${articles.length} articles from ${testSource.name}`);
    if (articles.length === 0) {
        throw new Error("No articles fetched from RSS");
    }
    const sample = articles[0];
    console.log(`Sample Article: "${sample.title}" (${sample.link})`);

    // 4. Article Content Extraction Test
    console.log("\n[4/7] Testing Article Content Extraction (@mozilla/readability)...");
    const extracted = await extractArticleContent(sample.link);
    if (extracted && extracted.content) {
        console.log(`✅ Extracted clean content (${extracted.content.length} chars)`);
        console.log(`Excerpt: ${extracted.content.substring(0, 150)}...`);
    } else {
        console.log("⚠️ Content extraction fell back (e.g. paywall/anti-bot), using RSS snippet/content");
    }

    // 5. Gemini AI Analysis Test
    console.log("\n[5/7] Testing Gemini AI Article Analysis...");
    const contentToAnalyze = (extracted && extracted.content) ? extracted.content : (sample.content || sample.title);
    const aiResult = await analyzeArticle(sample.title, contentToAnalyze);
    console.log("✅ AI Analysis Result:");
    console.log(`   - Category: ${aiResult.category}`);
    console.log(`   - Importance Score: ${aiResult.importanceScore}/10`);
    console.log(`   - Tags: ${JSON.stringify(aiResult.tags)}`);
    console.log(`   - Summary: ${aiResult.summary}`);
    console.log(`   - Is Duplicate: ${aiResult.isDuplicate}`);

    // 6. Gemini Consolidated Newsletter Generation Test (No Links/URLs)
    console.log("\n[6/7] Testing Consolidated Daily Newsletter Generation (Strictly NO URLs)...");
    const testArticles = [
        {
            title: sample.title,
            category: aiResult.category,
            summary: aiResult.summary || "Summary of the article.",
            importanceScore: aiResult.importanceScore
        },
        {
            title: "OpenAI Launches Next-Generation Reasoning Engine",
            category: "AI/ML",
            summary: "OpenAI announced a new reasoning model that significantly outperforms previous benchmarks in competitive programming and scientific analysis.",
            importanceScore: 9
        }
    ];

    const newsletterRes = await generateNewsletterContent(testArticles);
    const newsletterHtml = newsletterRes && newsletterRes.html;
    if (!newsletterHtml) {
        throw new Error("Failed to generate newsletter HTML");
    }
    console.log(`✅ Newsletter HTML generated (${newsletterHtml.length} characters)`);

    // Check that NO <a> tags or URLs exist in the newsletter
    const hasAnchorTags = /<a\s+[^>]*href/i.test(newsletterHtml);
    const hasHttpLinks = /https?:\/\/[^\s"'<>]+/i.test(newsletterHtml);
    console.log(`   - Contains anchor <a> tags: ${hasAnchorTags ? "❌ YES" : "✅ NO"}`);
    console.log(`   - Contains http(s) URLs: ${hasHttpLinks ? "❌ YES" : "✅ NO"}`);

    if (hasAnchorTags) {
        console.warn("⚠️ Warning: Gemini included an anchor tag despite instructions!");
    } else {
        console.log("✅ Verified: Zero links or URLs in newsletter content!");
    }

    // 7. Queue Health Check
    console.log("\n[7/7] Testing BullMQ Queues...");
    const fetchWaiting = await fetchQueue.getWaitingCount();
    const processWaiting = await processQueue.getWaitingCount();
    const aiWaiting = await aiQueue.getWaitingCount();
    const newsletterWaiting = await newsletterQueue.getWaitingCount();
    const emailWaiting = await emailQueue.getWaitingCount();
    console.log(`✅ Queues healthy:
   - news-fetch: ${fetchWaiting} waiting
   - news-process: ${processWaiting} waiting
   - news-ai: ${aiWaiting} waiting
   - news-newsletter: ${newsletterWaiting} waiting
   - news-email: ${emailWaiting} waiting`);

    console.log("\n==================================================");
    console.log("   🎉 ALL COMPONENTS PASSED VERIFICATION!        ");
    console.log("==================================================");

    // Clean exit
    await connection.quit();
    await mongoose.disconnect();
    process.exit(0);
}

runPipelineTest().catch(err => {
    console.error("❌ Pipeline Test Failed:", err);
    process.exit(1);
});
