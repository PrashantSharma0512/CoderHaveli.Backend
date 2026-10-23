/**
 * News AI Service
 *
 * Uses Google Gemini to:
 * 1. Analyze individual articles → summary, category, tags,
 *    importance score, duplicate detection
 * 2. Generate consolidated daily newsletter content
 *
 * Uses @google/genai SDK
 * configured in configs/gemini.config.js
 */

const ai = require("../configs/gemini.config");
const createLogger = require("../utils/logger");

const log = createLogger("ai");

/*
 * Gemini models.
 *
 * The service will try these models in order when a temporary
 * Gemini service error occurs.
 */
const GEMINI_MODELS = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite"
];

/*
 * Number of attempts for each model.
 *
 * 2 means:
 *
 * Attempt 1
 *    ↓ temporary error
 * wait
 *    ↓
 * Attempt 2
 *
 * Then move to the next model.
 */
const MAX_ATTEMPTS_PER_MODEL = 2;

/*
 * Delay before retrying the same model.
 */
const RETRY_DELAY = 5000;


/**
 * Extract HTTP/status code from Gemini error.
 *
 * Different versions of @google/genai can expose
 * the error information differently.
 */
function getGeminiErrorStatus(error) {

    return (
        error?.status ||
        error?.code ||
        error?.error?.code ||
        error?.response?.status ||
        error?.response?.data?.error?.code
    );

}


/**
 * Check whether the Gemini error is temporary.
 *
 * 500 → Internal server error
 * 429 → Rate limit / resource exhausted
 * 503 → Service unavailable / high demand
 */
function isRetryableGeminiError(error) {

    const status = getGeminiErrorStatus(error);

    return (
        status === 500 ||
        status === 429 ||
        status === 503
    );

}


/**
 * Wait for specified milliseconds.
 */
function sleep(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });

}


/**
 * Generate Gemini content with model fallback.
 *
 * Flow:
 *
 * gemini-3.7-flash
 *       ↓ 503
 * retry same model
 *       ↓ 503
 *
 * gemini-3.6-flash
 *       ↓ 503
 * retry same model
 *       ↓ 503
 *
 * gemini-3.5-flash-lite
 *       ↓
 * success
 *
 * If every model fails, the final error is thrown.
 * BullMQ can then retry the complete job.
 */
async function generateContentWithRetry(prompt) {

    let lastError = null;

    for (const model of GEMINI_MODELS) {

        for (
            let attempt = 1;
            attempt <= MAX_ATTEMPTS_PER_MODEL;
            attempt++
        ) {

            try {

                log.info(
                    `Gemini model: ${model} | ` +
                    `attempt ${attempt}/${MAX_ATTEMPTS_PER_MODEL}`
                );

                const response = await ai.models.generateContent({
                    model,
                    contents: prompt
                });

                log.success(
                    `Gemini generation successful using ${model}`
                );

                return response;

            } catch (error) {

                lastError = error;

                const status = getGeminiErrorStatus(error);

                log.error(
                    `Gemini request failed | ` +
                    `model=${model} | ` +
                    `attempt=${attempt}/${MAX_ATTEMPTS_PER_MODEL} | ` +
                    `status=${status || "unknown"} | ` +
                    `${error.message}`
                );


                /*
                 * Permanent errors should NOT trigger
                 * model fallback.
                 *
                 * Examples:
                 * - invalid API key
                 * - invalid request
                 * - malformed configuration
                 */
                if (!isRetryableGeminiError(error)) {

                    throw error;

                }


                /*
                 * If this model still has another attempt,
                 * retry the same model first.
                 */
                if (attempt < MAX_ATTEMPTS_PER_MODEL) {

                    log.warn(
                        `Gemini ${model} temporarily unavailable ` +
                        `(${status}). Retrying in ` +
                        `${RETRY_DELAY / 1000}s...`
                    );

                    await sleep(RETRY_DELAY);

                    continue;

                }


                /*
                 * Current model exhausted.
                 *
                 * Move to the next model.
                 */
                log.warn(
                    `Gemini model ${model} failed after ` +
                    `${MAX_ATTEMPTS_PER_MODEL} attempts. ` +
                    `Trying next model...`
                );

            }

        }

    }


    /*
     * Every configured model failed.
     *
     * Throw the last Gemini error so BullMQ knows
     * that the newsletter job failed.
     */
    if (lastError) {

        log.error(
            "All configured Gemini models failed"
        );

        throw lastError;

    }


    throw new Error(
        "No Gemini model is configured"
    );

}


/**
 * Analyze a single article with Gemini.
 *
 * Returns:
 *
 * {
 *     summary,
 *     category,
 *     tags,
 *     importanceScore,
 *     isDuplicate
 * }
 */
async function analyzeArticle(
    title,
    content,
    existingTitles = []
) {

    const prompt = `You are a tech news analyst. Analyze this article and return ONLY valid JSON (no markdown, no code fences).

Article Title: "${title}"

Article Content: "${content.substring(0, 5000)}"

${existingTitles.length > 0
        ? `Already covered titles:
${existingTitles.map(t => `- ${t}`).join("\n")}`
        : ""
    }

Return this exact JSON structure:

{
    "summary": "2-3 sentence summary of the key points",
    "category": "one of: AI/ML, Cloud, DevOps, Security, Web Development, Mobile, Open Source, Hardware, Startups, Programming, Data Science, Blockchain, General Tech",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "importanceScore": 7,
    "isDuplicate": false
}

Rules:
- importanceScore: 1-10 based on industry impact and relevance to developers
- isDuplicate: true ONLY if this is substantially the same story as one in the "Already covered titles" list
- tags: 3-5 relevant lowercase keywords
- Keep summary factual and concise`;


    try {

        /*
         * Use the same model fallback system for
         * individual article analysis.
         */
        const response = await generateContentWithRetry(
            prompt
        );

        const text = response.text.trim();


        /*
         * Strip markdown code fences if Gemini
         * wraps the JSON response.
         */
        const cleaned = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();


        const result = JSON.parse(cleaned);


        return {

            summary: result.summary || "",

            category: result.category || "General Tech",

            tags: Array.isArray(result.tags)
                ? result.tags
                : [],

            importanceScore: Math.min(
                10,
                Math.max(
                    1,
                    Number(result.importanceScore) || 5
                )
            ),

            isDuplicate: Boolean(
                result.isDuplicate
            )

        };


    } catch (error) {

        log.error(
            `Gemini article analysis failed for "${title}":`,
            error.message
        );


        /*
         * Individual article failures should not stop
         * the entire news pipeline.
         */
        return {

            summary: "",

            category: "General Tech",

            tags: [],

            importanceScore: 5,

            isDuplicate: false

        };

    }

}


/**
 * Generate a consolidated daily newsletter.
 *
 * Returns:
 *
 * {
 *     html,
 *     articles: [
 *         {
 *             id,
 *             summary,
 *             category,
 *             importanceScore
 *         }
 *     ]
 * }
 */
async function generateNewsletterContent(articles) {

    const articleList = articles
        .map((a, i) => {
            const url = a.articleUrl || a.url || a.link || "";
            const snippet = a.content
                ? a.content.substring(0, 1200)
                : (a.summary || a.title);

            return `[Article ${i + 1}]
ID: ${a._id || `article-${i + 1}`}
Title: "${a.title}"
Source: ${a.source || "Tech"}
URL: ${url}
Detailed Excerpt: ${snippet}`;
        })
        .join("\n\n");

    const today = new Date().toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

    const prompt = `You are a senior tech editor and newsletter curator for "CoderHaveli Daily".

Today's Date: ${today}

Total Articles to process: ${articles.length}

${articleList}

TASKS:

1. Generate an in-depth, comprehensive, beautifully formatted HTML newsletter email grouping these stories by category.
   For EVERY article card:
   - Provide an in-depth technical explanation (3 to 4 comprehensive sentences): Explain the core announcement/event, how it works technically or architectural implications, and the broader industry context.
   - Include a "Key Takeaways" bulleted section (2-3 concise bullet points) detailing why it matters to software engineers, developers, and tech leads.
   - Include a styled, clickable "Read Full Story &rarr;" button linking directly to the article's provided URL.

2. Provide a 3-sentence technical summary, category, and importance score (1-10) for each article so we can store them in our database.

STRICT JSON OUTPUT FORMAT:

Return ONLY valid JSON (no markdown wrappers, no code fences, no commentary) matching this schema:

{
  "html": "<div style=\\"...\\">...complete styled HTML email...</div>",
  "articles": [
    {
      "id": "article MongoDB ID from above",
      "summary": "3-sentence in-depth technical summary",
      "category": "one of: AI/ML, Cloud, DevOps, Security, Web Development, Mobile, Open Source, General Tech",
      "importanceScore": 8
    }
  ]
}

HTML EMAIL GUIDELINES:

- THEME & PALETTE:
  Elegant Premium LIGHT Theme.

  IMPORTANT:
  The ENTIRE EMAIL background must be PURE WHITE.

  Primary Background: #FFFFFF
  Content Background: #FFFFFF
  Article Card Background: #FFFFFF

  Primary Gold: #D4AF37
  Elegant Gold: #C9A227
  Dark Gold: #A67C00
  Soft Gold: #FFF9E8
  Gold Border: #E8D79A

  Primary Text: #222222
  Secondary Text: #444444
  Muted Text: #8A8170

- EMAIL BACKGROUND:
  Use ONLY pure white:
  background-color: #FFFFFF;

  Do NOT use dark, cream, or beige backgrounds.

- MAIN CONTAINER:
  Maximum width: 640px
  background: #FFFFFF;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

- HEADER:
  background: #FFFFFF;
  border-top: 4px solid #D4AF37;
  border-bottom: 1px solid #E8D79A;
  padding: 24px 20px;
  text-align: center;

- NEWSLETTER TITLE:
  "CoderHaveli Daily"
  Main text: color: #222222; font-size: 26px; font-weight: 800;
  Use #A67C00 for the "Daily" accent.

- DATE:
  color: #8A8170; font-size: 13px; margin-top: 6px;

- SECTION HEADERS:
  color: #A67C00;
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  border-bottom: 2px solid #E8D79A;
  padding-bottom: 6px;
  margin: 24px 0 16px;

- ARTICLE CARDS:
  background: #FFFFFF;
  border: 1px solid #E8D79A;
  border-radius: 10px;
  padding: 20px 22px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.08);

- ARTICLE TITLES:
  color: #222222;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
  margin: 8px 0;

- DETAILED SUMMARY:
  color: #444444;
  font-size: 13.5px;
  line-height: 1.65;
  margin: 0 0 12px 0;

- KEY TAKEAWAYS:
  Include a bulleted section:
  <div style="margin: 10px 0 14px; background: #FFFDF7; border-left: 3px solid #D4AF37; padding: 10px 14px; border-radius: 0 6px 6px 0;">
    <div style="font-size: 11px; font-weight: 700; color: #A67C00; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Key Takeaways:</div>
    <ul style="margin: 0; padding-left: 18px; color: #555555; font-size: 12.5px; line-height: 1.55;">
      <li>...point 1...</li>
      <li>...point 2...</li>
    </ul>
  </div>

- CATEGORY & IMPORTANCE BADGES:
  Use a light gold pill badge:
  background: #FFF9E8;
  color: #A67C00;
  border: 1px solid #E8D79A;
  border-radius: 16px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  display: inline-block;
  margin-right: 6px;

- SOURCE LINK & READ MORE BUTTON (CRITICAL):
  For EVERY article card, include a dedicated footer action row with the source name and a direct clickable button linking to its EXACT provided URL:
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #E8D79A;">
    <tr>
      <td align="left" style="font-size: 12px; color: #8A8170;">
        Source: <strong style="color: #444444;">[Source Name]</strong>
      </td>
      <td align="right">
        <a href="EXACT_ARTICLE_URL" target="_blank" style="display: inline-block; padding: 6px 14px; background-color: #FFF9E8; color: #A67C00; border: 1px solid #D4AF37; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 700;">Read Full Story &rarr;</a>
      </td>
    </tr>
  </table>
  IMPORTANT: You MUST use the exact URL provided for each article in the prompt. Do NOT make up or hallucinate URLs.

- FOOTER:
  background: #FFFFFF;
  border-top: 1px solid #E8D79A;
  padding: 20px;
  text-align: center;
  color: #8A8170;
  font-size: 12px;

- STRICT:
  Do NOT use dark backgrounds.
  Do NOT use black backgrounds.
  Do NOT use gradients.
  Do NOT use excessive gold.
  Ensure ALL links open in a new tab (target="_blank") and use the exact article URLs provided.
  `


    try {

        /*
         * Generate newsletter using model fallback.
         */
        const response = await generateContentWithRetry(
            prompt
        );


        let text = response.text.trim();


        /*
         * Strip markdown code fences if Gemini
         * wraps the response.
         */
        text = text
            .replace(/^```json\s*/i, "")
            .replace(/^```html\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();


        /*
         * Parse Gemini JSON response.
         */
        try {

            const parsed = JSON.parse(text);


            return {

                html: parsed.html || "",

                articles: Array.isArray(
                    parsed.articles
                )
                    ? parsed.articles
                    : []

            };

        } catch (jsonErr) {

            /*
             * Gemini sometimes returns raw HTML instead
             * of the requested JSON.
             */
            if (
                text.includes("<html") ||
                text.includes("<div") ||
                text.includes("<table")
            ) {

                log.warn(
                    "Gemini returned raw HTML instead of JSON — using text as HTML"
                );


                return {

                    html: text,

                    articles: []

                };

            }


            log.error(
                "Failed to parse Gemini response as JSON:",
                jsonErr.message
            );


            /*
             * Throw parsing error so BullMQ can retry
             * the newsletter job.
             */
            throw jsonErr;

        }


    } catch (error) {

        /*
         * IMPORTANT:
         *
         * Do NOT return null here.
         *
         * Throwing tells BullMQ that the newsletter job
         * failed and allows your existing BullMQ:
         *
         * attempts: 3
         * backoff: exponential
         *
         * configuration to retry the job.
         */
        log.error(
            "Gemini newsletter generation failed:",
            error.message
        );


        throw error;

    }

}


/**
 * Generate a consolidated System Design & Node.js Deep Dive newsletter.
 * 
 * Hybrid approach:
 * - Ingests and highlights eligible engineering / Node.js articles
 * - Crafts comprehensive architectural blueprints and Node.js production patterns
 *   even when breaking news is scarce.
 * 
 * Returns:
 * {
 *     title,
 *     html,
 *     articles: [{ id, summary, category, importanceScore }]
 * }
 */
async function generateSystemDesignNewsletterContent(articles = []) {

    const articleList = (articles || [])
        .map((a, i) => {
            const url = a.articleUrl || a.url || a.link || "";
            const snippet = a.content
                ? a.content.substring(0, 1200)
                : (a.summary || a.title);

            return `[Article ${i + 1}]
ID: ${a._id || `article-${i + 1}`}
Title: "${a.title}"
Source: ${a.source || "Engineering"}
URL: ${url}
Detailed Excerpt: ${snippet}`;
        })
        .join("\n\n");

    const today = new Date().toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

    const hasArticles = Array.isArray(articles) && articles.length > 0;

    const prompt = `You are a Principal Distributed Systems Architect and Senior Node.js Backend Engineer writing for "CoderHaveli Engineering" (System Design & Node.js Edition).

Today's Date: ${today}

${hasArticles ? `Here are recently ingested technical articles:\n${articleList}` : `No external articles provided today. Generate a complete, self-contained, in-depth System Design Blueprint and Node.js Deep Dive.`}

YOUR MISSION:
Generate an in-depth, production-grade technical newsletter email. This newsletter is read by backend engineers, technical architects, and full-stack developers who care deeply about scale, distributed systems, and Node.js performance.

SECTIONS TO INCLUDE IN THE HTML:

1. HEADER:
   - Brand: "CoderHaveli Engineering"
   - Edition pill badge: "System Design & Node.js Deep Dive"
   - Date: "${today}"
   - Brief intro paragraph setting the theme.

2. SECTION 1: ARCHITECTURAL BLUEPRINT (System Design Deep Dive)
   - Pick a practical distributed system design topic (e.g. Distributed Caching & Invalidation Patterns, Building High-Throughput Rate Limiters with Redis Token Bucket, Event-Driven Architectures with Kafka/RabbitMQ, Database Sharding & Read Replicas, Microservices Resiliency with Circuit Breakers, or Designing Real-time WebSockets at 1M Connections).
   - Problem Statement & Scale (Throughput, P99 Latency, High Availability).
   - Architecture & Data Flow: Clear explanation of components.
   - Monospace diagram flow box:
     <div style="background: #FFFDF7; border: 1px solid #E8D79A; border-radius: 6px; padding: 12px 16px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; line-height: 1.5; color: #735100; margin: 12px 0; overflow-x: auto;">
       [Client] ──HTTPS──> [Load Balancer] ──> [Node.js Gateway] ──> [Redis Cluster] ──> [PostgreSQL Shards]
     </div>
   - Key Tradeoffs & Edge Cases (CAP Theorem, Network Partitions, Split-Brain prevention).
   - Key Architectural Takeaways bullet points.

3. SECTION 2: NODE.JS INTERNALS & PRODUCTION PATTERNS
   - Pick a core Node.js backend engineering topic (e.g. Demystifying the Node.js Event Loop & Libuv Phases, Tuning UV_THREADPOOL_SIZE for crypto/fs operations, Stream Backpressure & High-Throughput Pipelines, Worker Threads vs Cluster Mode for CPU Bound Tasks, Avoiding Memory Leaks in Long-Running V8 Heaps, or Async Context Tracking with AsyncLocalStorage).
   - In-depth explanation of how Node.js / V8 handles it internally.
   - Clean, syntax-styled JavaScript code snippet with comments:
     <pre style="background: #FFFDF7; border: 1px solid #E8D79A; border-radius: 6px; padding: 12px 14px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; line-height: 1.5; color: #222222; overflow-x: auto; margin: 10px 0;">...code snippet with comments...</pre>
   - Production Best Practices & Common Pitfalls.

${hasArticles ? `4. SECTION 3: CURATED ENGINEERING & ARCHITECTURE READS:
   - For the articles provided above, include clean article cards with:
     - Title
     - Source & Category badges
     - Technical explanation (why it matters to backend engineers)
     - A clickable "Read Full Story &rarr;" button linking to the EXACT provided article URL.` : `4. SECTION 3: SYSTEM DESIGN CHALLENGE OF THE DAY:
   - Present a classic real-world architecture challenge (e.g. "How to design a Distributed Unique ID Generator like Twitter Snowflake" or "How to handle double-spending in digital wallets").
   - Step-by-step breakdown and recommended design.`}

5. SECTION 4: ARCHITECTURAL RULE OF THUMB / PRO-TIP:
   - A high-leverage rule of thumb (e.g. Latency Numbers Every Engineer Should Know, Connection Pool sizing formula, Idempotency Keys in API Design).

6. FOOTER:
   - CoderHaveli signature, subscription note, and social links.

HTML EMAIL STYLING RULES:
- THEME: Elegant Pure White with Gold Accents.
- ENTIRE EMAIL background must be PURE WHITE: background-color: #FFFFFF
- Maximum width: 640px, margin: 0 auto.
- Primary Text: #222222, Secondary: #444444, Muted: #8A8170.
- Gold accents: Primary #D4AF37, Accent #A67C00, Soft background #FFF9E8, Border #E8D79A.
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif.
- All links must use target="_blank".

STRICT JSON OUTPUT FORMAT:
Return ONLY valid JSON (no markdown wrappers, no code fences, no commentary) matching this schema:
{
  "title": "CoderHaveli Engineering — [Topic Name, e.g. Distributed Caching & Node.js Event Loop]",
  "html": "<div style=\\"...\\">...complete styled HTML email...</div>",
  "articles": [
    {
      "id": "article MongoDB ID if provided",
      "summary": "3-sentence technical summary",
      "category": "System Design or Node.js",
      "importanceScore": 9
    }
  ]
}`;

    try {
        const response = await generateContentWithRetry(prompt);
        let text = response.text.trim();

        text = text
            .replace(/^```json\s*/i, "")
            .replace(/^```html\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        try {
            const parsed = JSON.parse(text);

            return {
                title: parsed.title || `CoderHaveli Engineering — System Design & Node.js (${today})`,
                html: parsed.html || "",
                articles: Array.isArray(parsed.articles) ? parsed.articles : []
            };
        } catch (jsonErr) {
            if (text.includes("<html") || text.includes("<div") || text.includes("<table")) {
                log.warn("Gemini returned raw HTML instead of JSON for system design newsletter — using text as HTML");
                return {
                    title: `CoderHaveli Engineering — System Design & Node.js (${today})`,
                    html: text,
                    articles: []
                };
            }

            log.error("Failed to parse Gemini response as JSON for system design newsletter:", jsonErr.message);
            throw jsonErr;
        }

    } catch (error) {
        log.error("Gemini system design newsletter generation failed:", error.message);
        throw error;
    }

}

module.exports = {
    analyzeArticle,
    generateNewsletterContent,
    generateSystemDesignNewsletterContent
};