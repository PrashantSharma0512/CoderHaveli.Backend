const mongoose = require('mongoose');

module.exports = (mongoose) => {
    const contestPassPurchaseSchema = new mongoose.Schema({
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ContestPassPlan',
            required: true
        },
        planSnapshot: {
            name: String,
            participantLimit: Number,
            price: Number,
            currency: String
        },
        contest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contest',
            default: null
        },
        paymentGateway: {
            type: String,
            default: 'razorpay'
        },
        paymentOrderId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        paymentId: {
            type: String,
            default: null
        },
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            default: 'INR'
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded', 'revoked'],
            default: 'pending',
            index: true
        },
        participantLimitGranted: {
            type: Number,
            required: true
        },
        purchasedAt: {
            type: Date,
            default: null
        },
        expiresAt: {
            type: Date,
            default: null
        },
        grantedByAdmin: {
            type: Boolean,
            default: false
        },
        adminNote: {
            type: String,
            default: ''
        }
    }, {
        timestamps: true
    });

    contestPassPurchaseSchema.index({ user: 1, status: 1, expiresAt: 1 });

    return mongoose.model('ContestPassPurchase', contestPassPurchaseSchema);
};
