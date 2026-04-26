const AnalyticController = require('../controllers/analyticsController');

const router = require('express').Router();

router.get('/get-analytics', AnalyticController.getAnalytics)

module.exports = router;