const Router = require('express').Router();
const Problem = require('../controllers/problemController');


Router.get('/',Problem.getAllProblems)
Router.get('/:id', Problem.getProblemById);
Router.get('/get-editorial/:id', Problem.getEditorialById);
Router.post('/run',Problem.run)
Router.post('/run',Problem.run)
Router.post('/submit',Problem.submit)
module.exports = Router;