const Router = require('express').Router();
const authController = require('../controllers/authController')


Router.post('/login',authController.login)
Router.post('/register',authController.register)

module.exports = Router;