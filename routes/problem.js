const router = require('express').Router();
const Problem = require('../controllers/problemController');
const Authenicated = require('../middlewares/Auth')


// routes for get problem data for ui
router.get('/problem', Problem.getAllProblems)
router.get('/problem/get-problem-by-id', Authenicated, Problem.getProblemById);

router.get('/problem/get-editorial/:id', Authenicated, Problem.getEditorialById);
router.get('/problem/get-submission/:userId/:quesId', Authenicated, Problem.getSubmission);
router.get('/problem/get-starter-code', Authenicated, Problem.getStarterCode);


// routes for comment section
router.get('/problem/fetch-comment', Authenicated, Problem.fetchComment)
router.post('/problem/add-comment', Authenicated, Problem.addComment)
router.put('/problem/edit-comment', Authenicated, Problem.editComment)
router.post('/problem/delete-comment', Authenicated, Problem.deleteComment)
router.post('/problem/like', Authenicated, Problem.addLike)


//routes for compiler
router.post('/problem/run', Problem.run)
router.post('/problem/submit', Problem.submit)

// routes for admin panel
router.post('/problem/add-question', Problem.addQuestion);
module.exports = router;