
const bcrypt = require('bcrypt');
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
        const hashedPassword = await bcrypt.hash(password, 10);
        const isMatch = await bcrypt.compare(hashedPassword, user.password);
       

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.SECRET_KEY,
            { expiresIn: '1d' }
        );

        res.status(200).json({ message: 'Login successful', token, role: user.role });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { register, login };
