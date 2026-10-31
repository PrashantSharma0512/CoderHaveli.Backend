const mongoose = require('mongoose');

module.exports = (mongoose) => {
    const weeklyContestConfigSchema = new mongoose.Schema({
        isEnabled: {
            type: Boolean,
            default: true
        },
        isPaused: {
            type: Boolean,
            default: false
        },
        dayOfWeek: {
            type: Number,
            default: 0, // 0 = Sunday
            min: 0,
            max: 6
        },
        startTime: {
            type: String,
            default: '11:00' // HH:mm in IST
        },
        endTime: {
            type: String,
            default: '12:00' // HH:mm in IST
        },
        durationMinutes: {
            type: Number,
            default: 60
        },
        timezone: {
            type: String,
            default: 'Asia/Kolkata'
        },
        titleTemplate: {
            type: String,
            default: 'CoderHaveli Weekly Contest #{weekNumber}'
        },
        descriptionTemplate: {
            type: String,
            default: 'Welcome to CoderHaveli Weekly Public Coding Contest! Solve 3 algorithmic challenges (Easy, Medium, Hard) within 60 minutes.'
        },
        difficulty: {
            type: String,
            default: 'All Levels'
        },
        lastExecutionAt: {
            type: Date,
            default: null
        },
        lastExecutionStatus: {
            type: String,
            enum: ['idle', 'success', 'failed', 'paused', 'skipped'],
            default: 'idle'
        },
        lastExecutionError: {
            type: String,
            default: null
        },
        lastGeneratedContest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contest',
            default: null
        },
        nextExecutionAt: {
            type: Date,
            default: null
        },
        recentProblemIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProblemList'
        }]
    }, {
        timestamps: true
    });

    return mongoose.model('WeeklyContestConfig', weeklyContestConfigSchema);
};
