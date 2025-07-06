const Router = require('express').Router();
const authController = require('../controllers/authController');

// Authentication routes
Router.post('/login', authController.login);
Router.post('/logout', authController.logout);
Router.get('/refresh-token', authController.refresh);

// Registration with OTP verification routes
Router.post('/register', authController.register);
Router.post('/verify-registration-otp', authController.verifyRegistrationOTP);
Router.post('/resend-registration-otp', authController.resendRegistrationOTP);

// Password reset routes
Router.post('/forgot-password', authController.forgetPassword);
Router.post('/verify-password-reset-otp', authController.verifyPasswordResetOTP);
Router.post('/reset-password', authController.resetPassword);

module.exports = Router;