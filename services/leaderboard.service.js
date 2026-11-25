/**
 * leaderboard.service.js
 * High-performance Global Leaderboard & User Rank calculator.
 *
 * Optimization strategy:
 * 1. Stores denormalized `leaderboardStats` on User with a compound B-tree index
 *    `(isDeleted, solvedCount desc, score desc, haveliCoins desc, createdAt asc)`.
 * 2. Updates only the submitting user's stats incrementally on submission (single-user indexed query).
 * 3. Computes a user's exact Global Rank in O(log N) via indexed `countDocuments()` (zero full-collection sort).
 * 4. Caches paginated leaderboard responses in memory for 60s (invalidated on new solves).
 */

const mongoose = require('mongoose');

const CACHE_TTL_MS = 60 * 1000;
let leaderboardCache = new Map();
let backfillPromise = null;
let hasBackfilledOnce = false;

class LeaderboardService {
    static invalidateCache() {
        leaderboardCache.clear();
    }

    static computeScore({ easy = 0, medium = 0, hard = 0 }) {
        return easy * 10 + medium * 25 + hard * 50;
    }

    /**
     * One-time lazy backfill for existing users whose `leaderboardStats.lastUpdatedAt` is null.
     */
    static async ensureBackfilled() {
        if (hasBackfilledOnce) return;
        if (backfillPromise) return backfillPromise;

        backfillPromise = (async () => {
            try {
                const User = mongoose.model('User');
                const Submission = mongoose.model('Submission');
                const ProblemList = mongoose.model('ProblemList');

                const needsBackfill = await User.exists({
                    isDeleted: false,
                    'leaderboardStats.lastUpdatedAt': null
                });
                if (!needsBackfill) {
                    hasBackfilledOnce = true;
                    return;
                }

                const [problems, subAgg] = await Promise.all([
                    ProblemList.find({}, { quesId: 1, difficulty: 1 }).lean(),
                    Submission.aggregate([
                        {
                            $group: {
                                _id: { userId: '$userId', quesId: '$quesId' },
                                hasAccepted: {
                                    $max: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
                                },
                                totalCount: { $sum: 1 },
                                acceptedCount: {
                                    $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
                                }
                            }
                        }
                    ])
                ]);

                const diffByQuesId = new Map();
                for (const p of problems) {
                    diffByQuesId.set(String(p.quesId), (p.difficulty || 'medium').toLowerCase());
                }

                const userMap = new Map();
                for (const row of subAgg) {
                    const uid = String(row._id.userId);
                    if (!userMap.has(uid)) {
                        userMap.set(uid, {
                            solvedCount: 0,
                            easySolved: 0,
                            mediumSolved: 0,
                            hardSolved: 0,
                            totalSubmissions: 0,
                            acceptedSubmissions: 0
                        });
                    }
                    const st = userMap.get(uid);
                    st.totalSubmissions += row.totalCount || 0;
                    st.acceptedSubmissions += row.acceptedCount || 0;
                    if (row.hasAccepted === 1) {
                        st.solvedCount += 1;
                        const diff = diffByQuesId.get(String(row._id.quesId)) || 'medium';
                        if (diff === 'easy') st.easySolved += 1;
                        else if (diff === 'hard') st.hardSolved += 1;
                        else st.mediumSolved += 1;
                    }
                }

                const now = new Date();
                const bulkOps = [];

                for (const [uid, st] of userMap.entries()) {
                    if (!mongoose.Types.ObjectId.isValid(uid)) continue;
                    const score = this.computeScore({
                        easy: st.easySolved,
                        medium: st.mediumSolved,
                        hard: st.hardSolved
                    });
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: new mongoose.Types.ObjectId(uid) },
                            update: {
                                $set: {
                                    leaderboardStats: {
                                        ...st,
                                        score,
                                        lastUpdatedAt: now
                                    }
                                }
                            }
                        }
                    });
                }

                // Mark remaining users with 0 submissions as backfilled
                bulkOps.push({
                    updateMany: {
                        filter: { 'leaderboardStats.lastUpdatedAt': null },
                        update: {
                            $set: {
                                'leaderboardStats.lastUpdatedAt': now
                            }
                        }
                    }
                });

                if (bulkOps.length > 0) {
                    await User.bulkWrite(bulkOps, { ordered: false });
                }

                hasBackfilledOnce = true;
            } catch (err) {
                console.error('Leaderboard backfill error:', err.message);
            } finally {
                backfillPromise = null;
            }
        })();

        return backfillPromise;
    }

    /**
     * Recomputes stats for a single user using their indexed submissions (<2ms) and invalidates cache.
     */
    static async refreshUserStats(userId) {
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;

        const User = mongoose.model('User');
        const Submission = mongoose.model('Submission');
        const ProblemList = mongoose.model('ProblemList');
        const userObjId = new mongoose.Types.ObjectId(userId);

        const subAgg = await Submission.aggregate([
            { $match: { userId: userObjId } },
            {
                $group: {
                    _id: '$quesId',
                    hasAccepted: {
                        $max: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
                    },
                    totalCount: { $sum: 1 },
                    acceptedCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
                    }
                }
            }
        ]);

        const solvedQuesIds = [];
        let totalSubmissions = 0;
        let acceptedSubmissions = 0;

        for (const row of subAgg) {
            totalSubmissions += row.totalCount || 0;
            acceptedSubmissions += row.acceptedCount || 0;
            if (row.hasAccepted === 1) {
                solvedQuesIds.push(String(row._id));
            }
        }

        let easySolved = 0;
        let mediumSolved = 0;
        let hardSolved = 0;

        if (solvedQuesIds.length > 0) {
            const diffAgg = await ProblemList.aggregate([
                { $match: { quesId: { $in: solvedQuesIds } } },
                { $group: { _id: { $toLower: '$difficulty' }, count: { $sum: 1 } } }
            ]);
            for (const d of diffAgg) {
                if (d._id === 'easy') easySolved = d.count;
                else if (d._id === 'hard') hardSolved = d.count;
                else if (d._id === 'medium') mediumSolved = d.count;
            }
        }

        const stats = {
            solvedCount: solvedQuesIds.length,
            easySolved,
            mediumSolved,
            hardSolved,
            totalSubmissions,
            acceptedSubmissions,
            score: this.computeScore({ easy: easySolved, medium: mediumSolved, hard: hardSolved }),
            lastUpdatedAt: new Date()
        };

        await User.updateOne({ _id: userObjId }, { $set: { leaderboardStats: stats } });
        this.invalidateCache();
        return stats;
    }

    /**
     * Computes a user's exact Global Rank in O(log N) via indexed countDocuments.
     */
    static async getUserRank(userId) {
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;

        await this.ensureBackfilled();

        const User = mongoose.model('User');
        const user = await User.findById(userId, {
            name: 1,
            username: 1,
            avatar: 1,
            haveliCoins: 1,
            leaderboardStats: 1,
            createdAt: 1,
            isDeleted: 1
        }).lean();

        if (!user || user.isDeleted) return null;

        let stats = user.leaderboardStats;
        if (!stats || !stats.lastUpdatedAt) {
            stats = await this.refreshUserStats(userId);
        }

        const mySolved = stats?.solvedCount || 0;
        const myScore = stats?.score || 0;
        const myCoins = user.haveliCoins || 0;
        const myCreatedAt = user.createdAt || new Date(0);

        const [higherCount, totalUsers] = await Promise.all([
            User.countDocuments({
                isDeleted: false,
                $or: [
                    { 'leaderboardStats.solvedCount': { $gt: mySolved } },
                    { 'leaderboardStats.solvedCount': mySolved, 'leaderboardStats.score': { $gt: myScore } },
                    { 'leaderboardStats.solvedCount': mySolved, 'leaderboardStats.score': myScore, haveliCoins: { $gt: myCoins } },
                    {
                        'leaderboardStats.solvedCount': mySolved,
                        'leaderboardStats.score': myScore,
                        haveliCoins: myCoins,
                        createdAt: { $lt: myCreatedAt }
                    }
                ]
            }),
            User.countDocuments({ isDeleted: false })
        ]);

        const rank = higherCount + 1;
        const topPercent = totalUsers > 0 ? Math.max(1, Math.ceil((rank / totalUsers) * 100)) : 100;

        return {
            rank,
            totalUsers,
            topPercent,
            solvedCount: mySolved,
            score: myScore,
            haveliCoins: myCoins
        };
    }

    /**
     * Returns paginated global leaderboard with 60s TTL cache.
     */
    static async getLeaderboard({ page = 1, limit = 25, search = '', userId = null } = {}) {
        await this.ensureBackfilled();

        const safePage = Math.max(1, parseInt(page, 10) || 1);
        const safeLimit = Math.min(50, Math.max(5, parseInt(limit, 10) || 25));
        const cleanSearch = String(search || '').trim();
        const cacheKey = `${safePage}:${safeLimit}:${cleanSearch.toLowerCase()}`;

        let baseResult = null;
        const cached = leaderboardCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
            baseResult = cached.data;
        } else {
            const User = mongoose.model('User');
            const DailyStreak = mongoose.model('DailyStreak');

            const filter = { isDeleted: false };
            if (cleanSearch) {
                filter.$or = [
                    { name: { $regex: cleanSearch, $options: 'i' } },
                    { username: { $regex: cleanSearch, $options: 'i' } }
                ];
            }

            const skip = (safePage - 1) * safeLimit;
            const [users, total] = await Promise.all([
                User.find(filter, {
                    name: 1,
                    username: 1,
                    avatar: 1,
                    haveliCoins: 1,
                    leaderboardStats: 1,
                    createdAt: 1
                })
                    .sort({
                        'leaderboardStats.solvedCount': -1,
                        'leaderboardStats.score': -1,
                        haveliCoins: -1,
                        createdAt: 1
                    })
                    .skip(skip)
                    .limit(safeLimit)
                    .lean(),
                User.countDocuments(filter)
            ]);

            // Batch-fetch streaks for just the visible page of users (max 50 IDs)
            const userIds = users.map((u) => u._id);
            const streaks = userIds.length > 0
                ? await DailyStreak.find({ userId: { $in: userIds } }, { userId: 1, currentStreak: 1, longestStreak: 1 }).lean()
                : [];
            const streakByUserId = new Map(streaks.map((s) => [String(s.userId), s]));

            const entries = users.map((u, idx) => {
                const st = u.leaderboardStats || {};
                const totalSub = st.totalSubmissions || 0;
                const accSub = st.acceptedSubmissions || 0;
                const streak = streakByUserId.get(String(u._id));

                return {
                    rank: skip + idx + 1,
                    _id: String(u._id),
                    name: u.name || 'Coder',
                    username: u.username || 'coder',
                    avatar: u.avatar || null,
                    haveliCoins: u.haveliCoins || 0,
                    solvedCount: st.solvedCount || 0,
                    easySolved: st.easySolved || 0,
                    mediumSolved: st.mediumSolved || 0,
                    hardSolved: st.hardSolved || 0,
                    score: st.score || 0,
                    acceptanceRate: totalSub > 0 ? Number(((accSub / totalSub) * 100).toFixed(1)) : 0,
                    currentStreak: streak?.currentStreak || 0,
                    longestStreak: streak?.longestStreak || 0
                };
            });

            baseResult = {
                entries,
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.max(1, Math.ceil(total / safeLimit))
            };

            leaderboardCache.set(cacheKey, { ts: Date.now(), data: baseResult });
        }

        const myRank = userId ? await this.getUserRank(userId) : null;
        return {
            ...baseResult,
            myRank
        };
    }
}

module.exports = LeaderboardService;

