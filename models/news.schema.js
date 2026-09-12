module.exports = (mongoose) => {
    return mongoose.model(
        "News",
        new mongoose.Schema({
            title: {
                type: String,
                required: true
            },
            source: {
                type: String,
                required: true
            },
            articleUrl: {
                type: String,
                required: true,
                unique: true
            },
            author: String,
            publishedAt: Date,
            content: String,
            summary: String,
            category: String,
            tags: [String],
            importanceScore: {
                type: Number,
                default: 0
            },
            hash: {
                type: String,
                unique: true
            },
            duplicate: {
                type: Boolean,
                default: false
            },
            duplicateOf: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "News",
                default: null
            },
            processed: {
                type: Boolean,
                default: false
            },
            newsletterIncluded: {
                type: Boolean,
                default: false
            }
        }, {
            timestamps: true
        })
    );
};
