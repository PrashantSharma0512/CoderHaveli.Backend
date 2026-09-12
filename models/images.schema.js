module.exports = (mongoose) => {
    return mongoose.model(
        'Image',
        new mongoose.Schema({
            imageId: { type: Number, required: true, unique: true },
            url: { type: String, required: true },
            name: { type: String, required: true },
            imageType: { type: String, required: true, index: true },
            uploadedAt: { type: Date, default: Date.now },
        }, {
            timestamp: true
        })
    );
};
