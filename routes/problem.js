const Router = require('express').Router();
const Problem = require('../controllers/problemController');



Router.get('/:id', Problem.getProblemById);

module.exports = Router;