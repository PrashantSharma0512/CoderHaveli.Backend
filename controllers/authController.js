const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose')
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const User = mongoose.model('User');
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'user',
            //avatar: avatar || 'default-avatar.png' // Provide a default avatar if none specified
        });

        await newUser.save();
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                //avatar: newUser.avatar
            }
        });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const User = mongoose.model('User');

        const user = await User.findOne({ email, isDeleted: false });
        if (!user) {
            return res.status(404).json({ message: 'User not found or deleted' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.ACCESS_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        // Update user with refresh token
        user.refreshToken = refreshToken;
        user.modifiedAt = new Date();
        await user.save();
// for server
        // Set refresh token in HTTP-only cookie
        // res.cookie('refreshToken', refreshToken, {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === 'production',
        //     sameSite: 'none',
        //     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        // });
//for local testing 
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,           // false on localhost; true in production with HTTPS
            sameSite: 'lax',         // or 'none' if your frontend and backend are on different domains + secure:true
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.status(200).json({
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                // avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: error.message });
    }
};

// const checkAuth = (req, res) => {
//     try {

//         const token = req.cookies.token;


//         if (!token) {
//             return res.status(401).json({ isAuthenticated: false, message: 'No token' });
//         }

//         const decoded = jwt.verify(token, process.env.SECRET_KEY);
//         return res.status(200).json({
//             isAuthenticated: true,
//             userId: decoded.userId,
//             role: decoded.role
//         });

//     } catch (error) {
//         return res.status(401).json({ isAuthenticated: false, message: 'Invalid or expired token' });
//     }
// };

const refresh = async (req, res) => {

    const { refreshToken } = req.cookies;
    console.log(refreshToken);
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
                // avatar: user.avatar
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

module.exports = {
    register, login,
    //  checkAuth, 
    logout, refresh
};