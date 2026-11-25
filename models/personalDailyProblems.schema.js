module.exports = (mongoose) => {
    const schema = new mongoose.Schema({
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        date: {
            type: String,
            required: true // 'YYYY-MM-DD' IST
        },
        topic: {
            type: String,
            required: true,
            trim: true
        },
        quesId: {
            type: String,
            required: true
        },
        problemRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProblemList',
            required: true
        },
        quesName: {
            type: String,
            required: true
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium'
        },
        tags: [{ type: String }],
        descriptionSnippet: { type: String },
        catchyQuote: {
            type: String,
            default: 'Personal AajKaSawal — Master Your Chosen Topic!'
        },
        solved: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    });

    schema.index({ userId: 1, date: 1 }, { unique: true });

    return mongoose.model('PersonalDailyProblem', schema);
};

