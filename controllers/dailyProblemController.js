const DailyProblemService = require('../services/dailyProblem.service');

const getAajKaSawal = async (req, res) => {
    try {
        const todayProblem = await DailyProblemService.getTodayProblem();
        
        let userStats = null;
        const userId = req.user?.id || req.user?._id || req.query?.userId;
        if (userId) {
            userStats = await DailyProblemService.getUserStreakAndCalendar(userId);
        }

        return res.status(200).json({
            success: true,
            data: {
                ...todayProblem,
                userStreak: userStats ? userStats.currentStreak : 0,
                isSolvedToday: userStats ? userStats.isTodaySolved : false
            }
        });
    } catch (error) {
        console.error('Error fetching AajKaSawal:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getCalendarData = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id || req.query?.userId;
        const year = req.query.year ? parseInt(req.query.year, 10) : undefined;
        const month = req.query.month ? parseInt(req.query.month, 10) : undefined;

        const data = await DailyProblemService.getUserStreakAndCalendar(userId, year, month);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching Calendar data:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAajKaSawal,
    getCalendarData
};

