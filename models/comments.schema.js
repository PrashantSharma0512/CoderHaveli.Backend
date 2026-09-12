module.exports = (mongoose) => {
    return mongoose.model(
        "Comment",
        new mongoose.Schema({
            quesId: {
                type: String,
                required: true,
                index: true,
            },
            author: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            parentComment: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Comment",
                default: null,
            },
            type: {
                type: String,
                enum: ["general", "difficulty", "approach", "issue", "feedback"],
                default: "general",
            },
            content: {
                type: String,
                required: true,
                trim: true,
            },
            likes: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
            ],
            isEdited: {
                type: Boolean,
                default: false,
            },
            isDeleted: {
                type: Boolean,
                default: false,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
            updatedAt: {
                type: Date,
                default: Date.now,
            },
        }).pre("save", function (next) {
            this.updatedAt = new Date();
            next();
        }).index({ quesId: 1, isDeleted: 1 })
    );
};
