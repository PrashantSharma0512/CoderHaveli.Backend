module.exports = (mongoose) => {
    return mongoose.model(
        'Course',
        new mongoose.Schema({
            type: {
                type: String,
                enum: ['course', 'tutorial'],
                required: true
            },
            title: { type: String, required: true },
            description: { type: String, required: true },
            about: { type: String },
            duration: String,
            whatYouWillLearn: [{ type: String }],
            requirements: [{ type: String }],
            courseIncludes: [{ type: String }],
            price: { type: Number, default: null },
            originalPrice: { type: Number, default: null },
            image: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Image' },
            instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor' },
            category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
            lessons: [{
                title: String,
                content: String,
                videoUrl: String,
                description: String,
                duration: String
            }],
            createdAt: { type: Date, default: Date.now },
            modifiedAt: { type: Date, default: Date.now },
            isDeleted: { type: Boolean, default: false }
        }).index(
            { category: 1 },
            {
                partialFilterExpression: { isDeleted: false }
            }
        ).index(
            { type: 1, isDeleted: 1 }
        )
    );
};
