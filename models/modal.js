const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

module.exports = (nosql) => ({
    User: nosql.model(
        'User',
        new nosql.Schema({
            name: { type: String, required: true, default: '' },
            email: { type: String, required: true, unique: true },
            password: { type: String, required: true, set: (v) => bcrypt.hashSync(v, bcrypt.genSaltSync(10)) },
            role: { type: String, required: true },
            isDeleted: { type: Boolean, default: false },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    Image: nosql.model(
        'Image',
        new nosql.Schema({
            imageId: { type: Number, required: true, unique: true },
            url: { type: String, required: true },
            imageType: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now },
        })
    ),
    Course: nosql.model(
        'Course',
        new nosql.Schema({
            title: { type: String, required: true },
            description: { type: String, required: true },
            image: { type: nosql.Schema.Types.ObjectId, required: true, ref: 'Image' },
            price: Number,
            duration: String,
            instructor: { type: nosql.Schema.Types.ObjectId, ref: 'Instructor' },
            category: { type: nosql.Schema.Types.ObjectId, ref: 'Category' },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    Tutorial: nosql.model('Tutorial', new nosql.Schema({
        title: { type: String, required: true },
        description: { type: String, required: true },
        image: { type: nosql.Schema.Types.ObjectId, required: true, ref: 'Image' },
        instructor: { type: nosql.Schema.Types.ObjectId, ref: 'Instructor' },
        category: { type: nosql.Schema.Types.ObjectId, ref: 'Category' },
        createdAt: { type: Date, default: Date.now },
        modifiedAt: { type: Date, default: Date.now }
    })),
    Instructor: nosql.model(
        'Instructor',
        new nosql.Schema({
            name: { type: String, required: true },
            email: { type: String, required: true },
            bio: String,
            image: { type: nosql.Schema.Types.ObjectId, ref: 'Image' },
            createdAt: { type: Date, default: Date.now }
        })
    ),
    Category: nosql.model(
        'Category',
        new nosql.Schema({
            name: { type: String, required: true }
        })
    ),
    Code: nosql.model(
        'Code',
        new nosql.Schema({
            quesId: { type: String, required: true },
            quesName: { type: String, required: true },
            code: { type: String, required: true },
            codelanguage: { type: String, required: true },
            complexityType: { type: String, required: true, enum: ['Brute Force', 'Optimised', 'Most Optimised'] },
            time_complexity: { type: String, default: null },
            space_complexity: { type: String, default: null },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    TestCase: nosql.model(
        'TestCase',
        new nosql.Schema({
            quesId: { type: String, required: true },
            input: { type: String, required: true },
            output: { type: String, required: true }
        })
    ),
    ProblemList: nosql.model(
        'ProblemList',
        new nosql.Schema({
            quesId: { type: String, required: true },
            quesName: { type: String, required: true },
            quesDesc: { type: String, required: true },
            difficulty: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard'] },
            problemExample: { type: nosql.Schema.Types.ObjectId, ref: 'ProblemExample' },
            code: [{ type: nosql.Schema.Types.ObjectId, ref: 'Code' }],
            contraints: { type: nosql.Schema.Types.ObjectId, ref: 'Contraints' },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    ProblemExample: nosql.model(
        'ProblemExample',
        new nosql.Schema({
            quesId: { type: String, required: true },
            input: { type: String, required: true },
            output: { type: String, required: true },
            explaination: { type: String, }
        })
    ),
    Constraints: nosql.model(
        'Constraints',
        new nosql.Schema({
            quesId: { type: String, required: true },
            contraints: { type: [String], required: true }
        })
    ),
    hint: nosql.model(
        'Hint',
        new nosql.Schema({
            quesId: { type: String, required: true },
            hints: [{ type: String, required: true }]
        })
    ),
    Submissions: nosql.model(
        'Submissions',
        new nosql.Schema({
            quesId: { type: String, required: true },
            code: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    Approaches: nosql.model(
        'Approaches',
        new nosql.Schema({
            quesId: { type: String, required: true },
            approachDesc: { type: String, required: true },
            approachType: { type: String, required: true, enum: ['Brute Force', 'Improved', 'Optimised'] },
            code: { type: nosql.Schema.Types.ObjectId, ref: 'Code' },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    Progess: nosql.model(
        'Progess',
        new nosql.Schema({
            quesId: { type: String, required: true },
            userID: { type: String, required: true },
            progress: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    Community: nosql.model(
        'Community',
        new nosql.Schema({
            problem: { type: nosql.Schema.Types.ObjectId, ref: 'ProblemList', required: true },
            author: { type: nosql.Schema.Types.ObjectId, ref: 'User', required: true },
            question: { type: String, required: true },
            answers: [{
                author: { type: nosql.Schema.Types.ObjectId, ref: 'User' },
                answer: String,
                createdAt: { type: Date, default: Date.now }
            }],
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    ),
    email: { type: String, required: true, unique: true, index: true },

    difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'], index: true },

    status: { type: String, required: true, index: true }

});