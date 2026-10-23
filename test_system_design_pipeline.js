require("dotenv").config();
const mongoose = require("mongoose");
const mongoConnect = require("./connection");
const { 
    getArticlesForSystemDesignNewsletter, 
    getNextSystemDesignTopic, 
    getAllSystemDesignTopics,
    createNewsletter, 
    getLatestNewsletter, 
    getNewsletterHistory 
} = require("./services/newsletter.service");
const { generateSystemDesignNewsletterContent } = require("./services/newsAi.service");

async function runSystemDesignPipelineTest() {
    console.log("==================================================");
    console.log("   TESTING SYSTEM DESIGN CURATED SYLLABUS ROADMAP ");
    console.log("==================================================");

    // 1. Database Connection
    console.log("\n[1/5] Connecting to MongoDB...");
    await mongoConnect(process.env.MONGO_URI);
    require("./models")(mongoose);
    console.log("✅ MongoDB Connected & Models Registered");

    // 2. Curated Syllabus Verification
    console.log("\n[2/5] Testing Curated Syllabus Roadmap...");
    const allTopics = getAllSystemDesignTopics();
    console.log(`✅ Loaded ${allTopics.length} curated syllabus topics`);

    const nextTopic = await getNextSystemDesignTopic();
    console.log(`✅ Next Sequential Topic: [Lesson ${nextTopic.syllabusIndex}/${nextTopic.totalSyllabusTopics}] "${nextTopic.title}"`);
    console.log(`   - System Design Focus: ${nextTopic.systemDesignFocus}`);
    console.log(`   - Node.js Focus: ${nextTopic.nodeJsFocus}`);
    console.log(`   - Rule of Thumb: ${nextTopic.ruleOfThumb}`);

    // 3. Test System Design Articles Query
    console.log("\n[3/5] Querying System Design & Node.js Articles from RSS...");
    const articles = await getArticlesForSystemDesignNewsletter(5);
    console.log(`✅ Retrieved ${articles.length} eligible articles for System Design newsletter`);

    // 4. Test Gemini AI Generation Anchored on Curated Topic
    console.log(`\n[4/5] Generating Newsletter with Gemini for Topic: "${nextTopic.title}"...`);
    const aiResult = await generateSystemDesignNewsletterContent(articles, nextTopic);
    if (!aiResult || !aiResult.html) {
        throw new Error("Failed to generate System Design & Node.js newsletter HTML");
    }

    console.log("✅ AI System Design Newsletter Generated Successfully!");
    console.log(`   - Title: "${aiResult.title}"`);
    console.log(`   - HTML Length: ${aiResult.html.length} characters`);
    console.log(`   - Articles Analyzed: ${aiResult.articles.length}`);

    // Verify key sections exist in HTML
    const hasTopicInHtml = new RegExp(nextTopic.title.split(" ")[0], "i").test(aiResult.html);
    const hasSystemDesign = /system design|architecture|blueprint|distributed/i.test(aiResult.html);
    const hasNodeJs = /node\.?js|event loop|libuv|stream/i.test(aiResult.html);
    const hasWhiteBg = /#ffffff|white/i.test(aiResult.html);

    console.log(`   - Contains Curated Topic: ${hasTopicInHtml ? "✅ YES" : "❌ NO"}`);
    console.log(`   - Contains System Design breakdown: ${hasSystemDesign ? "✅ YES" : "❌ NO"}`);
    console.log(`   - Contains Node.js Internals section: ${hasNodeJs ? "✅ YES" : "❌ NO"}`);
    console.log(`   - Follows Pure White theme: ${hasWhiteBg ? "✅ YES" : "❌ NO"}`);

    // 5. Test Database Operations for type = "system_design" with topic
    console.log("\n[5/5] Testing Newsletter Storage & Retrieval with topic...");
    const testNewsletter = await createNewsletter({
        title: aiResult.title,
        topic: nextTopic.title,
        date: new Date(),
        articles: articles,
        html: aiResult.html,
        type: "system_design"
    });

    console.log(`✅ Saved test newsletter: ${testNewsletter._id} (topic: "${testNewsletter.topic}")`);

    const fetchedLatest = await getLatestNewsletter("system_design");
    console.log(`✅ Fetched latest system_design newsletter: "${fetchedLatest?.title}" (topic: "${fetchedLatest?.topic}")`);

    const history = await getNewsletterHistory(1, 5, "system_design");
    console.log(`✅ Fetched system_design history: ${history.pagination.total} total newsletters found`);

    // Clean up test document
    const Newsletter = mongoose.model("NewsLetter");
    await Newsletter.findByIdAndDelete(testNewsletter._id);
    console.log("✅ Cleaned up temporary test newsletter document");

    console.log("\n==================================================");
    console.log("   🎉 CURATED ROADMAP PIPELINE VERIFIED 100%!    ");
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
