const adminController = {}
const mongoose = require('mongoose')

adminController.Dashboard = async (req, res) => {
    try {
        const User = mongoose.model('User');
        const ProblemList = mongoose.model('ProblemList');
        const Submission = mongoose.model('Submission');

        const [
            userCount,
            submissionCount,
            acceptedCount,
            questionCount
        ] = await Promise.all([
            User.countDocuments(),
            Submission.countDocuments(),
            Submission.countDocuments({ status: "Accepted" }),
            ProblemList.countDocuments()
        ]);
        const RecentSubmission = await Submission.aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "users",          // MongoDB collection name (lowercase plural)
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "problemlists",   // MongoDB collection name
                    localField: "quesId",
                    foreignField: "quesId", // because you reference quesId, NOT _id
                    as: "question"
                }
            },
            { $unwind: "$question" },

            // Select only required fields
            {
                $project: {
                    _id: 1,
                    status: 1,
                    codelanguage: 1,
                    createdAt: 1,
                    user: "$user.name",
                    question: "$question.quesName"
                }
            }
        ]);


        const submissionSuccessPercentage =
            submissionCount === 0
                ? 0
                : ((acceptedCount / submissionCount) * 100).toFixed(2);

        return res.status(200).json({
            success: true,
            data: {
                totalUsers: userCount,
                totalQuestions: questionCount,
                totalSubmissions: submissionCount,
                acceptedSubmissions: acceptedCount,
                submissionSuccessPercentage,
                RecentSubmission
            }
        });

    } catch (error) {
        console.error("Error while fetching admin dashboard", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

adminController.Questions = async (req, res) => {
    try {
        const ProblemList = mongoose.model('ProblemList');

        const questions = await ProblemList.aggregate([
            {
                $addFields: {
                    quesIdNum: { $toInt: "$quesId" }
                }
            },
            {
                $sort: { quesIdNum: 1 }
            },
            {
                $project: {
                    _id: 0,
                    quesId: 1,
                    quesName: 1,
                    quesDesc: 1,
                    difficulty: 1,
                    tags: 1,
                    problemExample: 1,
                    constraints: 1,
                    languages: {
                        $ifNull: [
                            "$languages",
                            ["javascript", "python", "java", "cpp"]
                        ]
                    },
                    createdAt: 1,
                    modifiedAt: 1
                }
            }
        ]);


        return res.status(200).json({
            success: true,
            data: questions
        });
    } catch (error) {
        console.error("Error while fetching questions", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

adminController.AllSubmissions = async (req, res) => {
    try {
        const Submission = mongoose.model('Submission');
        const { limit } = req.query;
        const allSubmission = await Submission.aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: limit ? parseInt(limit) : 10 },
            {
                $lookup: {
                    from: "users",          // MongoDB collection name (lowercase plural)
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "problemlists",   // MongoDB collection name
                    localField: "quesId",
                    foreignField: "quesId", // because you reference quesId, NOT _id
                    as: "question"
                }
            },
            { $unwind: "$question" },

            // Select only required fields
            {
                $project: {
                    _id: 1,
                    status: 1,
                    codelanguage: 1,
                    createdAt: 1,
                    user: "$user.name",
                    question: "$question.quesName",
                    executionTime: "$execution_time",
                }
            }
        ]);
        return res.status(200).json({
            success: true,
            data: allSubmission
        });
    } catch (error) {
        console.error("Error while fetching all submissions", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}
adminController.AllUsers = async (req, res) => {
    try {
        const User = mongoose.model("User");

        const users = await User.aggregate([
            {
                $match: { isDeleted: false }
            },

            // Lookup submissions
            {
                $lookup: {
                    from: "submissions",
                    localField: "_id",
                    foreignField: "userId",
                    as: "submissions"
                }
            },

            // Add computed fields
            {
                $addFields: {
                    totalSubmissions: { $size: "$submissions" },
                    totalQuestionsAttempted: {
                        $size: {
                            $ifNull: [
                                { $setUnion: "$submissions.quesId" },
                                []
                            ]
                        }
                    }
                }
            },

            // Final projection
            {
                $project: {
                    name: 1,
                    email: 1,
                    createdAt: 1,
                    totalSubmissions: 1,
                    totalQuestionsAttempted: 1,
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error("Error while fetching all users", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

adminController.saveApproach = async (req, res) => {
    try {
        const Approaches = mongoose.model('Approaches');
        const ApproachesData = req.body;

        const newApproach = await Approaches.findOneAndUpdate(
            {
                quesId: ApproachesData.quesId,
                approachType: ApproachesData.approachType
            },
            { $set: ApproachesData },
            { upsert: true, new: true }
        );
        res.status(200).json({
            success: true,
            data: newApproach
        });
    } catch (error) {
        console.error("Error while saving approach", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}
adminController.Approaches = async (req, res) => {
    try {
        const Approaches = mongoose.model('Approaches');
        const approaches = await Approaches.aggregate([
            {
                $addFields: {
                    quesIdNum: {
                        $convert: {
                            input: "$quesId",
                            to: "int",
                            onError: 0,
                            onNull: 0
                        }
                    }
                }
            },
            {
                $sort: { quesIdNum: 1 }
            },
            {
                $addFields: {
                    langAvailable: {
                        $map: {
                            input: { $objectToArray: "$code" },
                            as: "lang",
                            in: "$$lang.k"
                        }
                    }
                }
            },
            {
                $project: {
                    quesId: 1,
                    approachType: 1,
                    approachDesc: 1,
                    langAvailable: 1,
                    time_complexity: 1,
                    space_complexity: 1,
                    code: 1,
                    videoUrl: 1,
                    createdAt: 1,
                    modifiedAt: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: approaches
        });
    } catch (error) {
        console.error("Error while saving approach", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}
adminController.getApproach = async (req, res) => {
    try {
        const Approaches = mongoose.model('Approaches');
        const { id } = req.query;
        const approach = await Approaches.findById(id);
        res.status(200).json({
            success: true,
            data: approach
        });
    } catch (error) {
        console.error("Error while fetching approach", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}
adminController.saveApproach = async (req, res) => {
    try {
        const Approaches = mongoose.model('Approaches');
        const ApproachesData = req.body;

        const newApproach = await Approaches.findOneAndUpdate(
            {
                quesId: ApproachesData.quesId,
                approachType: ApproachesData.approachType
            },
            { $set: ApproachesData },
            { upsert: true, new: true }
        );
        res.status(200).json({
            success: true,
            data: newApproach
        });
    } catch (error) {
        console.error("Error while saving approach", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}
adminController.deleteApproach = async (req, res) => {
    try {
        const Approaches = mongoose.model('Approaches');
        const { id } = req.body;
        console.log(id);
        

        const deletedApproach = await Approaches.findOneAndDelete({
            _id: id
        });

        if (!deletedApproach) {
            return res.status(404).json({
                success: false,
                message: "Approach not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Approach deleted successfully"
        });
    } catch (error) {
        console.error("Error while deleting approach", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

adminController.getCoinsOverview = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
        }

        const User = mongoose.model('User');
        const CoinTransaction = mongoose.model('CoinTransaction');
        const HaveliCoinService = require('../services/haveliCoin.service');

        const search = (req.query.search || '').trim();
        const userFilter = search
            ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            }
            : {};

        const [config, users, transactions, circulationAgg, activePersonalCount] = await Promise.all([
            HaveliCoinService.getConfig(),
            User.find(userFilter, { name: 1, email: 1, haveliCoins: 1, personalAajKaSawal: 1, role: 1, avatar: 1 })
                .sort({ haveliCoins: -1, createdAt: -1 })
                .limit(50)
                .lean(),
            CoinTransaction.find({})
                .sort({ createdAt: -1 })
                .limit(40)
                .populate('userId', 'name email')
                .populate('adminId', 'name email')
                .lean(),
            User.aggregate([
                { $group: { _id: null, totalCoins: { $sum: { $ifNull: ['$haveliCoins', 0] } } } }
            ]),
            User.countDocuments({
                'personalAajKaSawal.isActive': true,
                'personalAajKaSawal.expiresAt': { $gt: new Date() }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalCoinsInCirculation: circulationAgg[0]?.totalCoins || 0,
                    activePersonalPlans: activePersonalCount,
                    recentTransactionsCount: transactions.length
                },
                config,
                users,
                transactions
            }
        });
    } catch (error) {
        console.error('Error in getCoinsOverview:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

adminController.adjustUserCoins = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
        }

        const { userId, amount, action, reason } = req.body || {};
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Valid userId is required' });
        }

        const numAmount = Math.floor(Number(amount));
        if (!numAmount || numAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be a positive integer' });
        }

        const HaveliCoinService = require('../services/haveliCoin.service');
        let result;
        if (action === 'debit') {
            result = await HaveliCoinService.debitCoins(
                userId,
                numAmount,
                'admin_deduct',
                reason || 'Admin deduction',
                { adminAction: 'debit' },
                req.user._id
            );
        } else {
            result = await HaveliCoinService.creditCoins(
                userId,
                numAmount,
                'admin_grant',
                reason || 'Admin grant',
                { adminAction: 'credit' },
                req.user._id
            );
        }

        return res.status(200).json({
            success: true,
            message: `Successfully ${action === 'debit' ? 'deducted' : 'credited'} ${numAmount} Haveli Coins`,
            data: result
        });
    } catch (error) {
        const status = error.message.includes('Insufficient') || error.message.includes('not found') ? 400 : 500;
        return res.status(status).json({ success: false, message: error.message });
    }
};

adminController.updateCoinsConfig = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
        }

        const HaveliCoinService = require('../services/haveliCoin.service');
        const updated = await HaveliCoinService.updateConfig(req.body || {}, req.user._id);

        return res.status(200).json({
            success: true,
            message: 'Haveli Coin settings updated successfully',
            data: updated
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

adminController.getPrivacyPolicy = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
        }
        const PrivacyPolicyService = require('../services/privacyPolicy.service');
        const data = await PrivacyPolicyService.getAdminOverview();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

adminController.updatePrivacyPolicy = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
        }
        const PrivacyPolicyService = require('../services/privacyPolicy.service');
        const { title, content } = req.body || {};
        const updated = await PrivacyPolicyService.updatePolicy({ title, content }, req.user._id);
        return res.status(200).json({
            success: true,
            message: `Privacy Policy updated to v${updated.version}. All users will be prompted to accept the new policy.`,
            data: updated
        });
    } catch (error) {
        const status = error.message.includes('required') ? 400 : 500;
        return res.status(status).json({ success: false, message: error.message });
    }
};

module.exports = adminController;