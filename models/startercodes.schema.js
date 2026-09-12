module.exports = (mongoose) => {
    return mongoose.model(
        'StarterCode',
        new mongoose.Schema({
            quesId: {
                type: String,
                required: true,
            },
            language: {
                type: String,
                required: true,
                enum: ['javascript', 'python', 'java', 'cpp']
            },
            code: {
                type: String,
                required: true
            },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        }).index({ quesId: 1, language: 1 }, { unique: true })
    );
};
