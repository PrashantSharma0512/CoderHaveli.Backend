module.exports = (mongoose) => {
    return mongoose.model(
        'User',
        new mongoose.Schema({
            name: {
                type: String,
                required: true,
                trim: true
            },
            email: {
                type: String,
                required: true,
                unique: true,
                trim: true,
                lowercase: true,
                validate: {
                    validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
                    message: 'Invalid email format'
                }
            },
            phone: {
                type: Number,
                unique: true,
            },
            password: {
                type: String,
                required: true
            },
            role: {
                type: String,
                required: true,
                enum: ['user', 'admin'], // Specify allowed roles
                default: 'user'
            },
            bio: {
                type: String,
                default: '',
                trim: true
            },
            isDeleted: {
                type: Boolean,
                default: false
            },
            isVerified: {
                type: Boolean,
                default: false
            },
            // For registration OTP
            otp: {
                type: String
            },
            otpExpiry: {
                type: Date
            },
            // For password reset OTP
            resetOtp: {
                type: String
            },
            resetOtpExpiry: {
                type: Date
            },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: {
                type: Date,
                default: Date.now
            },
            refreshToken: {
                type: String
            },
            avatar: {
                type: String,
                default: "https://th.bing.com/th/id/OIP.18ygnwZ7ZIBpWdtoy6cG1QHaHk?o=7rm=3&rs=1&pid=ImgDetMain&cb=idpwebpc2"
            },
            username: {
                type: String,
                unique: true,
                trim: true,
                lowercase: true
            },
            news_subscribe: {
                type: Boolean,
                default: false
            },
        })
    );
};
