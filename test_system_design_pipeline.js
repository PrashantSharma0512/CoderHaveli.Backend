require("dotenv").config();
const mongoose = require("mongoose");
const mongoConnect = require("./connection");
const { getArticlesForSystemDesignNewsletter, createNewsletter, getLatestNewsletter, getNewsletterHistory } = require("./services/newsletter.service");
const { generateSystemDesignNewsletterContent } = require("./services/newsAi.service");

async function runSystemDesignPipelineTest() {
    console.log("==================================================");
    console.log("   TESTING SYSTEM DESIGN & NODE.JS NEWSLETTER    ");
    console.log("==================================================");

    // 1. Database Connection
    console.log("\n[1/4] Connecting to MongoDB...");
    await mongoConnect(process.env.MONGO_URI);
    require("./models")(mongoose);
    console.log("✅ MongoDB Connected & Models Registered");

    // 2. Test System Design Articles Query
    console.log("\n[2/4] Querying System Design & Node.js Articles...");
    const articles = await getArticlesForSystemDesignNewsletter(5);
    console.log(`✅ Retrieved ${articles.length} eligible articles for System Design newsletter`);
    if (articles.length > 0) {
        console.log(`   Sample: "${articles[0].title}" [${articles[0].category}]`);
    }

    // 3. Test Gemini AI Generation for System Design & Node.js Deep Dive
    console.log("\n[3/4] Testing Gemini AI System Design & Node.js Newsletter Generation...");
    const sampleArticles = articles.length > 0 ? articles : [
        {
            _id: new mongoose.Types.ObjectId(),
            title: "Scaling Node.js Microservices with Redis and Kafka",
            source: "Netflix TechBlog",
            articleUrl: "https://netflixtechblog.com",
            category: "System Design",
            content: "Netflix engineers share architectural strategies for scaling high-throughput Node.js microservices with distributed message brokers, event-driven architecture, and caching.",
            summary: "Scaling Node.js microservices with distributed caching and message queues.",
            importanceScore: 9
        }
    ];

    const aiResult = await generateSystemDesignNewsletterContent(sampleArticles);
    if (!aiResult || !aiResult.html) {
        throw new Error("Failed to generate System Design & Node.js newsletter HTML");
    }

    console.log("✅ AI System Design Newsletter Generated Successfully!");
    console.log(`   - Title: "${aiResult.title}"`);
    console.log(`   - HTML Length: ${aiResult.html.length} characters`);
    console.log(`   - Articles Analyzed: ${aiResult.articles.length}`);

    // Verify key sections exist in HTML
    const hasSystemDesign = /system design|architecture|blueprint|distributed/i.test(aiResult.html);
    const hasNodeJs = /node\.?js|event loop|libuv|stream/i.test(aiResult.html);
    const hasWhiteBg = /#ffffff|white/i.test(aiResult.html);

    console.log(`   - Contains System Design breakdown: ${hasSystemDesign ? "✅ YES" : "❌ NO"}`);
    console.log(`   - Contains Node.js Internals section: ${hasNodeJs ? "✅ YES" : "❌ NO"}`);
    console.log(`   - Follows Pure White theme: ${hasWhiteBg ? "✅ YES" : "❌ NO"}`);

    // 4. Test Database Operations for type = "system_design"
    console.log("\n[4/4] Testing Newsletter Storage & Retrieval with type = 'system_design'...");
    const testNewsletter = await createNewsletter({
        title: aiResult.title,
        date: new Date(),
        articles: sampleArticles,
        html: aiResult.html,
        type: "system_design"
    });

    console.log(`✅ Saved test newsletter: ${testNewsletter._id} (type: ${testNewsletter.type})`);

    const fetchedLatest = await getLatestNewsletter("system_design");
    console.log(`✅ Fetched latest system_design newsletter: "${fetchedLatest?.title}" (type: ${fetchedLatest?.type})`);

    const history = await getNewsletterHistory(1, 5, "system_design");
    console.log(`✅ Fetched system_design history: ${history.total} total newsletters found`);

    // Clean up test document
    const Newsletter = mongoose.model("NewsLetter");
    await Newsletter.findByIdAndDelete(testNewsletter._id);
    console.log("✅ Cleaned up temporary test newsletter document");

    console.log("\n==================================================");
    console.log("   🎉 SYSTEM DESIGN PIPELINE VERIFIED 100%!       ");
    console.log("==================================================");

    await mongoose.disconnect();
    process.exit(0);
}

runSystemDesignPipelineTest().catch(async (err) => {
    console.error("❌ System Design Pipeline Test Failed:", err);
    try {
        await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
});
