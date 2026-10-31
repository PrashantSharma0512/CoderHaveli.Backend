const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const contestHostingService = require('../services/contestHosting.service');

const razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_KEY,
    key_secret: process.env.RAZOR_PAY_SECRET,
});

const contestPassController = {};

/**
 * Seed initial contest pass plans if collection is empty
 */
async function ensureDefaultPlans() {
    const ContestPassPlan = mongoose.model('ContestPassPlan');
    const count = await ContestPassPlan.countDocuments();
    if (count === 0) {
        await ContestPassPlan.create([
            {
                name: 'Free Hosting',
                slug: 'free',
                price: 0,
                currency: 'INR',
                participantLimit: 5,
                validityDays: 0,
                isDefaultFree: true,
                isActive: true,
                description: 'Host private contests with your close coding friends',
                features: ['Host up to 5 participants (Host + 4 friends)', 'Full problem statement access', 'Real-time leaderboard'],
                displayOrder: 1
            },
            {
                name: 'Basic Pass',
                slug: 'basic',
                price: 99,
                currency: 'INR',
                participantLimit: 10,
                validityDays: 30,
                isDefaultFree: false,
                isActive: true,
                description: 'Ideal for small study groups and college cohorts',
                features: ['Host up to 10 participants (Host + 9 friends)', '30 days validity', 'Priority submissions', 'Live rankings & tie-breakers'],
                displayOrder: 2
            },
            {
                name: 'Premium Pass',
                slug: 'premium',
                price: 249,
                currency: 'INR',
                participantLimit: 25,
                validityDays: 30,
                isDefaultFree: false,
                isActive: true,
                description: 'For university clubs, classrooms, and tech communities',
                features: ['Host up to 25 participants', '30 days validity', 'Custom access codes', 'Detailed performance analytics'],
                displayOrder: 3
            },
            {
                name: 'Unlimited Pass',
                slug: 'unlimited',
                price: 499,
                currency: 'INR',
                participantLimit: 999999,
                validityDays: 60,
                isDefaultFree: false,
                isActive: true,
                description: 'Maximum hosting power for hackathons and large events',
                features: ['Unlimited participants', '60 days validity', 'Host multiple private contests', 'VIP badge on contest list'],
                displayOrder: 4
            }
        ]);
        console.log('✅ Default Contest Pass Plans seeded successfully');
    }
}

/**
 * GET /api/contests/pass/plans
 * Get all available Contest Pass plans and current user's entitlement
 */
contestPassController.getPlans = async (req, res) => {
    try {
        await ensureDefaultPlans();
        const ContestPassPlan = mongoose.model('ContestPassPlan');

        const plans = await ContestPassPlan.find({ isActive: true })
            .sort({ displayOrder: 1, price: 1 })
            .lean();

        let userEntitlement = null;
        if (req.user && req.user._id) {
            userEntitlement = await contestHostingService.getUserHostingEntitlement(req.user._id);
        }

        return res.json({
            success: true,
            plans,
            userEntitlement,
            razorpayKeyId: process.env.RAZOR_PAY_KEY
        });
    } catch (error) {
        console.error('Error fetching pass plans:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/contests/pass/order
 * Create a Razorpay order to purchase a Contest Pass
 */
contestPassController.createOrder = async (req, res) => {
    try {
        const ContestPassPlan = mongoose.model('ContestPassPlan');
        const ContestPassPurchase = mongoose.model('ContestPassPurchase');
        const { planId } = req.body;
        const userId = req.user._id;

        if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
            return res.status(400).json({ success: false, message: 'Valid planId is required' });
        }

        const plan = await ContestPassPlan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(404).json({ success: false, message: 'Plan not found or currently inactive' });
        }

        if (plan.price === 0) {
            return res.status(400).json({ success: false, message: 'Free plan is automatically available by default' });
        }

        const options = {
            amount: Math.round(plan.price * 100), // amount in paise
            currency: plan.currency || 'INR',
            receipt: `pass_${userId.toString().slice(-6)}_${Date.now()}`.slice(0, 40)
        };

        const razorpayOrder = await new Promise((resolve, reject) => {
            razorpay.orders.create(options, (err, order) => {
                if (err) return reject(err);
                resolve(order);
            });
        });

        // Store pending purchase record
        const purchase = await ContestPassPurchase.create({
            user: userId,
            plan: plan._id,
            planSnapshot: {
                name: plan.name,
                participantLimit: plan.participantLimit,
                price: plan.price,
                currency: plan.currency
            },
            paymentGateway: 'razorpay',
            paymentOrderId: razorpayOrder.id,
            amount: plan.price,
            currency: plan.currency,
            status: 'pending',
            participantLimitGranted: plan.participantLimit
        });

        return res.json({
            success: true,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            purchaseId: purchase._id,
            key: process.env.RAZOR_PAY_KEY,
            plan: {
                id: plan._id,
                name: plan.name,
                price: plan.price,
                participantLimit: plan.participantLimit
            }
        });
    } catch (error) {
        console.error('Error creating pass order:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/contests/pass/verify
 * Server-side Razorpay HMAC SHA-256 payment signature verification and activation
 */
contestPassController.verifyPayment = async (req, res) => {
    try {
        const ContestPassPurchase = mongoose.model('ContestPassPurchase');
        const ContestPassPlan = mongoose.model('ContestPassPlan');

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing Razorpay verification parameters'
            });
        }

        // Verify cryptographic HMAC SHA-256 signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZOR_PAY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            // Mark purchase as failed
            await ContestPassPurchase.findOneAndUpdate(
                { paymentOrderId: razorpay_order_id },
                { status: 'failed', paymentId: razorpay_payment_id }
            );

            return res.status(400).json({
                success: false,
                message: 'Invalid Razorpay signature. Verification failed.'
            });
        }

        const purchase = await ContestPassPurchase.findOne({ paymentOrderId: razorpay_order_id }).populate('plan');
        if (!purchase) {
            return res.status(404).json({ success: false, message: 'Purchase transaction record not found' });
        }

        // Idempotency: if already completed, return existing entitlement
        if (purchase.status === 'completed') {
            const entitlement = await contestHostingService.getUserHostingEntitlement(purchase.user);
            return res.json({
                success: true,
                message: 'Contest Pass already activated',
                purchase,
                entitlement
            });
        }

        const now = new Date();
        const validityDays = purchase.plan?.validityDays || 30;
        const expiresAt = validityDays > 0 ? new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000) : null;

        purchase.status = 'completed';
        purchase.paymentId = razorpay_payment_id;
        purchase.purchasedAt = now;
        purchase.expiresAt = expiresAt;
        await purchase.save();

        const entitlement = await contestHostingService.getUserHostingEntitlement(purchase.user);

        return res.json({
            success: true,
            message: `🎉 Contest Pass activated successfully! You can now host up to ${entitlement.effectiveLimit === Infinity ? 'Unlimited' : entitlement.effectiveLimit} participants.`,
            purchase,
            entitlement
        });
    } catch (error) {
        console.error('Error verifying pass payment:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/contests/pass/my-purchases
 * Current user's pass purchase history
 */
contestPassController.getMyPurchases = async (req, res) => {
    try {
        const ContestPassPurchase = mongoose.model('ContestPassPurchase');
        const purchases = await ContestPassPurchase.find({ user: req.user._id })
            .populate('plan')
            .sort({ createdAt: -1 })
            .lean();

        const entitlement = await contestHostingService.getUserHostingEntitlement(req.user._id);

        return res.json({
            success: true,
            purchases,
            entitlement
        });
    } catch (error) {
        console.error('Error fetching user purchases:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = contestPassController;
