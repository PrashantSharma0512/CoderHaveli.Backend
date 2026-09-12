module.exports = (mongoose) => {
    return mongoose.model(
        'Hint',
        new mongoose.Schema({
            quesId: { type: String, required: true, index: true },
            hints: [{ type: String, required: true }],
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    );
};
