const AnalyticController = {}

const mongoose = require("mongoose");

const getAnalytics = async (req, res) => {
    try {
        const Analytics = mongoose.model("Analytics");

        // 1. Total page views
        const totalViews = await Analytics.countDocuments({
            eventType: "PAGE_VIEW"
        });

        // 2. Unique users (excluding null)
        const uniqueUsers = await Analytics.distinct("userId", {
            userId: { $ne: null }
        });

        // 3. Top routes
        const topRoutes = await Analytics.aggregate([
            { $match: { eventType: "PAGE_VIEW" } },
            {
                $group: {
                    _id: "$path",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            // { $limit: 5 }
        ]);

        // 4. Recent events
        const recentEvents = await Analytics.find()
            .sort({ createdAt: -1 })
            // .limit(10);

        res.json({
            success: true,
            data: {
                totalViews,
                uniqueUsers: uniqueUsers.length,
                topRoutes,
                recentEvents
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch analytics"
        });
    }
};


AnalyticController.getAnalytics = getAnalytics

module.exports = AnalyticController;