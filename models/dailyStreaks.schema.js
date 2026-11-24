module.exports = (mongoose) => {
    return mongoose.model(
        'DailyStreak',
        new mongoose.Schema({
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
            currentStreak: { type: Number, default: 0 },
            longestStreak: { type: Number, default: 0 },
            totalDaysSolved: { type: Number, default: 0 },
            lastSolvedDate: { type: String, default: null }, // 'YYYY-MM-DD'
            history: [{
                date: { type: String, required: true }, // 'YYYY-MM-DD'
                quesId: { type: String, required: true },
                solvedAt: { type: Date, default: Date.now }
            }],
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    );
};

