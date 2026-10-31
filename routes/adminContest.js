const router = require('express').Router();
const adminContestController = require('../controllers/adminContestController');
const Authenicated = require('../middlewares/Auth');
const adminAuth = require('../middlewares/adminAuth');

// All admin contest routes require authentication and admin role
router.use(Authenicated, adminAuth);

// Overview and Contests Management
router.get('/overview', adminContestController.getAdminContestOverview);
router.get('/', adminContestController.getAdminContests);
router.post('/', adminContestController.createContest);

// Pass Management (mounted before /:contestId)
router.get('/passes/plans', adminContestController.getAdminPassPlans);
router.post('/passes/plans', adminContestController.createAdminPassPlan);
router.put('/passes/plans/:planId', adminContestController.updateAdminPassPlan);
router.get('/passes/purchases', adminContestController.getAdminPassPurchases);
router.get('/passes/summary', adminContestController.getAdminPassPurchasesSummary);
router.post('/passes/grant', adminContestController.manuallyGrantPass);
router.post('/passes/revoke/:purchaseId', adminContestController.manuallyRevokePass);

// Audit Logs (mounted before /:contestId)
router.get('/audit-logs/all', adminContestController.getAdminAuditLogs);

// Weekly Contest Scheduler Management (mounted before /:contestId)
router.get('/scheduler/config', adminContestController.getWeeklySchedulerConfig);
router.put('/scheduler/config', adminContestController.updateWeeklySchedulerConfig);
router.post('/scheduler/pause', adminContestController.pauseWeeklyScheduler);
router.post('/scheduler/resume', adminContestController.resumeWeeklyScheduler);
router.get('/scheduler/preview', adminContestController.previewWeeklyContest);
router.post('/scheduler/trigger', adminContestController.triggerWeeklyContest);
router.get('/scheduler/history', adminContestController.getWeeklyContestsHistory);

router.get('/:contestId', adminContestController.getAdminContestById);
router.patch('/:contestId', adminContestController.updateContest);
router.put('/:contestId', adminContestController.updateContest);
router.delete('/:contestId', adminContestController.deleteContest);

// Lifecycle operations
router.post('/:contestId/publish', adminContestController.publishContest);
router.post('/:contestId/start', adminContestController.startContest);
router.post('/:contestId/end', adminContestController.endContest);
router.post('/:contestId/cancel', adminContestController.cancelContest);
router.post('/:contestId/duplicate', adminContestController.duplicateContest);
router.post('/:contestId/disable', adminContestController.disableContest);
router.post('/:contestId/restore', adminContestController.restoreContest);

// Participant & Submissions management
router.get('/:contestId/participants', adminContestController.getContestParticipants);
router.post('/:contestId/disqualify', adminContestController.disqualifyParticipant);
router.get('/:contestId/submissions', adminContestController.getContestSubmissions);
router.post('/:contestId/publish-results', adminContestController.publishResults);
router.post('/:contestId/rebuild-leaderboard', adminContestController.rebuildLeaderboard);

module.exports = router;
