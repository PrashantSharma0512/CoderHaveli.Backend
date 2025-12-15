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
                $lookup: {
                    from: "startercodes",
                    localField: "quesId",
                    foreignField: "quesId",
                    as: "codes"
                }
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
                        $map: {
                            input: "$codes",
                            as: "c",
                            in: "$$c.language"
                        }
                    },                  // full array of codes
                    createdAt: 1,
                    updatedAt: 1
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


module.exports = adminController;