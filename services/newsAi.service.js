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

            const snippet = a.content
                ? a.content.substring(0, 400)
                : (a.summary || a.title);


            return `[Article ${i + 1}]
ID: ${a._id}
Title: "${a.title}"
Source: ${a.source || "Tech"}
Excerpt: ${snippet}`;

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

1. Generate an engaging, beautifully formatted HTML newsletter email grouping these stories by category.

2. Provide a 2-sentence summary, category, and importance score (1-10) for each article so we can store them in our database.

STRICT JSON OUTPUT FORMAT:

Return ONLY valid JSON (no markdown wrappers, no code fences, no commentary) matching this schema:

{
  "html": "<div style=\\"...\\">...complete styled HTML email...</div>",
  "articles": [
    {
      "id": "article MongoDB ID from above",
      "summary": "2-sentence high-impact summary",
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
  Secondary Text: #555555
  Muted Text: #8A8170


- EMAIL BACKGROUND:
  Use ONLY pure white:

  background-color: #FFFFFF;

  Do NOT use:
  #FAF9F5
  #FDFCF8
  cream
  beige
  pearl
  gray backgrounds


- MAIN CONTAINER:
  Maximum width: 640px
  background: #FFFFFF;
  margin: 0 auto;


- HEADER:
  background: #FFFFFF;

  Add a premium gold top border:
  border-top: 4px solid #D4AF37;

  Add a subtle gold bottom divider:
  border-bottom: 1px solid #E8D79A;


- NEWSLETTER TITLE:
  "CoderHaveli Daily"

  Main text:
  color: #222222;

  Use #A67C00 for small gold highlights or decorative elements.


- DATE:
  color: #8A8170;


- SECTION HEADERS:
  color: #A67C00;

  Add a thin gold divider:
  border-bottom: 2px solid #E8D79A;


- ARTICLE CARDS:
  background: #FFFFFF;
  border: 1px solid #E8D79A;
  border-radius: 10px;
  padding: 18px 20px;
  margin-bottom: 16px;

  Use only a very subtle gold-tinted shadow:
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.08);


- ARTICLE TITLES:
  color: #222222;
  font-weight: bold;


- ARTICLE SUMMARY:
  color: #555555;
  line-height: 1.6;


- CATEGORY BADGES:
  Use a very light gold background:

  background: #FFF9E8;
  color: #A67C00;
  border: 1px solid #E8D79A;

  border-radius: 20px;
  padding: 4px 10px;


- GOLD USAGE:
  Use gold ONLY for:
  - Header border
  - Section headings
  - Section dividers
  - Category badges
  - Small decorative elements
  - Metadata
  - Footer divider
  - CoderHaveli branding accents

  Do NOT make large sections gold.


- FOOTER:
  background: #FFFFFF;

  Add:
  border-top: 1px solid #E8D79A;

  CoderHaveli Team:
  color: #A67C00;

  Supporting text:
  color: #8A8170;


- OVERALL VISUAL STYLE:
  Pure white background.
  White article cards.
  Gold accents.
  Dark charcoal typography.
  Minimal.
  Premium.
  Clean.
  Spacious.
  Modern editorial design.

  The email should look like a premium
  WHITE + GOLD technology newsletter.


- STRICT:
  Do NOT use dark backgrounds.
  Do NOT use black backgrounds.
  Do NOT use cream backgrounds.
  Do NOT use beige backgrounds.
  Do NOT use pearl backgrounds.
  Do NOT use gray backgrounds.
  Do NOT use gradients.
  Do NOT use excessive gold.

  Absolutely NO URLs.
  Absolutely NO <a> tags.
  Absolutely NO clickable links.
  
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


module.exports = {

    analyzeArticle,

    generateNewsletterContent

};