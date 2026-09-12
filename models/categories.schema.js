module.exports = (mongoose) => {
    return mongoose.model(
        'Category',
        new mongoose.Schema({
            name: { type: String, required: true }
        }, {
            timestamp: true
        })
    );
};
