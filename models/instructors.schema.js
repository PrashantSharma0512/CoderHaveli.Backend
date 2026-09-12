module.exports = (mongoose) => {
    return mongoose.model(
        'Instructor',
        new mongoose.Schema({
            name: { type: String, required: true },
            email: { type: String, required: true },
            bio: String,
            image: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
            rating: { type: String, default: '' },
            createdAt: { type: Date, default: Date.now }
        })
    );
};
