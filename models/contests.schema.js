const mongoose = require('mongoose');

module.exports = (mongoose) => {
    const contestSchema = new mongoose.Schema({
        title: {
            type: String,
            required: [true, 'Contest title is required'],
            trim: true,
            maxlength: 120
        },
        slug: {
            type: String,
            required: [true, 'Contest slug is required'],
            unique: true,
            trim: true,
            lowercase: true,
            index: true
        },
        description: {
            type: String,
            required: [true, 'Short description is required'],
            trim: true,
            maxlength: 500
        },
        detailedDescription: {
            type: String,
            default: ''
        },
        banner: {
            type: String,
            default: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80'
        },
        contestType: {
            type: String,
            enum: ['public', 'private', 'practice'],
            default: 'public',
            index: true
        },
        difficulty: {
            type: String,
            enum: ['All Levels', 'Beginner', 'Intermediate', 'Advanced'],
            default: 'All Levels',
            index: true
        },
        status: {
            type: String,
            enum: ['draft', 'scheduled', 'live', 'ended', 'cancelled', 'disabled'],
            default: 'draft',
            index: true
        },
        visibility: {
            type: String,
            enum: ['public', 'unlisted', 'private'],
            default: 'public'
        },
        startTime: {
            type: Date,
            required: [true, 'Start time is required'],
            index: true
        },
        endTime: {
            type: Date,
            required: [true, 'End time is required'],
            index: true
        },
        registrationOpenAt: {
            type: Date
        },
        registrationCloseAt: {
            type: Date
        },
        timezone: {
            type: String,
            default: 'Asia/Kolkata'
        },
        rules: {
            type: String,
            default: '1. No plagiarism allowed.\n2. Submissions after contest end will not be counted towards rank.\n3. Each wrong attempt on a problem before solve may incur penalty minutes.'
        },
        prize: {
            type: String,
            default: 'Top rankers win CoderHaveli badges & community recognition!'
        },
        accessCode: {
            type: String,
            trim: true,
            default: null
        },
        maxParticipants: {
            type: Number,
            default: 0 // 0 means unlimited
        },
        allowedLanguages: {
            type: [String],
            default: ['javascript', 'python', 'cpp', 'java']
        },
        problems: [{
            problem: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ProblemList',
                required: true
            },
            points: {
                type: Number,
                required: true,
                default: 100
            },
            order: {
                type: Number,
                default: 1
            }
        }],
        scoringConfig: {
            wrongPenalty: {
                type: Number,
                default: 10 // penalty minutes per wrong submission
            },
            partialScoring: {
                type: Boolean,
                default: false
            },
            tieBreaker: {
                type: String,
                enum: ['penalty_then_time', 'time_only'],
                default: 'penalty_then_time'
            }
        },
        leaderboardVisibility: {
            type: String,
            enum: ['always', 'during', 'after'],
            default: 'always'
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true
        },
        participantLimit: {
            type: Number,
            default: 5
        },
        generatedBy: {
            type: String,
            enum: ['user', 'admin', 'scheduler'],
            default: 'admin',
            index: true
        },
        weeklyIdentifier: {
            type: String,
            default: null
        },
        disabledAt: {
            type: Date,
            default: null
        },
        disabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        disabledReason: {
            type: String,
            default: ''
        },
        invitedUsers: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            invitedAt: {
                type: Date,
                default: Date.now
            },
            status: {
                type: String,
                enum: ['pending', 'accepted', 'declined', 'revoked'],
                default: 'accepted'
            }
        }],
        publishedAt: {
            type: Date,
            default: null
        },
        startedAt: {
            type: Date,
            default: null
        },
        endedAt: {
            type: Date,
            default: null
        },
        cancelledAt: {
            type: Date,
            default: null
        },
        cancellationReason: {
            type: String,
            default: ''
        },
        resultsPublishedAt: {
            type: Date,
            default: null
        }
    }, {
        timestamps: true
    });

    // Compound indexes for querying active/upcoming contests efficiently
    contestSchema.index({ status: 1, startTime: 1 });
    contestSchema.index({ status: 1, endTime: 1 });
    contestSchema.index({ contestType: 1, status: 1 });
    contestSchema.index({ weeklyIdentifier: 1 }, { unique: true, sparse: true });

    contestSchema.pre('save', function (next) {
        if (!this.host && this.createdBy) {
            this.host = this.createdBy;
        }
        next();
    });

    return mongoose.model('Contest', contestSchema);
};
