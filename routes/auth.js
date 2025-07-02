const Router = require('express').Router();
const authController = require('../controllers/authController')


Router.post('/login', authController.login)
Router.post('/register', authController.register)
Router.get('/refresh-token', authController.refresh);
Router.post('/logout', authController.logout);
Router.post('/forgot-password', authController.forgetPassword);
Router.post('/verify-otp', authController.verifyOTP);
Router.post('/reset-password', authController.resetPassword);

module.exports = Router;