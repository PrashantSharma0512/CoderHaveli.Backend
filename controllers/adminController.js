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


module.exports = adminController;