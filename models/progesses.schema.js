module.exports = (mongoose) => {
    return mongoose.model(
        'Progess',
        new mongoose.Schema({
            quesId: { type: String, required: true },
            userID: { type: String, required: true },
            progress: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        }).index({ userID: 1, quesId: 1 })
    );
};
