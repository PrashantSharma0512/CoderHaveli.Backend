module.exports = (mongoose) => {
    return mongoose.model(
        'Analytics',
        new mongoose.Schema({
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null
            },
            eventType: {
                type: String,
                required: true,
                index: true
            },
            metadata: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            },
            path: String,
            method: String,
            ip: String,
            userAgent: String
        }, { timestamps: true }).index(
            { createdAt: 1 },
            { expireAfterSeconds: 60 * 60 * 24 * 30 }
        )
    );
};
