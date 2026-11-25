/**
 * dailyProblem.service.js
 * Core engine for "AajKaSawal" (Problem of the Day) and "Code Tapasya" daily streak calendar.
 */

const mongoose = require('mongoose');
const HaveliCoinService = require('./haveliCoin.service');

const CATCHY_QUOTES = [
    'Consistency is the Key — Solve Today\'s Challenge!',
    'Master Algorithms Daily, Crack Your Dream Tech Role.',
    'Small Daily Efforts Compound into Massive Results.',
    'Code Tapasya: Stay Consistent, Stay Ahead.',
    'One Problem a Day Keeps the Rejection Away!',
    'Sharpen Your Problem Solving Skills Every Single Day.',
    'Build Your Coding Habit — One Challenge at a Time.',
    'Consistency Over Intensity — Keep Your Streak Alive!'
];

// Curated rotation seed problem IDs (guaranteed to have high quality testcases & editorials)
const CURATED_ROTATION_IDS = [
    '11', // Container With Most Water
    '1',  // Two Sum
    '3',  // Longest Substring Without Repeating Characters
    '15', // 3Sum
    '20', // Valid Parentheses
    '53', // Maximum Subarray
    '121',// Best Time to Buy and Sell Stock
    '70', // Climbing Stairs
    '42', // Trapping Rain Water
    '2',  // Add Two Numbers
    '4',  // Median of Two Sorted Arrays
    '5',  // Longest Palindromic Substring
    '6',  // Zigzag Conversion
    '7',  // Reverse Integer
    '8',  // String to Integer (atoi)
    '9',  // Palindrome Number
    '10'  // Regular Expression Matching
];

function getISTDateString(dateObj = new Date()) {
    // Return YYYY-MM-DD aligned to Indian Standard Time (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(dateObj.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
}

function getYesterdayISTDateString() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return getISTDateString(yesterday);
}

function getDaysSinceEpochFromDateStr(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24));
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSecondsUntilMidnightIST() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    const midnightIST = new Date(istNow);
    midnightIST.setUTCHours(24, 0, 0, 0);

    return Math.max(0, Math.floor((midnightIST.getTime() - istNow.getTime()) / 1000));
}

class DailyProblemService {
    /**
     * Retrieves or auto-creates today's featured "AajKaSawal" (or user's Personal AajKaSawal if active & topic selected).
     */
    static async getTodayProblem(userId = null) {
        const DailyProblem = mongoose.model('DailyProblem');
        const ProblemList = mongoose.model('ProblemList');
        const User = mongoose.model('User');
        const PersonalDailyProblem = mongoose.model('PersonalDailyProblem');

        const todayStr = getISTDateString();
        const config = await HaveliCoinService.getConfig();

        let userDoc = null;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            userDoc = await User.findById(userId, { haveliCoins: 1, personalAajKaSawal: 1 }).lean();
        }

        const isPersonalActive = HaveliCoinService.isPersonalPlanActive(userDoc);
        const selectedTopic = isPersonalActive ? (userDoc?.personalAajKaSawal?.selectedTopic || null) : null;

        // If user has active Personal AajKaSawal plan AND a selected topic, serve their personalized topic POTD
        if (isPersonalActive && selectedTopic) {
            let personalDoc = await PersonalDailyProblem.findOne({ userId, date: todayStr })
                .populate('problemRef')
                .lean();

            // If user changed topic today and hasn't solved today's personal POTD yet, regenerate for new topic
            if (personalDoc && personalDoc.topic.toLowerCase() !== selectedTopic.toLowerCase() && !personalDoc.solved) {
                await PersonalDailyProblem.deleteOne({ _id: personalDoc._id });
                personalDoc = null;
            }

            if (!personalDoc) {
                const recentPersonal = await PersonalDailyProblem.find({ userId, date: { $lt: todayStr } })
                    .sort({ date: -1 })
                    .limit(7)
                    .lean();
                const recentQuesIds = recentPersonal.map(d => String(d.quesId));

                const topicRegex = new RegExp(`^${escapeRegex(selectedTopic)}$`, 'i');
                let candidates = await ProblemList.find({
                    tags: topicRegex,
                    quesId: { $nin: recentQuesIds }
                }).sort({ quesId: 1 }).limit(100).lean();

                if (candidates.length === 0) {
                    candidates = await ProblemList.find({ tags: topicRegex }).sort({ quesId: 1 }).limit(100).lean();
                }
                if (candidates.length === 0) {
                    // Fallback to substring match on tag
                    const fuzzyRegex = new RegExp(escapeRegex(selectedTopic), 'i');
                    candidates = await ProblemList.find({ tags: fuzzyRegex }).sort({ quesId: 1 }).limit(100).lean();
                }

                if (candidates.length > 0) {
                    const daysSinceEpoch = getDaysSinceEpochFromDateStr(todayStr);
                    const userHash = String(userId).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
                    const chosen = candidates[Math.abs(daysSinceEpoch + userHash) % candidates.length];

                    const cleanDesc = (chosen.quesDesc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    const snippet = cleanDesc.slice(0, 180) + (cleanDesc.length > 180 ? '...' : '');

                    personalDoc = await PersonalDailyProblem.findOneAndUpdate(
                        { userId, date: todayStr },
                        {
                            $setOnInsert: {
                                userId,
                                date: todayStr,
                                topic: selectedTopic,
                                quesId: String(chosen.quesId),
                                problemRef: chosen._id,
                                quesName: chosen.quesName,
                                difficulty: (chosen.difficulty || 'medium').toLowerCase(),
                                tags: chosen.tags || [],
                                descriptionSnippet: snippet,
                                catchyQuote: `Personal AajKaSawal (${selectedTopic}) — Sharpen Your Mastery!`,
                                solved: false
                            }
                        },
                        { upsert: true, new: true }
                    ).populate('problemRef').lean();
                }
            }

            if (personalDoc) {
                const secondsLeft = getSecondsUntilMidnightIST();
                const problemObjectId = (personalDoc.problemRef && personalDoc.problemRef._id)
                    ? String(personalDoc.problemRef._id)
                    : String(personalDoc.problemRef || '');

                return {
                    ...personalDoc,
                    problemId: problemObjectId,
                    problemObjectId: problemObjectId,
                    secondsUntilNext: secondsLeft,
                    serverDate: todayStr,
                    isPersonal: true,
                    personalTopic: personalDoc.topic,
                    haveliCoins: userDoc?.haveliCoins || 0,
                    coinReward: config.potdRewardCoins,
                    personalPotdPrice: config.personalPotdPrice,
                    personalPotdDurationDays: config.personalPotdDurationDays,
                    personalAajKaSawal: {
                        isActive: true,
                        selectedTopic,
                        purchasedAt: userDoc?.personalAajKaSawal?.purchasedAt || null,
                        expiresAt: userDoc?.personalAajKaSawal?.expiresAt || null
                    }
                };
            }
        }

        let dailyDoc = await DailyProblem.findOne({ date: todayStr }).populate('problemRef').lean();
        const recentDocs = await DailyProblem.find({ date: { $lt: todayStr } })
            .sort({ date: -1 })
            .limit(3)
            .lean();
        const recentQuesIds = new Set(recentDocs.map(d => String(d.quesId)));

        // Self-heal if today's POTD was accidentally generated with yesterday's question (e.g. UTC vs IST midnight bug)
        if (dailyDoc && recentDocs.length > 0 && String(dailyDoc.quesId) === String(recentDocs[0].quesId) && (dailyDoc.totalSolves || 0) === 0) {
            await DailyProblem.deleteOne({ _id: dailyDoc._id });
            dailyDoc = null;
        }

        if (!dailyDoc) {
            // Deterministically select today's question based on the IST date (not UTC Date.now())
            const daysSinceEpoch = getDaysSinceEpochFromDateStr(todayStr);
            const startIndex = Math.abs(daysSinceEpoch) % CURATED_ROTATION_IDS.length;

            let selectedQuesId = CURATED_ROTATION_IDS[startIndex];
            for (let offset = 0; offset < CURATED_ROTATION_IDS.length; offset++) {
                const candidateId = CURATED_ROTATION_IDS[(startIndex + offset) % CURATED_ROTATION_IDS.length];
                if (!recentQuesIds.has(String(candidateId))) {
                    selectedQuesId = candidateId;
                    break;
                }
            }

            let problem = await ProblemList.findOne({ quesId: selectedQuesId });
            if (!problem && !isNaN(Number(selectedQuesId))) {
                problem = await ProblemList.findOne({ quesId: Number(selectedQuesId) });
            }
            if (!problem) {
                // Fallback to any problem not used in recent days
                problem = await ProblemList.findOne({
                    difficulty: 'medium',
                    quesId: { $nin: Array.from(recentQuesIds) }
                }) || await ProblemList.findOne({ quesId: { $nin: Array.from(recentQuesIds) } })
                  || await ProblemList.findOne({});
            }

            if (!problem) {
                throw new Error('No problems found in ProblemList collection.');
            }

            const quoteIndex = Math.abs(daysSinceEpoch) % CATCHY_QUOTES.length;
            const quote = CATCHY_QUOTES[quoteIndex];

            const cleanDesc = (problem.quesDesc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const snippet = cleanDesc.slice(0, 180) + (cleanDesc.length > 180 ? '...' : '');

            dailyDoc = await DailyProblem.findOneAndUpdate(
                { date: todayStr },
                {
                    $setOnInsert: {
                        date: todayStr,
                        quesId: String(problem.quesId),
                        problemRef: problem._id,
                        quesName: problem.quesName,
                        difficulty: problem.difficulty || 'medium',
                        tags: problem.tags || [],
                        descriptionSnippet: snippet,
                        catchyQuote: quote,
                        totalSolves: 0
                    }
                },
                { upsert: true, new: true }
            ).populate('problemRef').lean();
        }

        const secondsLeft = getSecondsUntilMidnightIST();

        const problemObjectId = (dailyDoc.problemRef && dailyDoc.problemRef._id)
            ? String(dailyDoc.problemRef._id)
            : String(dailyDoc.problemRef || '');

        return {
            ...dailyDoc,
            problemId: problemObjectId,
            problemObjectId: problemObjectId,
            secondsUntilNext: secondsLeft,
            serverDate: todayStr,
            isPersonal: false,
            personalTopic: null,
            haveliCoins: userDoc?.haveliCoins || 0,
            coinReward: config.potdRewardCoins,
            personalPotdPrice: config.personalPotdPrice,
            personalPotdDurationDays: config.personalPotdDurationDays,
            personalAajKaSawal: {
                isActive: isPersonalActive,
                selectedTopic: userDoc?.personalAajKaSawal?.selectedTopic || null,
                purchasedAt: userDoc?.personalAajKaSawal?.purchasedAt || null,
                expiresAt: userDoc?.personalAajKaSawal?.expiresAt || null
            }
        };
    }

    /**
     * Gets user streak and monthly calendar solved days matrix.
     */
    static async getUserStreakAndCalendar(userId, yearNum, monthNum) {
        const DailyStreak = mongoose.model('DailyStreak');
        const todayStr = getISTDateString();

        let streakDoc = null;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            streakDoc = await DailyStreak.findOne({ userId }).lean();
        }

        // Filter history for the requested month
        const targetYear = yearNum || parseInt(todayStr.split('-')[0], 10);
        const targetMonth = monthNum || parseInt(todayStr.split('-')[1], 10);
        const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

        const solvedDatesSet = new Set();
        if (streakDoc && Array.isArray(streakDoc.history)) {
            streakDoc.history.forEach((h) => {
                if (h.date && h.date.startsWith(monthPrefix)) {
                    solvedDatesSet.add(h.date);
                }
            });
        }

        // Check if today is already solved
        const isTodaySolved = solvedDatesSet.has(todayStr) || (streakDoc && streakDoc.lastSolvedDate === todayStr);

        // Fetch registered daily problems for this month
        const DailyProblem = mongoose.model('DailyProblem');
        const ProblemList = mongoose.model('ProblemList');

        const dailyDocs = await DailyProblem.find({
            date: { $regex: new RegExp(`^${monthPrefix}`) }
        }).populate('problemRef').lean();

        const dailyProblemsMap = {};
        dailyDocs.forEach(d => {
            const probId = d.problemRef?._id ? String(d.problemRef._id) : (d.problemRef ? String(d.problemRef) : String(d.quesId));
            dailyProblemsMap[d.date] = {
                quesId: String(d.quesId),
                quesName: d.quesName,
                difficulty: d.difficulty || 'Medium',
                problemId: probId
            };
        });

        // For any dates not yet in DB, dynamically prefill from CURATED_ROTATION_IDS
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
        const missingDays = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (!dailyProblemsMap[dStr]) {
                const dateObj = new Date(Date.UTC(targetYear, targetMonth - 1, day));
                const daysSinceEpoch = Math.floor(dateObj.getTime() / (1000 * 60 * 60 * 24));
                const qId = CURATED_ROTATION_IDS[Math.abs(daysSinceEpoch) % CURATED_ROTATION_IDS.length];
                missingDays.push({ dStr, qId });
            }
        }

        if (missingDays.length > 0) {
            const qIds = [...new Set(missingDays.map(m => m.qId))];
            const foundProblems = await ProblemList.find({ quesId: { $in: qIds } }, { quesId: 1, quesName: 1, difficulty: 1, _id: 1 }).lean();
            const probByQuesId = {};
            foundProblems.forEach(p => { probByQuesId[String(p.quesId)] = p; });

            missingDays.forEach(({ dStr, qId }) => {
                const p = probByQuesId[qId];
                if (p) {
                    dailyProblemsMap[dStr] = {
                        quesId: String(p.quesId),
                        quesName: p.quesName,
                        difficulty: p.difficulty || 'Medium',
                        problemId: String(p._id)
                    };
                }
            });
        }

        return {
            currentStreak: streakDoc ? streakDoc.currentStreak : 0,
            longestStreak: streakDoc ? streakDoc.longestStreak : 0,
            totalDaysSolved: streakDoc ? streakDoc.totalDaysSolved : 0,
            lastSolvedDate: streakDoc ? streakDoc.lastSolvedDate : null,
            isTodaySolved: !!isTodaySolved,
            solvedDates: Array.from(solvedDatesSet),
            dailyProblems: dailyProblemsMap,
            todayDate: todayStr,
            year: targetYear,
            month: targetMonth
        };
    }

    /**
     * Invoked when a submission gets Accepted. Checks if it matches today's AajKaSawal (global or Personal AajKaSawal).
     */
    static async handleAcceptedSubmission(userId, quesId) {
        if (!userId || !quesId) return { isDailyProblem: false };

        const DailyProblem = mongoose.model('DailyProblem');
        const DailyStreak = mongoose.model('DailyStreak');
        const PersonalDailyProblem = mongoose.model('PersonalDailyProblem');

        const todayStr = getISTDateString();
        const yesterdayStr = getYesterdayISTDateString();

        // Check both global today's problem and user's Personal AajKaSawal for today
        const [todayProblem, personalProblem] = await Promise.all([
            DailyProblem.findOne({ date: todayStr }),
            mongoose.Types.ObjectId.isValid(userId)
                ? PersonalDailyProblem.findOne({ userId, date: todayStr })
                : Promise.resolve(null)
        ]);

        const matchesGlobal = todayProblem && String(todayProblem.quesId) === String(quesId);
        const matchesPersonal = personalProblem && String(personalProblem.quesId) === String(quesId);

        if (!matchesGlobal && !matchesPersonal) {
            return { isDailyProblem: false };
        }

        if (matchesGlobal) {
            await DailyProblem.updateOne({ _id: todayProblem._id }, { $inc: { totalSolves: 1 } });
        }
        if (matchesPersonal && !personalProblem.solved) {
            await PersonalDailyProblem.updateOne({ _id: personalProblem._id }, { $set: { solved: true } });
        }

        // User streak update
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return { isDailyProblem: true, streakUpdated: false };
        }

        let userStreak = await DailyStreak.findOne({ userId });
        let currentStreak = 1;
        let longestStreak = 1;
        let isNewSolve = false;

        if (!userStreak) {
            userStreak = await DailyStreak.create({
                userId,
                currentStreak: 1,
                longestStreak: 1,
                totalDaysSolved: 1,
                lastSolvedDate: todayStr,
                history: [{ date: todayStr, quesId: String(quesId), solvedAt: new Date() }]
            });
            isNewSolve = true;
        } else if (userStreak.lastSolvedDate === todayStr) {
            // Already solved POTD today
            currentStreak = userStreak.currentStreak;
            longestStreak = userStreak.longestStreak;
            isNewSolve = false;
        } else {
            let newStreak = 1;
            if (userStreak.lastSolvedDate === yesterdayStr) {
                newStreak = (userStreak.currentStreak || 0) + 1;
            }
            const newLongest = Math.max(userStreak.longestStreak || 0, newStreak);
            const newTotalDays = (userStreak.totalDaysSolved || 0) + 1;

            userStreak.currentStreak = newStreak;
            userStreak.longestStreak = newLongest;
            userStreak.totalDaysSolved = newTotalDays;
            userStreak.lastSolvedDate = todayStr;
            userStreak.history.push({ date: todayStr, quesId: String(quesId), solvedAt: new Date() });
            userStreak.modifiedAt = new Date();

            await userStreak.save();

            currentStreak = newStreak;
            longestStreak = newLongest;
            isNewSolve = true;
        }

        // Award Haveli Coins on first POTD solve today
        let coinsEarned = 0;
        let bonusCoinsEarned = 0;
        let newCoinBalance = null;

        if (isNewSolve) {
            try {
                const config = await HaveliCoinService.getConfig();
                if (config.potdRewardCoins > 0) {
                    const label = matchesPersonal ? `Personal AajKaSawal (${personalProblem.topic})` : 'AajKaSawal';
                    const creditRes = await HaveliCoinService.creditCoins(
                        userId,
                        config.potdRewardCoins,
                        'potd_reward',
                        `Solved ${label} #${quesId} (${todayStr})`,
                        { quesId: String(quesId), date: todayStr, isPersonal: !!matchesPersonal }
                    );
                    coinsEarned = config.potdRewardCoins;
                    newCoinBalance = creditRes.balance;
                }

                // 7-day milestone streak bonus
                if (currentStreak > 0 && currentStreak % 7 === 0 && config.streakBonusCoins > 0) {
                    const bonusRes = await HaveliCoinService.creditCoins(
                        userId,
                        config.streakBonusCoins,
                        'streak_bonus',
                        `${currentStreak}-Day Code Tapasya Streak Bonus!`,
                        { streak: currentStreak, date: todayStr }
                    );
                    bonusCoinsEarned = config.streakBonusCoins;
                    newCoinBalance = bonusRes.balance;
                }
            } catch (coinErr) {
                console.error('Error awarding Haveli Coins on POTD solve:', coinErr);
            }
        }

        return {
            isDailyProblem: true,
            isPersonal: !!matchesPersonal,
            currentStreak,
            longestStreak,
            isNewSolve,
            coinsEarned,
            bonusCoinsEarned,
            newCoinBalance
        };
    }
}

module.exports = DailyProblemService;

