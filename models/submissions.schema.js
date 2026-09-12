module.exports = (mongoose) => {
    return mongoose.model(
        'Submission',
        new mongoose.Schema({
            quesId: { type: String, required: true },
            code: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Code' },
            codelanguage: { type: String, required: true },
            userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
            status: {
                type: String,
                required: true,
                enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error'],
                default: ''
            },
            execution_time: { type: String, default: null },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        }).index({ userId: 1, quesId: 1 })
    );
};
