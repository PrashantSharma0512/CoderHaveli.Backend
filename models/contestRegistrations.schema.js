module.exports = (mongoose) => {
    const contestRegistrationSchema = new mongoose.Schema({
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
        registeredAt: {
            type: Date,
            default: Date.now
        },
        participationStatus: {
            type: String,
            enum: ['registered', 'participating', 'completed', 'disqualified'],
            default: 'registered'
        },
        disqualificationReason: {
            type: String,
            default: null
        },
        disqualifiedAt: {
            type: Date,
            default: null
        }
    }, {
        timestamps: true
    });

    // Enforce unique registration per user per contest
    contestRegistrationSchema.index({ contest: 1, user: 1 }, { unique: true });

    return mongoose.model('ContestRegistration', contestRegistrationSchema);
};
