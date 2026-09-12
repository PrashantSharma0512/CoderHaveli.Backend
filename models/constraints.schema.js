module.exports = (mongoose) => {
    return mongoose.model(
        'Constraints',
        new mongoose.Schema({
            quesId: { type: String, required: true, index: true },
            constraint: { type: [String], required: true },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    );
};
