module.exports = (mongoose) => {
    const contestScoreSchema = new mongoose.Schema({
        contest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contest',
            required: true,
            index: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        totalScore: {
            type: Number,
            default: 0,
            index: true
        },
        problemsSolved: {
            type: Number,
            default: 0
        },
        penaltyTime: {
            type: Number, // in minutes
            default: 0,
            index: true
        },
        problemScores: [{
            problem: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ProblemList',
                required: true
            },
            score: {
                type: Number,
                default: 0
            },
            attempts: {
                type: Number,
                default: 0
            },
            solved: {
                type: Boolean,
                default: false
            },
            solvedAt: {
                type: Date,
                default: null
            }
        }],
        lastAcceptedAt: {
            type: Date,
            default: null
        },
        rank: {
            type: Number,
            default: 0,
            index: true
        },
        disqualified: {
            type: Boolean,
            default: false
        }
    }, {
        timestamps: true
    });

    contestScoreSchema.index({ contest: 1, user: 1 }, { unique: true });
    contestScoreSchema.index({ contest: 1, disqualified: 1, totalScore: -1, penaltyTime: 1, lastAcceptedAt: 1 });

    return mongoose.model('ContestScore', contestScoreSchema);
};
