const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

module.exports = (mongoose) => ({
    User: mongoose.model(
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
            }
        })
    ),
    Image: mongoose.model(
        'Image',
        new mongoose.Schema({
            imageId: { type: Number, required: true, unique: true },
            url: { type: String, required: true },
            imageType: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now },
        })
    ),
    Course: mongoose.model(
        'Course',
        new mongoose.Schema({
            type: {
                type: String,
                enum: ['course', 'tutorial'],
                required: true
            },
            title: { type: String, required: true },
            description: { type: String, required: true },
            about: { type: String },
            duration: String,
            whatYouWillLearn: [{ type: String }],
            requirements: [{ type: String }],
            courseIncludes: [{ type: String }],
            price: { type: Number, default: null },
            image: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Image' },
            instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor' },
            category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
            lessons: [{
                title: String,
                content: String,
                videoUrl: String,
            }],
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    // Tutorial: mongoose.model('Tutorial', new mongoose.Schema({
    //     title: { type: String, required: true },
    //     description: { type: String, required: true },
    //     about: { type: String },
    //     duration: String,
    //     whatYouWillLearn: [{ type: String }],
    //     requirements: [{ type: String }],
    //     courseIncludes: [{ type: String }],
    //     image: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Image' },
    //     instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor' },
    //     category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    //     lessons: [{
    //         title: String,
    //         content: String,
    //         videoUrl: String,
    //     }],
    //     createdAt: { type: Date, default: Date.now },
    //     modifiedAt: { type: Date, default: Date.now }
    // })),
    Instructor: mongoose.model(
        'Instructor',
        new mongoose.Schema({
            name: { type: String, required: true },
            email: { type: String, required: true },
            bio: String,
            image: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
            createdAt: { type: Date, default: Date.now }
        })
    ),
    Category: mongoose.model(
        'Category',
        new mongoose.Schema({
            name: { type: String, required: true }
        })
    ),
    Code: mongoose.model(
        'Code',
        new mongoose.Schema({
            quesId: { type: String, required: true },
            userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
            code: { type: String, required: true },
            codelanguage: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    TestCase: mongoose.model(
        'TestCase',
        new mongoose.Schema({
            quesId: { type: String, required: true },
            input: { type: String, required: true },
            output: { type: String, required: true },
            explaination: { type: String, default: '' },
            timeLimit: { type: Number, default: 1000 },
            memoryLimit: { type: Number, default: 256 },
        })
    ),
    ProblemList: mongoose.model(
        'ProblemList',
        new mongoose.Schema({
            quesId: { type: String, required: true },
            quesName: { type: String, required: true },
            quesDesc: { type: String, required: true },
            difficulty: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard'] },
            problemExample: { type: mongoose.Schema.Types.ObjectId, ref: 'ProblemExample' },
            code: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Code' }],
            contraints: { type: mongoose.Schema.Types.ObjectId, ref: 'Contraints' },
            tags: [{ type: String, default: null }],
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    Constraints: mongoose.model(
        'Constraints',
        new mongoose.Schema({
            quesId: { type: String, required: true },
            contraints: { type: [String], required: true }
        })
    ),
    hint: mongoose.model(
        'Hint',
        new mongoose.Schema({
            quesId: { type: String, required: true },
            hints: [{ type: String, required: true }]
        })
    ),
    Submissions: mongoose.model(
        'Submission',
        new mongoose.Schema({
            quesId: { type: String, required: true },
            code: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Code' },
            codelanguage: { type: String, required: true },
            userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
            status: {
                type: String,
                required: true,
                enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error'],
                default: ''
            },
            execution_time: { type: String, default: null },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    Approaches: mongoose.model(
        'Approaches',
        new mongoose.Schema({
            quesId: { type: String, required: true },
            approachName: { type: String },
            approachDesc: { type: String, required: true },
            approachType: {
                type: String,
                required: true,
                enum: ['Brute Force', 'Improved', 'Optimised']
            },
            code: {
                javascript: { type: String, default: null },
                python: { type: String, default: null },
                java: { type: String, default: null },
                cpp: { type: String, default: null },
            },
            time_complexity: { type: String, default: null },
            space_complexity: { type: String, default: null },
            videoUrl: { type: String, default: null },
            order: { type: Number, default: 0 },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    Progess: mongoose.model(
        'Progess',
        new mongoose.Schema({
            quesId: { type: String, required: true },
            userID: { type: String, required: true },
            progress: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    Community: mongoose.model(
        'Community',
        new mongoose.Schema({
            problem: { type: mongoose.Schema.Types.ObjectId, ref: 'ProblemList', required: true },
            author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            question: { type: String, required: true },
            answers: [{
                author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                answer: String,
                createdAt: { type: Date, default: Date.now }
            }],
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    StarterCodeSchema: mongoose.model(
        'StarterCode',
        new mongoose.Schema({
            quesId: {
                type: String,
                required: true,
            },
            language: {
                type: String,
                required: true,
                enum: ['javascript', 'python', 'java', 'cpp']
            },
            code: {
                type: String,
                required: true
            },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    Comment: mongoose.model(
        "Comment",
        new mongoose.Schema({
            quesId: {
                type: String,
                required: true,
                index: true,
            },
            author: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            parentComment: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Comment",
                default: null,
            },
            type: {
                type: String,
                enum: ["general", "difficulty", "approach", "issue", "feedback"],
                default: "general",
            },
            content: {
                type: String,
                required: true,
                trim: true,
            },
            likes: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
            ],
            isEdited: {
                type: Boolean,
                default: false,
            },
            isDeleted: {
                type: Boolean,
                default: false,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
            updatedAt: {
                type: Date,
                default: Date.now,
            },
        }).pre("save", function (next) {
            this.updatedAt = new Date();
            next();
        })
    ),


    email: { type: String, required: true, unique: true, index: true },

    difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'], index: true },

    status: { type: String, required: true, index: true }

});