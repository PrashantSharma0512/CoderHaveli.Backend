module.exports = (mongoose) => {
    const schema = new mongoose.Schema({
        quesId: { type: String, required: true, index: true },
        quesName: { type: String, required: true },
        quesDesc: { type: String, required: true },
        difficulty: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard', 'easy', 'medium', 'hard'], index: true },
        tags: [{ type: String, default: null }],
        languages: [{ type: String, default: ['javascript', 'python', 'java', 'cpp'] }],
        // Embedded Denormalized Fields (eliminates $lookup overhead)
        constraints: [{ type: String, default: [] }],
        hints: [{ type: String, default: [] }],
        starterCodes: {
            javascript: { type: String, default: '' },
            python: { type: String, default: '' },
            java: { type: String, default: '' },
            cpp: { type: String, default: '' }
        },
        examples: [{
            input: { type: String, default: '' },
            output: { type: String, default: '' },
            explaination: { type: String, default: '' }
        }],
        createdAt: { type: Date, default: Date.now },
        modifiedAt: { type: Date, default: Date.now }
    });

    schema.index({ tags: 1 });
    schema.index({ difficulty: 1, tags: 1 });
    schema.index({ quesName: 1 });

    return mongoose.model('ProblemList', schema);
};
