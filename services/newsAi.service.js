/**
 * News AI Service
 * 
 * Uses Google Gemini to:
 * 1. Analyze individual articles → summary, category, tags, importance score, duplicate detection
 * 2. Generate consolidated daily newsletter content from multiple article summaries
 * 
 * Uses @google/genai SDK (already installed and configured in configs/gemini.config.js)
 */

const ai = require("../configs/gemini.config");
const createLogger = require("../utils/logger");

const log = createLogger("ai");

/**
 * Analyze a single article with Gemini.
 * Returns structured data: summary, category, tags, importanceScore, isDuplicate
 */
async function analyzeArticle(title, content, existingTitles = []) {

    const prompt = `You are a tech news analyst. Analyze this article and return ONLY valid JSON (no markdown, no code fences).

Article Title: "${title}"
Article Content: "${content.substring(0, 5000)}"

${existingTitles.length > 0 ? `Already covered titles:\n${existingTitles.map(t => `- ${t}`).join("\n")}` : ""}

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

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        const text = response.text.trim();

        // Strip markdown code fences if Gemini wraps the response
        const cleaned = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const result = JSON.parse(cleaned);

        return {
            summary: result.summary || "",
            category: result.category || "General Tech",
            tags: Array.isArray(result.tags) ? result.tags : [],
            importanceScore: Math.min(10, Math.max(1, Number(result.importanceScore) || 5)),
            isDuplicate: Boolean(result.isDuplicate)
        };

    } catch (error) {

        log.error(`Gemini article analysis failed for "${title}":`, error.message);

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
 * Generate a consolidated daily newsletter from raw/extracted articles in a single Gemini call.
 * Returns { html, articles: [{ id, summary, category, importanceScore }] }.
 */
async function generateNewsletterContent(articles) {

    const articleList = articles.map((a, i) => {
        const snippet = a.content 
            ? a.content.substring(0, 400) 
            : (a.summary || a.title);
        return `[Article ${i + 1}] ID: ${a._id}\nTitle: "${a.title}"\nSource: ${a.source || "Tech"}\nExcerpt: ${snippet}`;
    }).join("\n\n");

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

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
- THEME & PALETTE: Elegant Light Theme featuring Pure White (#ffffff), Warm Pearl (#fdfcf7 / #faf8f5), and Luxurious Gold accents (#d4af37, #c59b27, #b8860b).
- Container: Centered max-width 640px email container on a soft pearl background (#faf8f5) with clean typography (font-family: Arial, Helvetica, sans-serif).
- Header: Crisp white background (#ffffff) with an elegant golden accent top border (4px solid #d4af37) and bottom border (1px solid #f0e6c8). Title "CoderHaveli Daily" in deep charcoal (#1f1e1d) with golden highlights (#b8860b), plus today's date in refined gold-tinted muted text (#8c7847).
- Section Headers: Styled with a subtle golden left accent bar or bottom line (border-bottom: 2px solid #ecd899) and warm golden title (#a37812).
- Article Cards: Pure white (#ffffff) cards with a delicate golden border (1px solid #f3e5ab), rounded corners (10px), margin-bottom (16px), padding (16px 20px), and subtle soft shadow (box-shadow: 0 2px 8px rgba(212, 175, 55, 0.08)).
- Typography: Article title bold (#1a1918), 2-3 sentence summaries in high-contrast readable charcoal (#424240, line-height 1.6).
- Badges: Pill-shaped badges for category and importance score with soft golden glow (background: #fef9ec; color: #926514; border: 1px solid #e7cd7d; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold).
- STRICT: Absolutely NO URLs, anchor tags (<a>), or clickable links anywhere.
- Footer: Clean white footer with a golden divider and a warm sign-off from "CoderHaveli Team" (#856d3b);`;

    try {

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        let text = response.text.trim();

        // Strip markdown code fences if wrapped
        text = text
            .replace(/^```json\s*/i, "")
            .replace(/^```html\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        try {

            const parsed = JSON.parse(text);

            return {
                html: parsed.html || "",
                articles: Array.isArray(parsed.articles) ? parsed.articles : []
            };

        } catch (jsonErr) {

            // If Gemini returned pure HTML instead of JSON
            if (text.includes("<html") || text.includes("<div") || text.includes("<table")) {
                log.warn("Gemini returned raw HTML instead of JSON — using text as HTML");
                return {
                    html: text,
                    articles: []
                };
            }

            log.error("Failed to parse Gemini response as JSON:", jsonErr.message);
            return null;

        }

    } catch (error) {

        log.error("Gemini newsletter generation failed:", error.message);
        return null;

    }

}

module.exports = { analyzeArticle, generateNewsletterContent };
