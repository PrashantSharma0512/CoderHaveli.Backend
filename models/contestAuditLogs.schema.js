module.exports = (mongoose) => {
    const contestAuditLogSchema = new mongoose.Schema({
        contest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contest',
            required: false,
            index: true
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        action: {
            type: String,
            required: true,
            index: true
        },
        previousState: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        newState: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        reason: {
            type: String,
            default: ''
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    });

    contestAuditLogSchema.index({ contest: 1, timestamp: -1 });

    return mongoose.model('ContestAuditLog', contestAuditLogSchema);
};
