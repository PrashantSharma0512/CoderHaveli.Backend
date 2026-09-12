/**
 * Newsletter Routes
 * 
 * Public routes:
 *   GET /api/newsletter/latest   → latest newsletter
 *   GET /api/newsletter/history  → paginated history
 *   GET /api/newsletter/news     → processed news feed
 * 
 * Authenticated routes:
 *   POST /api/newsletter/subscribe     → subscribe to newsletter
 *   POST /api/newsletter/unsubscribe   → unsubscribe from newsletter
 *   GET  /api/newsletter/status        → subscription status
 * 
 * Admin routes:
 *   POST /api/newsletter/generate      → manually trigger newsletter
 */

const router = require("express").Router();
const Authenticated = require("../middlewares/Auth");
const newsletterController = require("../controllers/newsletterController");

// Public endpoints
router.get("/latest", newsletterController.latest);
router.get("/history", newsletterController.history);
router.get("/news", newsletterController.getNews);

// Authenticated endpoints
router.post("/subscribe", Authenticated, newsletterController.subscribe);
router.post("/unsubscribe", Authenticated, newsletterController.unsubscribe);
router.get("/status", Authenticated, newsletterController.getStatus);

// Admin endpoint
router.post("/generate", Authenticated, newsletterController.triggerGenerate);

module.exports = router;
