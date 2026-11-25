module.exports = (mongoose) => {
    return mongoose.model(
        'CoinConfig',
        new mongoose.Schema({
            key: {
                type: String,
                unique: true,
                default: 'global'
            },
            potdRewardCoins: {
                type: Number,
                default: 1,
                min: 0
            },
            streakBonusCoins: {
                type: Number,
                default: 25,
                min: 0
            },
            contestSolveCoins: {
                type: Number,
                default: 1,
                min: 0
            },
            contestTop1BonusCoins: {
                type: Number,
                default: 20,
                min: 0
            },
            contestTop2BonusCoins: {
                type: Number,
                default: 10,
                min: 0
            },
            contestTop3BonusCoins: {
                type: Number,
                default: 5,
                min: 0
            },
            personalPotdPrice: {
                type: Number,
                default: 50,
                min: 0
            },
            personalPotdDurationDays: {
                type: Number,
                default: 30,
                min: 1
            },
            updatedAt: {
                type: Date,
                default: Date.now
            },
            updatedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                default: null
            }
        })
    );
};

