module.exports = (mongoose) => {
    return mongoose.model(
        'Coupon',
        new mongoose.Schema({
            code: {
                type: String,
                required: true,
                unique: true,
                uppercase: true, // store as uppercase for consistency
                trim: true
            },
            discountType: {
                type: String,
                enum: ["percentage", "fixed"], // percentage = 10% off, fixed = ₹500 off
                required: true
            },
            discountValue: {
                type: Number,
                required: true, // e.g., 10 (for 10%) or 500 (for ₹500 off)
            },
            maxDiscount: {
                type: Number,
                default: null // optional cap for percentage coupons
            },
            // Usage restrictions
            applicableTo: {
                type: String,
                enum: ["all", "course", "category", "user"],
                default: "all"
            },
            course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }, // if specific course
            category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" }, // if specific category
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // if specific user
            // Validity
            startDate: { type: Date, default: Date.now },
            endDate: { type: Date },
            usageLimit: { type: Number, default: null },
            usageCount: { type: Number, default: 0 },
            perUserLimit: { type: Number, default: 1 },
            isActive: { type: Boolean, default: true }
        },
            {
                timestamp: true
            }
        )
    );
};
