module.exports = (mongoose) => {
    const schema = new mongoose.Schema({
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        amount: {
            type: Number,
            required: true // positive = credit, negative = debit
        },
        type: {
            type: String,
            enum: [
                'potd_reward',
                'streak_bonus',
                'contest_solve',
                'contest_rank_bonus',
                'admin_grant',
                'admin_deduct',
                'personal_potd_purchase',
                'other'
            ],
            required: true
        },
        reason: {
            type: String,
            required: true,
            trim: true
        },
        balanceAfter: {
            type: Number,
            required: true
        },
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        createdAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    });

    schema.index({ userId: 1, createdAt: -1 });

    return mongoose.model('CoinTransaction', schema);
};

