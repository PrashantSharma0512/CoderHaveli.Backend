const router = require('express').Router();
const Problem = require('../controllers/problemController');

// routes for get problem data for ui
router.get('/', Problem.getAllProblems)
router.get('/:id', Problem.getProblemById);
router.get('/get-editorial/:id', Problem.getEditorialById);
router.get('get-submission/:id&:quesId', Problem.getSubmission);

//routes for compiler
router.post('/run', Problem.run)
router.post('/submit', Problem.submit)

module.exports = router;