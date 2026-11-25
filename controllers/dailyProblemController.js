const mongoose = require('mongoose');
const DailyProblemService = require('../services/dailyProblem.service');
const HaveliCoinService = require('../services/haveliCoin.service');

const getISTToday = () => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(Date.now() + istOffset).toISOString().split('T')[0];
};

const getAajKaSawal = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database connecting, please retry shortly.' });
        }
        const userId = req.user?.id || req.user?._id || req.query?.userId;
        const todayProblem = await DailyProblemService.getTodayProblem(userId);

        let userStats = null;
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
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
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

const getTopics = async (req, res) => {
    try {
        const topics = await HaveliCoinService.getAvailableTopics();
        return res.status(200).json({ success: true, data: topics });
    } catch (error) {
        console.error('Error fetching POTD topics:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getCoinSummary = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const summary = await HaveliCoinService.getUserCoinSummary(userId);
        return res.status(200).json({ success: true, data: summary });
    } catch (error) {
        console.error('Error fetching coin summary:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const purchasePersonalPotd = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { topic } = req.body || {};
        const result = await HaveliCoinService.purchasePersonalPotd(userId, topic || null);

        return res.status(200).json({
            success: true,
            message: 'Personal AajKaSawal plan activated!',
            data: result
        });
    } catch (error) {
        const status = error.message.includes('Insufficient') || error.message.includes('already') ? 400 : 500;
        return res.status(status).json({ success: false, message: error.message });
    }
};

const updatePersonalTopic = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { topic } = req.body || {};
        const result = await HaveliCoinService.updatePersonalTopic(userId, topic || null, getISTToday());

        return res.status(200).json({
            success: true,
            message: topic ? `Personal AajKaSawal topic set to "${topic}"` : 'Switched back to standard AajKaSawal',
            data: result
        });
    } catch (error) {
        const status = error.message.includes('not active') ? 403 : 500;
        return res.status(status).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAajKaSawal,
    getCalendarData,
    getTopics,
    getCoinSummary,
    purchasePersonalPotd,
    updatePersonalTopic
};
