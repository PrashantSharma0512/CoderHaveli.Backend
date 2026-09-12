module.exports = (mongoose) => {
    return mongoose.model(
        'ProblemList',
        new mongoose.Schema({
            quesId: { type: String, required: true, index: true },
            quesName: { type: String, required: true },
            quesDesc: { type: String, required: true },
            difficulty: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard'] },
            Constraints: { type: mongoose.Schema.Types.ObjectId, ref: 'Constraints' },
            tags: [{ type: String, default: null }],
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    );
};
