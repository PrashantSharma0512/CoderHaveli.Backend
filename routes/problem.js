const router = require('express').Router();
const Problem = require('../controllers/problemController');
const AnalyticsMiddleware = require('../middlewares/Analytics');
const Authenicated = require('../middlewares/Auth');
const publicAuth = require('../middlewares/publicAuth');


// routes for get problem data for ui
router.get('/problem', Problem.getAllProblems)
router.get('/problem/get-problem-by-id', Authenicated, AnalyticsMiddleware, Problem.getProblemById);

router.get('/problem/get-editorial/:id', Authenicated, Problem.getEditorialById);
router.get('/problem/get-submission/:userId/:quesId', Authenicated, Problem.getSubmission);
router.get('/problem/get-starter-code', Authenicated, Problem.getStarterCode);


// routes for comment section
router.get('/problem/fetch-comment', Authenicated, Problem.fetchComment)
router.post('/problem/add-comment', Authenicated, AnalyticsMiddleware, Problem.addComment)
router.put('/problem/edit-comment', Authenicated, AnalyticsMiddleware, Problem.editComment)
router.post('/problem/delete-comment', Authenicated, AnalyticsMiddleware, Problem.deleteComment)
router.post('/problem/like', Authenicated, AnalyticsMiddleware, Problem.addLike)


//routes for compiler
router.post('/problem/run', Authenicated, Problem.run)
router.post('/problem/submit', Authenicated, AnalyticsMiddleware, Problem.submit)

// routes for admin panel
router.post('/problem/add-question', Authenicated, AnalyticsMiddleware, Problem.addQuestion);
module.exports = router;