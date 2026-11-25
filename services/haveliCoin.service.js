/**
 * haveliCoin.service.js
 * Manages Haveli Coins, coin rewards/transactions, admin config,
 * and the "Personal AajKaSawal" (custom topic POTD) subscription plan.
 */

const mongoose = require('mongoose');

class HaveliCoinService {
    static async getConfig() {
        const CoinConfig = mongoose.model('CoinConfig');
        let config = await CoinConfig.findOne({ key: 'global' }).lean();
        if (!config) {
            config = await CoinConfig.findOneAndUpdate(
                { key: 'global' },
                {
                    $setOnInsert: {
                        key: 'global',
                        potdRewardCoins: 1,
                        streakBonusCoins: 25,
                        contestSolveCoins: 1,
                        contestTop1BonusCoins: 20,
                        contestTop2BonusCoins: 10,
                        contestTop3BonusCoins: 5,
                        personalPotdPrice: 50,
                        personalPotdDurationDays: 30,
                        updatedAt: new Date()
                    }
                },
                { upsert: true, new: true }
            ).lean();
        }
        return config;
    }

    static async updateConfig(updates, adminId = null) {
        const CoinConfig = mongoose.model('CoinConfig');
        const setFields = { updatedAt: new Date() };
        if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
            setFields.updatedBy = adminId;
        }
        if (updates.potdRewardCoins !== undefined) {
            setFields.potdRewardCoins = Math.max(0, Number(updates.potdRewardCoins) || 0);
        }
        if (updates.streakBonusCoins !== undefined) {
            setFields.streakBonusCoins = Math.max(0, Number(updates.streakBonusCoins) || 0);
        }
        if (updates.contestSolveCoins !== undefined) {
            setFields.contestSolveCoins = Math.max(0, Number(updates.contestSolveCoins) || 0);
        }
        if (updates.contestTop1BonusCoins !== undefined) {
            setFields.contestTop1BonusCoins = Math.max(0, Number(updates.contestTop1BonusCoins) || 0);
        }
        if (updates.contestTop2BonusCoins !== undefined) {
            setFields.contestTop2BonusCoins = Math.max(0, Number(updates.contestTop2BonusCoins) || 0);
        }
        if (updates.contestTop3BonusCoins !== undefined) {
            setFields.contestTop3BonusCoins = Math.max(0, Number(updates.contestTop3BonusCoins) || 0);
        }
        if (updates.personalPotdPrice !== undefined) {
            setFields.personalPotdPrice = Math.max(0, Number(updates.personalPotdPrice) || 0);
        }
        if (updates.personalPotdDurationDays !== undefined) {
            setFields.personalPotdDurationDays = Math.max(1, Number(updates.personalPotdDurationDays) || 30);
        }

        return CoinConfig.findOneAndUpdate(
            { key: 'global' },
            { $set: setFields },
            { upsert: true, new: true }
        ).lean();
    }

    static isPersonalPlanActive(user) {
        if (!user?.personalAajKaSawal?.isActive) return false;
        if (!user.personalAajKaSawal.expiresAt) return true;
        return new Date(user.personalAajKaSawal.expiresAt) > new Date();
    }

    static async creditCoins(userId, amount, type, reason, metadata = {}, adminId = null) {
        const numAmount = Math.floor(Number(amount));
        if (!numAmount || numAmount <= 0) {
            throw new Error('Credit amount must be a positive number.');
        }

        const User = mongoose.model('User');
        const CoinTransaction = mongoose.model('CoinTransaction');

        const updatedUser = await User.findOneAndUpdate(
            { _id: userId },
            { $inc: { haveliCoins: numAmount }, $set: { modifiedAt: new Date() } },
            { new: true }
        );

        if (!updatedUser) {
            throw new Error('User not found.');
        }

        const tx = await CoinTransaction.create({
            userId,
            amount: numAmount,
            type,
            reason: reason || 'Haveli Coins credited',
            balanceAfter: updatedUser.haveliCoins,
            adminId: adminId && mongoose.Types.ObjectId.isValid(adminId) ? adminId : null,
            metadata
        });

        return {
            balance: updatedUser.haveliCoins,
            transaction: tx
        };
    }

    static async debitCoins(userId, amount, type, reason, metadata = {}, adminId = null) {
        const numAmount = Math.floor(Number(amount));
        if (!numAmount || numAmount <= 0) {
            throw new Error('Debit amount must be a positive number.');
        }

        const User = mongoose.model('User');
        const CoinTransaction = mongoose.model('CoinTransaction');

        const updatedUser = await User.findOneAndUpdate(
            { _id: userId, haveliCoins: { $gte: numAmount } },
            { $inc: { haveliCoins: -numAmount }, $set: { modifiedAt: new Date() } },
            { new: true }
        );

        if (!updatedUser) {
            const exists = await User.exists({ _id: userId });
            if (!exists) throw new Error('User not found.');
            throw new Error('Insufficient Haveli Coins.');
        }

        const tx = await CoinTransaction.create({
            userId,
            amount: -numAmount,
            type,
            reason: reason || 'Haveli Coins deducted',
            balanceAfter: updatedUser.haveliCoins,
            adminId: adminId && mongoose.Types.ObjectId.isValid(adminId) ? adminId : null,
            metadata
        });

        return {
            balance: updatedUser.haveliCoins,
            transaction: tx
        };
    }

    static async purchasePersonalPotd(userId, selectedTopic = null) {
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found.');

        if (this.isPersonalPlanActive(user)) {
            throw new Error('You already have an active Personal AajKaSawal plan.');
        }

        const config = await this.getConfig();
        const price = config.personalPotdPrice ?? 50;
        const durationDays = config.personalPotdDurationDays ?? 30;

        let newBalance = user.haveliCoins || 0;
        if (price > 0) {
            const debitRes = await this.debitCoins(
                userId,
                price,
                'personal_potd_purchase',
                `Purchased Personal AajKaSawal Plan (${durationDays} Days)`,
                { durationDays, topic: selectedTopic || null }
            );
            newBalance = debitRes.balance;
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const cleanTopic = selectedTopic ? String(selectedTopic).trim() : (user.personalAajKaSawal?.selectedTopic || null);

        await User.updateOne(
            { _id: userId },
            {
                $set: {
                    personalAajKaSawal: {
                        isActive: true,
                        selectedTopic: cleanTopic,
                        purchasedAt: now,
                        expiresAt
                    },
                    modifiedAt: now
                }
            }
        );

        return {
            haveliCoins: newBalance,
            personalAajKaSawal: {
                isActive: true,
                selectedTopic: cleanTopic,
                purchasedAt: now,
                expiresAt
            }
        };
    }

    static async updatePersonalTopic(userId, selectedTopic, todayStr) {
        const User = mongoose.model('User');
        const PersonalDailyProblem = mongoose.model('PersonalDailyProblem');

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found.');

        if (!this.isPersonalPlanActive(user)) {
            throw new Error('Personal AajKaSawal plan is not active. Please purchase it using Haveli Coins first.');
        }

        const cleanTopic = selectedTopic ? String(selectedTopic).trim() : null;

        await User.updateOne(
            { _id: userId },
            {
                $set: {
                    'personalAajKaSawal.selectedTopic': cleanTopic,
                    modifiedAt: new Date()
                }
            }
        );

        // If today's personal POTD hasn't been solved yet, clear it so the new topic takes effect immediately
        if (todayStr) {
            await PersonalDailyProblem.deleteOne({
                userId,
                date: todayStr,
                solved: false
            });
        }

        return {
            isActive: true,
            selectedTopic: cleanTopic,
            purchasedAt: user.personalAajKaSawal.purchasedAt,
            expiresAt: user.personalAajKaSawal.expiresAt
        };
    }

    static async getUserCoinSummary(userId) {
        const User = mongoose.model('User');
        const CoinTransaction = mongoose.model('CoinTransaction');

        const [user, config, transactions] = await Promise.all([
            User.findById(userId, { haveliCoins: 1, personalAajKaSawal: 1, name: 1, email: 1 }).lean(),
            this.getConfig(),
            CoinTransaction.find({ userId }).sort({ createdAt: -1 }).limit(25).lean()
        ]);

        if (!user) throw new Error('User not found.');

        const active = this.isPersonalPlanActive(user);

        return {
            haveliCoins: user.haveliCoins || 0,
            personalAajKaSawal: {
                isActive: active,
                selectedTopic: user.personalAajKaSawal?.selectedTopic || null,
                purchasedAt: user.personalAajKaSawal?.purchasedAt || null,
                expiresAt: user.personalAajKaSawal?.expiresAt || null
            },
            config,
            transactions
        };
    }

    static async getAvailableTopics() {
        const ProblemList = mongoose.model('ProblemList');
        const agg = await ProblemList.aggregate([
            { $unwind: '$tags' },
            { $match: { tags: { $type: 'string', $ne: '' } } },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } }
        ]);
        return agg.map(item => ({ topic: item._id, count: item.count }));
    }

    /**
     * Awards top-3 podium Haveli Coin bonuses when a contest transitions to 'ended'.
     * Idempotent: checks CoinTransaction so it never double-awards for the same contest.
     */
    static async awardContestRankCoins(contest) {
        if (!contest?._id) return [];

        const ContestScore = mongoose.model('ContestScore');
        const CoinTransaction = mongoose.model('CoinTransaction');
        const config = await this.getConfig();

        const bonusByRank = {
            1: config.contestTop1BonusCoins ?? 20,
            2: config.contestTop2BonusCoins ?? 10,
            3: config.contestTop3BonusCoins ?? 5
        };

        const topScores = await ContestScore.find({
            contest: contest._id,
            disqualified: false,
            problemsSolved: { $gt: 0 },
            rank: { $in: [1, 2, 3] }
        }).sort({ rank: 1 }).lean();

        const awarded = [];
        for (const sc of topScores) {
            const bonus = bonusByRank[sc.rank] || 0;
            if (bonus <= 0) continue;

            const alreadyAwarded = await CoinTransaction.exists({
                userId: sc.user,
                type: 'contest_rank_bonus',
                'metadata.contestId': String(contest._id)
            });
            if (alreadyAwarded) continue;

            const res = await this.creditCoins(
                sc.user,
                bonus,
                'contest_rank_bonus',
                `Rank #${sc.rank} in "${contest.title || 'Weekly Contest'}"`,
                { contestId: String(contest._id), rank: sc.rank, score: sc.totalScore }
            );
            awarded.push({ userId: sc.user, rank: sc.rank, bonus, balance: res.balance });
        }

        return awarded;
    }
}

module.exports = HaveliCoinService;

