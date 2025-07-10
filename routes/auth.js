const router = require('express').Router();
const authController = require('../controllers/authController');

// Authentication routes
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/refresh-token', authController.refresh);

// Registration with OTP verification routes
router.post('/register', authController.register);
router.post('/verify-registration-otp', authController.verifyRegistrationOTP);
router.post('/resend-registration-otp', authController.resendRegistrationOTP);

// Password reset routes
router.post('/forgot-password', authController.forgetPassword);
router.post('/verify-password-reset-otp', authController.verifyPasswordResetOTP);
router.post('/reset-password', authController.resetPassword);

module.exports = router;