const router = require('express').Router();
const Problem = require('../controllers/problemController');

// routes for get problem data for ui
router.get('/problem', Problem.getAllProblems)
router.get('/problem/get-problem-by-id', Problem.getProblemById);

router.get('/problem/get-editorial/:id', Problem.getEditorialById);
router.get('/problem/get-submission/:userId/:quesId', Problem.getSubmission);
router.get('/problem/get-starter-code', Problem.getStarterCode);


// routes for comment section
router.get('/problem/fetch-comment', Problem.fetchComment)
router.post('/problem/add-comment', Problem.addComment)
router.put('/problem/edit-comment', Problem.editComment)
router.post('/problem/delete-comment', Problem.deleteComment)
router.post('/problem/like', Problem.addLike)


//routes for compiler
router.post('/problem/run', Problem.run)
router.post('/problem/submit', Problem.submit)


module.exports = router;