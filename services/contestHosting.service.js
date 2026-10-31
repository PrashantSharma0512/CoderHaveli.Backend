const mongoose = require('mongoose');

class ContestHostingService {
    /**
     * Get user's current hosting entitlement (default 5, or higher with paid Contest Pass)
     */
    async getUserHostingEntitlement(userId) {
        const ContestPassPurchase = mongoose.model('ContestPassPurchase');
        const ContestPassPlan = mongoose.model('ContestPassPlan');

        // Check if there is a configured default limit in active plans
        const defaultPlan = await ContestPassPlan.findOne({ isDefaultFree: true, isActive: true }).lean();
        const baseLimit = defaultPlan?.participantLimit || 5;

        if (!userId) {
            return {
                baseLimit,
                effectiveLimit: baseLimit,
                hasActivePass: false,
                activePlan: null,
                isUnlimited: false
            };
        }

        const now = new Date();
        const activePurchases = await ContestPassPurchase.find({
            user: userId,
            status: 'completed',
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: now } }
            ]
        }).sort({ participantLimitGranted: -1 }).populate('plan').lean();

        if (activePurchases.length > 0) {
            const bestPass = activePurchases[0];
            const limit = bestPass.participantLimitGranted;
            const isUnlimited = limit < 0 || limit >= 99999;

            return {
                baseLimit,
                defaultParticipantLimit: baseLimit,
                effectiveLimit: isUnlimited ? 999999 : limit,
                effectiveParticipantLimit: isUnlimited ? 999999 : limit,
                hasActivePass: true,
                activePlan: {
                    id: bestPass.plan?._id,
                    name: bestPass.planSnapshot?.name || bestPass.plan?.name || 'Contest Pass',
                    limit: isUnlimited ? 'Unlimited' : limit,
                    expiresAt: bestPass.expiresAt
                },
                isUnlimited
            };
        }

        return {
            baseLimit,
            defaultParticipantLimit: baseLimit,
            effectiveLimit: baseLimit,
            effectiveParticipantLimit: baseLimit,
            hasActivePass: false,
            activePlan: null,
            isUnlimited: false
        };
    }

    /**
     * Check if a host can invite/host N participants (including host)
     */
    async validateParticipantLimit(userId, totalParticipantCount) {
        const entitlement = await this.getUserHostingEntitlement(userId);
        if (entitlement.isUnlimited) {
            return { allowed: true, limit: Infinity, current: totalParticipantCount };
        }

        const allowed = totalParticipantCount <= entitlement.effectiveLimit;
        return {
            allowed,
            limit: entitlement.effectiveLimit,
            current: totalParticipantCount,
            message: allowed
                ? null
                : `Participant limit exceeded. Your current plan allows up to ${entitlement.effectiveLimit} participants (including host). Purchase a Contest Pass to invite more participants.`
        };
    }

    /**
     * Verify if user is authorized to view private contest details
     */
    async isUserAuthorizedForPrivateContest(contest, user) {
        if (!contest || contest.contestType !== 'private') {
            return true;
        }

        // Guests are never authorized for private contests
        if (!user || !user._id) {
            return false;
        }

        // Admins always have access
        if (user.role === 'admin') {
            return true;
        }

        const userIdStr = user._id.toString();
        const hostIdStr = (contest.host || contest.createdBy)?.toString();

        // Host is always authorized
        if (hostIdStr === userIdStr) {
            return true;
        }

        // Check if user is in contest's invitedUsers list
        if (Array.isArray(contest.invitedUsers)) {
            const isInvited = contest.invitedUsers.some(inv => {
                const invUserId = (inv.user?._id || inv.user)?.toString();
                return invUserId === userIdStr && inv.status !== 'revoked' && inv.status !== 'declined';
            });
            if (isInvited) return true;
        }

        // Check ContestInvitation collection
        const ContestInvitation = mongoose.model('ContestInvitation');
        const invite = await ContestInvitation.findOne({
            contest: contest._id,
            invitedUser: user._id,
            status: { $in: ['pending', 'accepted'] }
        });
        if (invite) return true;

        // Check ContestRegistration
        const ContestRegistration = mongoose.model('ContestRegistration');
        const reg = await ContestRegistration.findOne({
            contest: contest._id,
            user: user._id
        });
        if (reg) return true;

        return false;
    }

    /**
     * Strip private contest fields for unauthorized visitors
     * ONLY returns public metadata: name, host, participant count, status, timings
     */
    maskPrivateContest(contest) {
        if (!contest) return null;

        const host = contest.host || contest.createdBy;
        return {
            _id: contest._id,
            title: contest.title,
            slug: contest.slug,
            banner: contest.banner,
            contestType: 'private',
            visibility: contest.visibility || 'private',
            status: contest.status,
            difficulty: contest.difficulty,
            startTime: contest.startTime,
            endTime: contest.endTime,
            timezone: contest.timezone || 'Asia/Kolkata',
            durationMinutes: contest.durationMinutes || (contest.endTime && contest.startTime ? Math.round((new Date(contest.endTime) - new Date(contest.startTime)) / 60000) : 0),
            registeredCount: contest.registeredCount || (contest.invitedUsers ? contest.invitedUsers.length + 1 : 1),
            participantLimit: contest.participantLimit || 5,
            host: host ? {
                _id: host._id,
                name: host.name,
                username: host.username,
                avatar: host.avatar
            } : null,
            createdBy: host ? {
                _id: host._id,
                name: host.name,
                username: host.username,
                avatar: host.avatar
            } : null,
            isPrivateRestricted: true,
            message: 'This is a private contest. Only the host and invited participants can access contest details and questions.'
        };
    }
}

module.exports = new ContestHostingService();
