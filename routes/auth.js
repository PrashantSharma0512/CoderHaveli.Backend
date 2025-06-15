const Router = require('express').Router();
const authController = require('../controllers/authController')


Router.post('/login', authController.login)
Router.post('/register', authController.register)
Router.get('/check-auth', authController.checkAuth);
Router.post('/logout', authController.logout);
module.exports = Router;