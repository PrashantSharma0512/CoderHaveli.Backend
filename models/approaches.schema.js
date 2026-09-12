module.exports = (mongoose) => {
    return mongoose.model(
        'Approaches',
        new mongoose.Schema({
            quesId: { type: String, required: true, index: true },
            approachName: { type: String },
            approachDesc: { type: String, required: true },
            approachType: {
                type: String,
                required: true,
                enum: ['Brute Force', 'Improved', 'Optimised']
            },
            code: {
                javascript: { type: String, default: null },
                python: { type: String, default: null },
                java: { type: String, default: null },
                cpp: { type: String, default: null },
            },
            time_complexity: { type: String, default: null },
            space_complexity: { type: String, default: null },
            videoUrl: { type: String, default: null },
            order: { type: Number, default: 0 },
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now }
        })
    );
};
