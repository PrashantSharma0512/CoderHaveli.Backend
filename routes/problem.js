const router = require('express').Router();
const Problem = require('../controllers/problemController');

// routes for get problem data for ui
router.get('/', Problem.getAllProblems)


router.get('/get-editorial/:id', Problem.getEditorialById);
router.get('/get-submission/:userId/:quesId', Problem.getSubmission);
router.get('/get-starter-code', Problem.getStarterCode);

//routes for compiler
router.post('/run', Problem.run)
router.post('/submit', Problem.submit)
router.get('/:id', Problem.getProblemById);

module.exports = router;