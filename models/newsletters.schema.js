module.exports = (mongoose) => {
    return mongoose.model(
        "NewsLetter",
        new mongoose.Schema({
            title: String,
            date: {
                type: Date,
                required: true
            },
            type: {
                type: String,
                enum: [
                    "daily",
                    "system_design"
                ],
                default: "daily"
            },
            articles: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "News"
            }],
            totalArticles: Number,
            html: String,
            markdown: String,
            status: {
                type: String,
                enum: [
                    "draft",
                    "generated",
                    "sent"
                ],
                default: "draft"
            },
            sentAt: Date
        }, {
            timestamps: true
        })
    );
};
