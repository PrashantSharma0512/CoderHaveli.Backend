const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose')
const transporter = require('../utils/Mailer');
const generateUserName = async (name) => {
    const User = mongoose.model('User');

    const baseUsername = name.toLowerCase().replace(/\s+/g, '');

    const regex = new RegExp(`^${baseUsername}\\d*$`, 'i');
    const existingUsers = await User.find({ username: regex }).select('username');

    const existingUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));

    if (!existingUsernames.has(baseUsername)) {
        return baseUsername;
    }

    // Efficiently find the next available numbered username
    let counter = 1;
    while (existingUsernames.has(`${baseUsername}${counter}`)) {
        counter++;
    }

    return `${baseUsername}${counter}`;
};


const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const User = mongoose.model('User');
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        const username = await generateUserName(name);
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'user',
            username,
        });

        await newUser.save();
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                username: newUser.username
            }
        });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        const User = mongoose.model('User');

        const user = await User.findOne({ email, isDeleted: false });
        if (!user) {
            return res.status(404).json({ message: 'User not found or deleted' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
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

const refresh = async (req, res) => {

    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.sendStatus(401);

    try {
        const User = mongoose.model('User');

        // Verify token and check if it exists in user document
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
        const user = await User.findOne({
            _id: decoded.userId,
            refreshToken: refreshToken,
            isDeleted: false
        });

        if (!user) {
            return res.sendStatus(403); // Forbidden - token not associated with user
        }

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
            // Clean up expired token from user document if needed
            const decoded = jwt.decode(refreshToken);
            await User.updateOne(
                { _id: decoded.userId },
                { $unset: { refreshToken: "" }, modifiedAt: new Date() }
            );
        }
        return res.sendStatus(403);
    }
};

const logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;

        if (refreshToken) {
            // Remove the refresh token from user document
            const User = mongoose.model('User');
            const decoded = jwt.decode(refreshToken);
            await User.updateOne(
                { _id: decoded.userId },
                { $unset: { refreshToken: "" }, modifiedAt: new Date() }
            );
        }

        // Clear cookies
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

const forgetPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const User = mongoose.model('User')
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP & expiry in user document
        user.resetOtp = otp;
        user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // Send Email
        await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: "Your OTP for password reset",
            html: `<h2>Your OTP is: <strong>${otp}</strong></h2><p>Valid for 10 minutes.</p>`,
        });

        res.status(200).json({ message: "OTP sent successfully!" });
    } catch (error) {
        console.error("Error in forgetPassword:", error);
        res.status(500).json({ message: "Something went wrong!" });
    }
};
const verifyOTP = async (req, res) => {
    const User = mongoose.model('User')
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });
        if (!user || !user.resetOtp || !user.resetOtpExpiry) {
            return res.status(400).json({ message: "OTP not found. Request again." });
        }

        if (user.resetOtp !== otp || user.resetOtpExpiry < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
        console.error("Error in verifyOTP:", error);
        res.status(500).json({ message: "Server error" });
    }
};




const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    const User = mongoose.model('User')
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Clear OTP fields
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
    login,
    logout,
    refresh,
    forgetPassword,
    verifyOTP,
    resetPassword
};