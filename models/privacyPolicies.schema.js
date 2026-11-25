module.exports = (mongoose) => {
    const schema = new mongoose.Schema({
        key: {
            type: String,
            unique: true,
            default: 'global'
        },
        title: {
            type: String,
            default: 'CoderHaveli Privacy Policy',
            trim: true
        },
        content: {
            type: String,
            required: true
        },
        version: {
            type: Number,
            default: 1,
            min: 1
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    });

    return mongoose.model('PrivacyPolicy', schema);
};

