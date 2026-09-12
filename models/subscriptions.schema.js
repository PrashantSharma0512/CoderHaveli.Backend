module.exports = (mongoose) => {
    return mongoose.model(
        'Subscription',
        new mongoose.Schema({
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            course: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Course",
                required: true
            },
            accessType: {
                type: String,
                enum: ["free", "one-time", "subscription"],
                default: "one-time"
            },
            courseType: {
                type: String,
                enum: ["tutorial", "course"]
            },
            subscriptionPlan: {
                type: String,
                enum: ["monthly", "yearly", "lifetime", null],
                default: null
            },
            startDate: { type: Date, default: Date.now },
            endDate: { type: Date },
            status: {
                type: String,
                enum: ["active", "expired", "cancelled", "pending"],
                default: "pending"
            },
            payment: {
                method: {
                    type: String,
                    enum: ["free", "card", "upi", "netbanking", "paypal"],
                    required: true
                },
                transactionId: { type: String },
                amount: { type: Number, default: 0 },
                originalAmount: { type: Number },
                currency: { type: String, default: "INR" },
                status: {
                    type: String,
                    enum: ["pending", "completed", "failed", "refunded"],
                    default: "pending"
                },
                providerResponse: { type: Object }, // store raw gateway response (Razorpay/Stripe/etc.)
            },
            isDeleted: { type: Boolean, default: false },
            // Optional tracking
            coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
            autoRenew: { type: Boolean, default: false }, // useful if you want auto-renewable plans
        }, {
            timestamp: true
        }).index({ user: 1, course: 1 })
          .index({ user: 1, courseType: 1, isDeleted: 1 })
    );
};
