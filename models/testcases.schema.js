module.exports = (mongoose) => {
    return mongoose.model(
        'TestCase',
        new mongoose.Schema({
            quesId: { type: String, required: true, index: true },
            input: { type: String, required: true },
            output: { type: String, required: true },
            explaination: { type: String, default: '' },
            timeLimit: { type: Number, default: 1000 },
            memoryLimit: { type: Number, default: 256 },
        }, {
            timestamp: true
        })
    );
};
