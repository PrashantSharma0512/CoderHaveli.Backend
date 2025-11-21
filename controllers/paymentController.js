const paymentController = {}
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { default: mongoose } = require("mongoose");
// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_KEY,
    key_secret: process.env.RAZOR_PAY_SECRET,
});
const Order = async (req, res) => {
    try {
        const { amount, currency = "INR" } = req.body;

        const options = {
            amount: amount * 100, // convert to paise
            currency,
            receipt: crypto.randomBytes(10).toString("hex"),
        };
        await razorpay.orders.create(options, (error, order) => {
            if (error) {
                console.log(error);
                res.status(500).json({ success: false, message: "order failed" })
            }
            res.status(200).json({ success: true, order });
        });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ success: false, message: "Order creation failed" });
    }
}

const orderVerify = async (req, res) => {
    try {
        const Subscription = mongoose.model("Subscription");

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            userId,
            courseId,
            amount,
            paymentMethod = "upi",
        } = req.body;

        // --- VALIDATION ---
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Missing Razorpay parameters",
            });
        }

        // --- SIGNATURE VERIFICATION ---
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZOR_PAY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Invalid Razorpay signature",
            });
        }

        // If userId or courseId missing — skip subscription creation
        if (!userId || !courseId) {
            return res.status(200).json({
                success: true,
                message:
                    "Payment verified. Send userId & courseId to create subscription.",
                transactionId: razorpay_payment_id,
            });
        }

        // --- CREATE OR UPDATE SUBSCRIPTION ---
        const subscription = await Subscription.findOneAndUpdate(
            {
                user: userId,
                course: courseId,
            },
            {
                $set: {
                    user: userId,
                    course: courseId,
                    accessType: "one-time",
                    courseType: "course",
                    subscriptionPlan: null,
                    startDate: new Date(),
                    endDate: null,
                    status: "active",

                    payment: {
                        method: paymentMethod,
                        transactionId: razorpay_payment_id,
                        amount: amount || 0,
                        currency: "INR",
                        status: "completed",
                        providerResponse: {
                            razorpay_order_id,
                            razorpay_payment_id,
                            razorpay_signature,
                        },
                    },
                },
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "Payment verified & subscription created successfully",
            transactionId: razorpay_payment_id,
            subscription,
        });
    } catch (err) {
        console.error("VERIFY ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error while verifying payment",
        });
    }
};


paymentController.Order = Order
paymentController.orderVerify = orderVerify

module.exports = paymentController