module.exports = (mongoose) => {
    const contestSubmissionSchema = new mongoose.Schema({
        contest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contest',
            required: true,
            index: true
        },
        problem: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProblemList',
            required: true,
            index: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        language: {
            type: String,
            required: true
        },
        sourceCode: {
            type: String,
            required: true
        },
        submittedAt: {
            type: Date,
            default: Date.now,
            index: true
        },
        judgingStartedAt: {
            type: Date
        },
        judgingCompletedAt: {
            type: Date
        },
        verdict: {
            type: String,
            enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error', 'Pending'],
            default: 'Pending',
            index: true
        },
        score: {
            type: Number,
            default: 0
        },
        runtime: {
            type: Number,
            default: 0
        },
        memory: {
            type: Number,
            default: 0
        },
        testCaseResults: [{
            testCaseNumber: Number,
            status: String,
            executionTime: Number,
            memory: Number,
            error: String
        }],
        submissionStatus: {
            type: String,
            enum: ['queued', 'judging', 'completed', 'failed'],
            default: 'completed'
        }
    }, {
        timestamps: true
    });

    contestSubmissionSchema.index({ contest: 1, user: 1, problem: 1 });
    contestSubmissionSchema.index({ contest: 1, submittedAt: -1 });

    return mongoose.model('ContestSubmission', contestSubmissionSchema);
};
