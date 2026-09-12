module.exports = (mongoose) => {
    return mongoose.model(
        'Cart',
        new mongoose.Schema({
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            items: [
                {
                    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
                    quantity: { type: Number, default: 1 },
                }
            ],
            isDeleted: { type: Boolean, default: false },
            placed: { type: Boolean, default: false },
            updatedAt: { type: Date, default: Date.now },
        },
            {
                timestamp: true
            }).index({ user: 1, placed: 1, isDeleted: 1 })
    );
};
