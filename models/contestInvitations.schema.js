const mongoose = require('mongoose');

module.exports = (mongoose) => {
    const contestInvitationSchema = new mongoose.Schema({
        contest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contest',
            required: true,
            index: true
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        invitedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'revoked'],
            default: 'accepted', // Auto-accepted when invited by host, or used in workflow
            index: true
        },
        invitedAt: {
            type: Date,
            default: Date.now
        },
        respondedAt: {
            type: Date,
            default: Date.now
        }
    }, {
        timestamps: true
    });

    // Ensure unique invitation per user per contest
    contestInvitationSchema.index({ contest: 1, invitedUser: 1 }, { unique: true });

    return mongoose.model('ContestInvitation', contestInvitationSchema);
};
