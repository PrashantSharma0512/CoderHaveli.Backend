module.exports = (mongoose) => {
    return mongoose.model(
        'Code',
        new mongoose.Schema({
            quesId: { type: String, required: true, index: true },
            userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
            code: { type: String, required: true },
            codelanguage: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    );
};
