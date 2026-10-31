const mongoose = require('mongoose');

module.exports = (mongoose) => {
    const contestPassPlanSchema = new mongoose.Schema({
        name: {
            type: String,
            required: [true, 'Plan name is required'],
            trim: true
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        price: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        currency: {
            type: String,
            default: 'INR'
        },
        participantLimit: {
            type: Number,
            required: true,
            // 5 for free, 10 for Basic, 25 for Premium, -1 or 999999 for Unlimited
            default: 5
        },
        validityDays: {
            type: Number,
            default: 30 // 0 means single contest or lifetime
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        isDefaultFree: {
            type: Boolean,
            default: false
        },
        description: {
            type: String,
            default: ''
        },
        features: [{
            type: String
        }],
        displayOrder: {
            type: Number,
            default: 0
        }
    }, {
        timestamps: true
    });

    return mongoose.model('ContestPassPlan', contestPassPlanSchema);
};
