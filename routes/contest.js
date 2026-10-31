const router = require('express').Router();
const contestController = require('../controllers/contestController');
const contestPassController = require('../controllers/contestPassController');
const Authenicated = require('../middlewares/Auth');
const publicAuth = require('../middlewares/publicAuth');

// Contest Pass plans & purchases
router.get('/pass/plans', publicAuth, contestPassController.getPlans);
router.post('/pass/order', Authenicated, contestPassController.createOrder);
router.post('/pass/verify', Authenicated, contestPassController.verifyPayment);
router.get('/pass/my-purchases', Authenicated, contestPassController.getMyPurchases);

// User search for invitations
router.get('/friends/search', Authenicated, contestController.searchUsersForInvite);

// Hosting entitlement & participant limits
router.get('/user/hosting-entitlement', Authenicated, contestController.getHostingEntitlement);

// User's received invitations
router.get('/invitations/my-invites', Authenicated, contestController.getMyInvitations);

// Public contest browsing
router.get('/', publicAuth, contestController.getAllContests);

// Create contest (public or private) by authenticated host
router.post('/', Authenicated, contestController.createUserContest);

// Contest details & leaderboard
router.get('/:contestId', publicAuth, contestController.getContestById);
router.patch('/:contestId', Authenicated, contestController.updateUserContest);
router.delete('/:contestId', Authenicated, contestController.cancelUserContest);
router.get('/:contestId/leaderboard', publicAuth, contestController.getContestLeaderboard);

// Invitation management
router.get('/:contestId/invitations', Authenicated, contestController.getContestInvitations);
router.post('/:contestId/invitations', Authenicated, contestController.inviteUsersToContest);
router.delete('/:contestId/invitations/:invitationId', Authenicated, contestController.removeInvitedUser);

// Authenticated participant actions
router.post('/:contestId/register', Authenicated, contestController.registerForContest);
router.delete('/:contestId/register', Authenicated, contestController.unregisterFromContest);
router.get('/:contestId/my-status', Authenicated, contestController.getMyStatus);
router.get('/:contestId/my-submissions', Authenicated, contestController.getMyContestSubmissions);
router.get('/:contestId/problems/:problemId', Authenicated, contestController.getContestProblem);
router.post('/:contestId/submissions', Authenicated, contestController.submitContestSolution);
router.post('/:contestId/run-sample', Authenicated, contestController.runContestSample);

module.exports = router;

