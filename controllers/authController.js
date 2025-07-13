const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const transporter = require('../utils/Mailer');

// Helper functions
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateUserName = async (name) => {
    const User = mongoose.model('User');
    const baseUsername = name.toLowerCase().replace(/\s+/g, '');
    const regex = new RegExp(`^${baseUsername}\\d*$`, 'i');
    const existingUsers = await User.find({ username: regex }).select('username');
    const existingUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));

    if (!existingUsernames.has(baseUsername)) return baseUsername;

    let counter = 1;
    while (existingUsernames.has(`${baseUsername}${counter}`)) counter++;
    return `${baseUsername}${counter}`;
};

const register = async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const User = mongoose.model('User');
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            // Clean expired unverified user
            if (existingUser.otpExpiry < Date.now()) {
                await User.deleteOne({ email });
            } else {
                return res.status(400).json({ message: 'OTP already sent. Please verify or wait to re-register.' });
            }
        }

        // Generate OTP and set expiration (10 minutes)
        const otp = generateOTP();
        const otpExpiry = Date.now() + 10 * 60 * 1000;

        // Create user (not verified yet)
        const username = await generateUserName(name);
        const newUser = new User({
            name,
            email,
            phone,
            password: await bcrypt.hash(password, 10),
            role: role || 'user',
            username,
            otp,
            otpExpiry,
            isVerified: false
        });


        await newUser.save();
        // Send OTP email
        await transporter.sendMail({
            from: `"CoderHaveli" <${process.env.MAIL_USER}>`,
            to: email,
            subject: "🔐 Your CoderHaveli Verification Code",
            html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e8e8e8; border-radius: 4px; overflow: hidden; background: white;">
            <div style="background: linear-gradient(135deg, #FFD700 0%, #D4AF37 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 1px 1px 3px rgba(0,0,0,0.2); letter-spacing: 1px;">
                    <strong>CoderHaveli</strong>
                </h1>
                <p style="color: white; margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Code • Create • Conquer</p>
            </div>
            
            <div style="padding: 30px;">
                <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #FFD700; padding-bottom: 10px; display: inline-block;">
                    Email Verification Required
                </h2>
                
                <p style="font-size: 15px; line-height: 1.6; color: #555;">
                    Welcome to CoderHaveli! Here's your verification code:
                </p>
                
                <div style="background: linear-gradient(135deg, #FFF9E6 0%, #FFEEB8 100%); 
                        border: 2px dashed #D4AF37;
                        border-radius: 8px; 
                        padding: 20px; 
                        text-align: center; 
                        margin: 25px 0; 
                        font-size: 32px; 
                        font-weight: bold; 
                        color: #B8860B;
                        letter-spacing: 3px;">
                    ${otp}
                </div>
                
                <div style="background-color: #FFFDF6; border-left: 4px solid #FFD700; padding: 12px; margin: 20px 0;">
                    <p style="font-size: 13px; color: #666; margin: 0;">
                        ⏳ <strong>Expires in 10 minutes</strong><br>
                        🔒 This code is confidential - never share it
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #777; text-align: center; line-height: 1.5;">
                    If you didn't sign up for CoderHaveli, please ignore this email.
                </p>
            </div>
            
            <div style="background: #F8F5EE; padding: 15px; text-align: center; border-top: 1px solid #FFD700;">
                <p style="margin: 5px 0; font-size: 12px; color: #B8860B;">
                    © ${new Date().getFullYear()} <strong>CoderHaveli</strong> | The Premium Coding Community
                </p>
            </div>
        </div>
    `
        });

        res.status(200).json({
            message: 'OTP sent to your email',
            email,
            nextStep: 'verify-otp'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
};

// Verify OTP for registration
const verifyRegistrationOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const User = mongoose.model('User');

        const user = await User.findOne({
            email,
            otp,
            otpExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Mark user as verified and clear OTP fields
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.status(200).json({
            message: 'Email verified successfully!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ message: 'OTP verification failed' });
    }
};

// Resend OTP for registration
const resendRegistrationOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const User = mongoose.model('User');

        const user = await User.findOne({ email, isVerified: false });
        if (!user) {
            return res.status(400).json({ message: 'Email already verified or not registered' });
        }

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = Date.now() + 10 * 60 * 1000;

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        // Send new OTP email
        await transporter.sendMail({
            from: `"CoderHaveli" <${process.env.MAIL_USER}>`,
            to: email,
            subject: "🔐 Your CoderHaveli Resend Verification Code",
            html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e8e8e8; border-radius: 4px; overflow: hidden; background: white;">
            <div style="background: linear-gradient(135deg, #FFD700 0%, #D4AF37 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 1px 1px 3px rgba(0,0,0,0.2); letter-spacing: 1px;">
                    <strong>CoderHaveli</strong>
                </h1>
                <p style="color: white; margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Code • Create • Conquer</p>
            </div>
            
            <div style="padding: 30px;">
                <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #FFD700; padding-bottom: 10px; display: inline-block;">
                    Email Verification Required
                </h2>
                
                <p style="font-size: 15px; line-height: 1.6; color: #555;">
                    Welcome to CoderHaveli! Here's your verification code:
                </p>
                
                <div style="background: linear-gradient(135deg, #FFF9E6 0%, #FFEEB8 100%); 
                        border: 2px dashed #D4AF37;
                        border-radius: 8px; 
                        padding: 20px; 
                        text-align: center; 
                        margin: 25px 0; 
                        font-size: 32px; 
                        font-weight: bold; 
                        color: #B8860B;
                        letter-spacing: 3px;">
                    ${otp}
                </div>
                
                <div style="background-color: #FFFDF6; border-left: 4px solid #FFD700; padding: 12px; margin: 20px 0;">
                    <p style="font-size: 13px; color: #666; margin: 0;">
                        ⏳ <strong>Expires in 10 minutes</strong><br>
                        🔒 This code is confidential - never share it
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #777; text-align: center; line-height: 1.5;">
                    If you didn't sign up for CoderHaveli, please ignore this email.
                </p>
            </div>
            
            <div style="background: #F8F5EE; padding: 15px; text-align: center; border-top: 1px solid #FFD700;">
                <p style="margin: 5px 0; font-size: 12px; color: #B8860B;">
                    © ${new Date().getFullYear()} <strong>CoderHaveli</strong> | The Premium Coding Community
                </p>
            </div>
        </div>
    `
        });

        res.status(200).json({ message: 'New OTP sent to your email' });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: 'Failed to resend OTP' });
    }
};

// Verify OTP for password reset
const verifyPasswordResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const User = mongoose.model('User');

        const user = await User.findOne({
            email,
            resetOtp: otp,
            resetOtpExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Clear the OTP after successful verification
        user.resetOtp = undefined;
        user.resetOtpExpiry = undefined;
        await user.save();

        res.status(200).json({
            message: 'OTP verified successfully',
            email
        });

    } catch (error) {
        console.error('Password reset OTP verification error:', error);
        res.status(500).json({ message: 'OTP verification failed' });
    }
};

// Login with verification check
const login = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        const User = mongoose.model('User');

        const user = await User.findOne({ email, isDeleted: false });
        if (!user) {
            return res.status(404).json({ message: 'User not found or deleted' });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                message: 'Email not verified. Please verify your email first.',
                isVerified: false,
                email: user.email
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(isMatch, "prashant");

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Token expiration logic
        const accessTokenExpiry = rememberMe ? '7d' : '15m';
        const refreshTokenExpiry = rememberMe ? '30d' : '7d';
        const refreshTokenMaxAge = rememberMe
            ? 30 * 24 * 60 * 60 * 1000 // 30 days
            : 7 * 24 * 60 * 60 * 1000; // 7 days

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.ACCESS_SECRET,
            { expiresIn: accessTokenExpiry }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.REFRESH_SECRET,
            { expiresIn: refreshTokenExpiry }
        );

        // Update user with refresh token
        user.refreshToken = refreshToken;
        user.modifiedAt = new Date();
        await user.save();

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: refreshTokenMaxAge
        });

        // Send access token and user info
        res.status(200).json({
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: error.message });
    }
};

// Refresh token
const refresh = async (req, res) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.sendStatus(401);

    try {
        const User = mongoose.model('User');
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
        const user = await User.findOne({
            _id: decoded.userId,
            refreshToken: refreshToken,
            isDeleted: false
        });

        if (!user) return res.sendStatus(403);

        // Generate new access token
        const newAccessToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.ACCESS_SECRET,
            { expiresIn: '15m' }
        );

        res.json({
            accessToken: newAccessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        if (error.name === 'TokenExpiredError') {
            const decoded = jwt.decode(refreshToken);
            await User.updateOne(
                { _id: decoded.userId },
                { $unset: { refreshToken: "" }, modifiedAt: new Date() }
            );
        }
        return res.sendStatus(403);
    }
};

// Logout
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;

        if (refreshToken) {
            const User = mongoose.model('User');
            const decoded = jwt.decode(refreshToken);
            await User.updateOne(
                { _id: decoded.userId },
                { $unset: { refreshToken: "" }, modifiedAt: new Date() }
            );
        }

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.status(200).json({ message: 'Logged out successfully' });

    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ message: 'Error during logout' });
    }
};

// Forgot password - send OTP
const forgetPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const User = mongoose.model('User');
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const otp = generateOTP();
        user.resetOtp = otp;
        user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        await transporter.sendMail({
            from: `"CoderHaveli" <${process.env.MAIL_USER}>`,
            to: email,
            subject: "🔐 Your CoderHaveli Password Reset Code",
            html: `
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e8e8e8; border-radius: 4px; overflow: hidden; background: white;">
                    <div style="background: linear-gradient(135deg, #FFD700 0%, #D4AF37 100%); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 1px 1px 3px rgba(0,0,0,0.2); letter-spacing: 1px;">
                            <strong>CoderHaveli</strong>
                        </h1>
                        <p style="color: white; margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Code • Create • Conquer</p>
                    </div>
                    
                    <div style="padding: 30px;">
                        <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #FFD700; padding-bottom: 10px; display: inline-block;">
                            Password Reset Request
                        </h2>
                        
                        <p style="font-size: 15px; line-height: 1.6; color: #555;">
                            Your exclusive access code to reset your CoderHaveli password:
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #FFF9E6 0%, #FFEEB8 100%); 
                                border: 2px dashed #D4AF37;
                                border-radius: 8px; 
                                padding: 20px; 
                                text-align: center; 
                                margin: 25px 0; 
                                font-size: 32px; 
                                font-weight: bold; 
                                color: #B8860B;
                                letter-spacing: 3px;">
                            ${otp}
                        </div>
                        
                        <div style="background-color: #FFFDF6; border-left: 4px solid #FFD700; padding: 12px; margin: 20px 0;">
                            <p style="font-size: 13px; color: #666; margin: 0;">
                                ⏳ <strong>Expires in 10 minutes</strong><br>
                                🔒 This code is confidential - never share it
                            </p>
                        </div>
                        
                        <p style="font-size: 14px; color: #777; text-align: center; line-height: 1.5;">
                            If you didn't request this, please secure your account by contacting our 
                            <span style="color: #D4AF37; font-weight: bold;">support team</span> immediately.
                        </p>
                    </div>
                    
                    <div style="background: #F8F5EE; padding: 15px; text-align: center; border-top: 1px solid #FFD700;">
                        <p style="margin: 5px 0; font-size: 12px; color: #B8860B;">
                            © ${new Date().getFullYear()} <strong>CoderHaveli</strong> | The Premium Coding Community
                        </p>
                    </div>
                </div>
            `
        });

        res.status(200).json({ message: "OTP sent successfully!" });
    } catch (error) {
        console.error("Error in forgetPassword:", error);
        res.status(500).json({ message: "Something went wrong!" });
    }
};

// Reset password after OTP verification
const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    const User = mongoose.model('User');
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetOtp = undefined;
        user.resetOtpExpiry = undefined;
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("Error in resetPassword:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    register,
    verifyRegistrationOTP,
    resendRegistrationOTP,
    verifyPasswordResetOTP,
    login,
    logout,
    refresh,
    forgetPassword,
    resetPassword
};