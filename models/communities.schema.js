module.exports = (mongoose) => {
    return mongoose.model(
        'Community',
        new mongoose.Schema({
            problem: { type: mongoose.Schema.Types.ObjectId, ref: 'ProblemList', required: true },
            author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            question: { type: String, required: true },
            answers: [{
                author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                answer: String,
                createdAt: { type: Date, default: Date.now }
            }],
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        }).index({ problem: 1 })
    );
};
