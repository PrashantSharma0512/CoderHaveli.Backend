const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_KEY,
    key_secret: process.env.RAZOR_PAY_SECRET,
});

// ✅ Create an order (called by frontend before payment)
router.post("/order", async (req, res) => {
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
});

// ✅ Verify payment signature
router.post("/verify", async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            userId,
            courseId,
            amount,
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing parameters" });
        }

        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        // Signature valid — create subscription (ensure userId & courseId provided)
        if (!userId || !courseId) {
            // still return success so frontend can mark payment as success, but warn
            return res.status(200).json({ success: true, message: "Payment verified, provide user & course to save subscription", transactionId: razorpay_payment_id });
        }

        // Create subscription document
        const sub = new Subscription({
            user: userId,
            course: courseId,
            accessType: "one-time",
            courseType: "course",
            subscriptionPlan: null,
            startDate: new Date(),
            endDate: null,
            status: "active",
            payment: {
                method: "upi", // you can detect method from providerResponse if you store it
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
        });

        await sub.save();

        return res.status(200).json({ success: true, message: "Payment verified & subscription created", transactionId: razorpay_payment_id, subscription: sub });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Verification / save failed" });
    }
});

module.exports = router
