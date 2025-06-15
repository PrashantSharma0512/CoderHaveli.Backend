
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const register = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        const Register = nosql.model('User');
        const existingUser = await Register.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new Register({
            name,
            email,
            phone,
            password: hashedPassword,
            role: role || 'user' // fallback to default
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const Register = nosql.model('User');
        const user = await Register.findOne({ email, isDeleted: false });
        if (!user) {
            return res.status(404).json({ message: 'User not found or deleted' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.SECRET_KEY,
            { expiresIn: '1d' }
        );
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
            sameSite: 'Lax' // Adjust as necessary
        });

        res.status(200).json({ message: 'Login successful', token, role: user.role });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: error.message });
    }
};
const checkAuth = (req, res) => {
    try {

        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ isAuthenticated: false, message: 'No token' });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        return res.status(200).json({
            isAuthenticated: true,
            userId: decoded.userId,
            role: decoded.role
        });

    } catch (error) {
        return res.status(401).json({ isAuthenticated: false, message: 'Invalid or expired token' });
    }
};
const logout = (req, res) => {
    res
        .cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            expires: new Date(0), // immediately expire
        })
        .status(200)
        .json({ message: 'Logged out' });
}

module.exports = { register, login, checkAuth, logout };
