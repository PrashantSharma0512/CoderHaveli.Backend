module.exports = (mongoose) => {
    return mongoose.model(
        'DailyProblem',
        new mongoose.Schema({
            date: { type: String, required: true, unique: true, index: true }, // 'YYYY-MM-DD'
            quesId: { type: String, required: true },
            problemRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ProblemList', required: true },
            quesName: { type: String, required: true },
            difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
            tags: [{ type: String }],
            descriptionSnippet: { type: String },
            catchyQuote: { type: String, default: 'Roz Ek Sawal, Interview Me Kamaal!' },
            totalSolves: { type: Number, default: 0 },
            createdAt: { type: Date, default: Date.now }
        })
    );
};

