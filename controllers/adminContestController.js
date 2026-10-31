const mongoose = require('mongoose');
const contestScheduler = require('../services/contestScheduler.service');
const contestScoringService = require('../services/contestScoring.service');
const weeklyContestService = require('../services/weeklyContest.service');

const adminContestController = {};

/**
 * GET /api/admin/contests/overview
 * Dashboard statistics for admin
 */
adminContestController.getAdminContestOverview = async (req, res) => {
    try {
        await contestScheduler.reconcileContestStates();

        const Contest = mongoose.model('Contest');
        const ContestRegistration = mongoose.model('ContestRegistration');
        const ContestSubmission = mongoose.model('ContestSubmission');
        const ContestPassPurchase = mongoose.model('ContestPassPurchase');

        const [
            totalContests,
            draftContests,
            scheduledContests,
            liveContests,
            endedContests,
            cancelledContests,
            disabledContests,
            publicContests,
            privateContests,
            distinctHosts,
            totalRegistrations,
            totalSubmissions,
            totalPassPurchases,
            passRevenueAgg,
            recentContests,
            upcomingContests
        ] = await Promise.all([
            Contest.countDocuments(),
            Contest.countDocuments({ status: 'draft' }),
            Contest.countDocuments({ status: 'scheduled' }),
            Contest.countDocuments({ status: 'live' }),
            Contest.countDocuments({ status: 'ended' }),
            Contest.countDocuments({ status: 'cancelled' }),
            Contest.countDocuments({ status: 'disabled' }),
            Contest.countDocuments({ contestType: 'public' }),
            Contest.countDocuments({ contestType: 'private' }),
            Contest.distinct('createdBy'),
            ContestRegistration.countDocuments(),
            ContestSubmission.countDocuments(),
            ContestPassPurchase.countDocuments({ status: 'completed' }),
            ContestPassPurchase.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
            ]),
            Contest.find().sort({ createdAt: -1 }).limit(5).populate('createdBy', 'name username').lean(),
            Contest.find({ status: 'scheduled', startTime: { $gt: new Date() } }).sort({ startTime: 1 }).limit(5).lean()
        ]);

        const totalPassRevenue = passRevenueAgg.length > 0 ? passRevenueAgg[0].totalRevenue : 0;

        return res.json({
            success: true,
            stats: {
                totalContests,
                draftContests,
                scheduledContests,
                liveContests,
                endedContests,
                cancelledContests,
                disabledContests,
                publicContests,
                privateContests,
                totalHosts: distinctHosts.length,
                totalRegistrations,
                totalSubmissions,
                totalPassPurchases,
                totalPassRevenue
            },
            recentContests,
            upcomingContests
        });
    } catch (error) {
        console.error('Error fetching admin contest overview:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests
 * Paginated contests table for admin
 */
adminContestController.getAdminContests = async (req, res) => {
    try {
        await contestScheduler.reconcileContestStates();

        const Contest = mongoose.model('Contest');
        const ContestRegistration = mongoose.model('ContestRegistration');
        const ContestSubmission = mongoose.model('ContestSubmission');
        const User = mongoose.model('User');

        const {
            search = '',
            status = 'all',
            contestType = 'all',
            sortBy = 'createdAt',
            order = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        const query = {};

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            const matchedUsers = await User.find({
                $or: [{ name: regex }, { username: regex }, { email: regex }]
            }).select('_id').lean();
            const matchedUserIds = matchedUsers.map(u => u._id);

            query.$or = [
                { title: regex },
                { createdBy: { $in: matchedUserIds } },
                { host: { $in: matchedUserIds } }
            ];
        }

        if (status && status !== 'all' && status.trim() !== '') {
            query.status = status.trim();
        }
        if (contestType && contestType !== 'all' && contestType.trim() !== '') {
            query.contestType = contestType.trim();
        }

        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [contests, total] = await Promise.all([
            Contest.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('createdBy', 'name username email')
                .populate('host', 'name username email')
                .populate('disabledBy', 'name username email')
                .lean(),
            Contest.countDocuments(query)
        ]);

        const contestIds = contests.map(c => c._id);
        const [registrationCounts, submissionCounts] = await Promise.all([
            ContestRegistration.aggregate([
                { $match: { contest: { $in: contestIds } } },
                { $group: { _id: '$contest', count: { $sum: 1 } } }
            ]),
            ContestSubmission.aggregate([
                { $match: { contest: { $in: contestIds } } },
                { $group: { _id: '$contest', count: { $sum: 1 } } }
            ])
        ]);

        const regMap = {};
        for (const item of registrationCounts) regMap[item._id.toString()] = item.count;
        const subMap = {};
        for (const item of submissionCounts) subMap[item._id.toString()] = item.count;

        const enhancedContests = contests.map(c => ({
            ...c,
            registeredCount: regMap[c._id.toString()] || 0,
            submissionsCount: subMap[c._id.toString()] || 0,
            problemsCount: c.problems?.length || 0
        }));

        return res.json({
            success: true,
            contests: enhancedContests,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching admin contests:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests
 * Create a new contest
 */
adminContestController.createContest = async (req, res) => {
    try {
        const Contest = mongoose.model('Contest');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const ProblemList = mongoose.model('ProblemList');

        const {
            title,
            slug,
            description,
            detailedDescription,
            banner,
            contestType = 'public',
            difficulty = 'All Levels',
            status = 'draft',
            visibility = 'public',
            startTime,
            endTime,
            registrationOpenAt,
            registrationCloseAt,
            timezone = 'Asia/Kolkata',
            rules,
            prize,
            accessCode,
            maxParticipants = 0,
            allowedLanguages,
            problems = [],
            scoringConfig,
            leaderboardVisibility = 'always'
        } = req.body;

        // Validation
        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Contest title is required' });
        }
        if (!description || !description.trim()) {
            return res.status(400).json({ success: false, message: 'Short description is required' });
        }
        if (!startTime || !endTime) {
            return res.status(400).json({ success: false, message: 'Start time and end time are required' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid start or end date format' });
        }

        if (end <= start) {
            return res.status(400).json({ success: false, message: 'End time must be later than start time' });
        }

        if (registrationCloseAt && new Date(registrationCloseAt) > end) {
            return res.status(400).json({ success: false, message: 'Registration closing time cannot be later than contest end time' });
        }

        // Slug generation / check
        const cleanSlug = (slug || title)
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const existingSlug = await Contest.findOne({ slug: cleanSlug });
        if (existingSlug) {
            return res.status(400).json({ success: false, message: 'A contest with this slug or title already exists' });
        }

        // Validate problems exist
        if (problems.length > 0) {
            const probIds = problems.map(p => p.problem);
            const foundCount = await ProblemList.countDocuments({ _id: { $in: probIds } });
            if (foundCount !== probIds.length) {
                return res.status(400).json({ success: false, message: 'One or more assigned problems were not found' });
            }
        }

        const contest = new Contest({
            title: title.trim(),
            slug: cleanSlug,
            description: description.trim(),
            detailedDescription: detailedDescription || '',
            banner: banner || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
            contestType,
            difficulty,
            status,
            visibility,
            startTime: start,
            endTime: end,
            registrationOpenAt: registrationOpenAt ? new Date(registrationOpenAt) : null,
            registrationCloseAt: registrationCloseAt ? new Date(registrationCloseAt) : null,
            timezone,
            rules: rules || '1. No plagiarism allowed.\n2. Submissions after contest end will not be counted towards rank.\n3. Each wrong attempt on a problem before solve may incur penalty minutes.',
            prize: prize || 'Top rankers win CoderHaveli badges & community recognition!',
            accessCode: accessCode?.trim() || null,
            maxParticipants: parseInt(maxParticipants) || 0,
            allowedLanguages: allowedLanguages || ['javascript', 'python', 'cpp', 'java'],
            problems: problems.map((p, idx) => ({
                problem: p.problem,
                points: p.points || 100,
                order: p.order || (idx + 1)
            })),
            scoringConfig: {
                wrongPenalty: scoringConfig?.wrongPenalty !== undefined ? scoringConfig.wrongPenalty : 10,
                partialScoring: !!scoringConfig?.partialScoring,
                tieBreaker: scoringConfig?.tieBreaker || 'penalty_then_time'
            },
            leaderboardVisibility,
            createdBy: req.user._id,
            publishedAt: status !== 'draft' ? new Date() : null
        });

        await contest.save();

        // Audit log
        await ContestAuditLog.create({
            contest: contest._id,
            actor: req.user._id,
            action: 'CREATED',
            newState: contest.toObject(),
            reason: 'Contest created via admin dashboard',
            timestamp: new Date()
        });

        // If scheduled or published, schedule background transitions
        if (contest.status === 'scheduled') {
            await contestScheduler.scheduleContestLifecycle(contest);
        }

        return res.status(201).json({
            success: true,
            message: 'Contest created successfully',
            contest
        });
    } catch (error) {
        console.error('Create contest error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests/:contestId
 * Get detailed contest info for admin editing
 */
adminContestController.getAdminContestById = async (req, res) => {
    try {
        const Contest = mongoose.model('Contest');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { contestId } = req.params;

        const contest = await Contest.findById(contestId)
            .populate('createdBy', 'name username email')
            .populate('problems.problem', 'quesId quesName difficulty tags')
            .lean();

        if (!contest) {
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }

        const auditLogs = await ContestAuditLog.find({ contest: contestId })
            .sort({ timestamp: -1 })
            .limit(20)
            .populate('actor', 'name username')
            .lean();

        return res.json({
            success: true,
            contest,
            auditLogs
        });
    } catch (error) {
        console.error('Error fetching admin contest by id:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * PATCH /api/admin/contests/:contestId
 * Update contest configuration
 */
adminContestController.updateContest = async (req, res) => {
    try {
        const Contest = mongoose.model('Contest');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { contestId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(contestId)) {
            return res.status(400).json({ success: false, message: 'Invalid contest ID format' });
        }

        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }

        const previousState = contest.toObject();
        const updates = req.body;

        // Validation for live contests
        if (contest.status === 'live') {
            if (updates.startTime && new Date(updates.startTime) > new Date()) {
                return res.status(400).json({ success: false, message: 'Cannot move start time of a live contest to the future' });
            }
        }

        // Validate time relation if updating dates
        const newStart = updates.startTime ? new Date(updates.startTime) : contest.startTime;
        const newEnd = updates.endTime ? new Date(updates.endTime) : contest.endTime;

        if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid start or end date format' });
        }

        if (newEnd <= newStart) {
            return res.status(400).json({ success: false, message: 'End time must be later than start time' });
        }

        // Validate slug uniqueness if updated
        if (updates.slug && updates.slug.trim()) {
            const cleanSlug = updates.slug
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const existingSlug = await Contest.findOne({ slug: cleanSlug, _id: { $ne: contestId } });
            if (existingSlug) {
                return res.status(400).json({ success: false, message: 'A contest with this slug already exists' });
            }
            contest.slug = cleanSlug;
        }

        // Apply allowed fields
        const fields = [
            'title', 'description', 'detailedDescription', 'banner', 'contestType',
            'difficulty', 'visibility', 'timezone', 'rules', 'prize',
            'maxParticipants', 'allowedLanguages', 'scoringConfig', 'leaderboardVisibility'
        ];

        for (const f of fields) {
            if (updates[f] !== undefined) {
                contest[f] = updates[f];
            }
        }

        // Handle private contest access code
        if (updates.contestType !== undefined) {
            if (updates.contestType === 'private') {
                contest.accessCode = updates.accessCode ? updates.accessCode.trim() : contest.accessCode;
            } else {
                contest.accessCode = null;
            }
        } else if (contest.contestType === 'private' && updates.accessCode !== undefined) {
            contest.accessCode = updates.accessCode ? updates.accessCode.trim() : null;
        }

        // Handle status update and lifecycle timestamps
        if (updates.status && updates.status !== previousState.status) {
            contest.status = updates.status;
            const now = new Date();
            if (updates.status === 'live' && !contest.startedAt) {
                contest.startedAt = now;
            } else if (updates.status === 'ended' && !contest.endedAt) {
                contest.endedAt = now;
            } else if (updates.status === 'cancelled') {
                contest.cancelledAt = now;
                contest.cancellationReason = updates.cancellationReason || 'Cancelled by admin';
            } else if (updates.status === 'scheduled' && !contest.publishedAt) {
                contest.publishedAt = now;
            }
        }

        if (updates.startTime) contest.startTime = newStart;
        if (updates.endTime) contest.endTime = newEnd;

        if (updates.registrationOpenAt !== undefined) {
            contest.registrationOpenAt = updates.registrationOpenAt ? new Date(updates.registrationOpenAt) : null;
        }

        if (updates.registrationCloseAt !== undefined) {
            if (updates.registrationCloseAt) {
                const regClose = new Date(updates.registrationCloseAt);
                if (regClose > newEnd) {
                    return res.status(400).json({ success: false, message: 'Registration closing time cannot be later than contest end time' });
                }
                contest.registrationCloseAt = regClose;
            } else {
                contest.registrationCloseAt = null;
            }
        }

        if (updates.problems && Array.isArray(updates.problems)) {
            const validProblems = updates.problems.filter(p => p && (p.problem || p._id));
            contest.problems = validProblems.map((p, idx) => ({
                problem: p.problem?._id || p.problem || p._id,
                points: parseInt(p.points) || 100,
                order: p.order || (idx + 1)
            }));
        }

        await contest.save();

        // Audit log
        await ContestAuditLog.create({
            contest: contest._id,
            actor: req.user._id,
            action: 'UPDATED',
            previousState,
            newState: contest.toObject(),
            reason: updates.auditReason || 'Contest updated by administrator',
            timestamp: new Date()
        });

        // Reschedule jobs if contest is scheduled or live
        if (contest.status === 'scheduled' || contest.status === 'live') {
            await contestScheduler.scheduleContestLifecycle(contest);
        }

        return res.json({
            success: true,
            message: 'Contest updated successfully',
            contest
        });
    } catch (error) {
        console.error('Update contest error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/:contestId/publish
 * Transition draft -> scheduled/published
 */
adminContestController.publishContest = async (req, res) => {
    try {
        const Contest = mongoose.model('Contest');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { contestId } = req.params;

        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }

        if (contest.problems.length === 0) {
            return res.status(400).json({ success: false, message: 'Cannot publish a contest without any assigned problems' });
        }

        const now = new Date();
        const prev = contest.status;

        // If start time is already in the past, transition directly to live; otherwise scheduled
        if (new Date(contest.startTime) <= now) {
            contest.status = 'live';
            contest.startedAt = now;
        } else {
            contest.status = 'scheduled';
        }

        contest.publishedAt = now;
        await contest.save();

        await ContestAuditLog.create({
            contest: contest._id,
            actor: req.user._id,
            action: 'PUBLISHED',
            previousState: { status: prev },
            newState: { status: contest.status, publishedAt: now },
            reason: 'Contest published by administrator',
            timestamp: now
        });

        await contestScheduler.scheduleContestLifecycle(contest);

        return res.json({
            success: true,
            message: `Contest successfully published and set to ${contest.status}`,
            contest
        });
    } catch (error) {
        console.error('Publish contest error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/:contestId/start
 * Manually start contest now
 */
adminContestController.startContest = async (req, res) => {
    try {
        const { contestId } = req.params;
        const contest = await contestScheduler.startContestManually(contestId, req.user._id);

        return res.json({
            success: true,
            message: 'Contest has been started manually and is now LIVE',
            contest
        });
    } catch (error) {
        console.error('Manual start error:', error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/admin/contests/:contestId/end
 * Manually end contest now
 */
adminContestController.endContest = async (req, res) => {
    try {
        const { contestId } = req.params;
        const contest = await contestScheduler.endContestManually(contestId, req.user._id);

        return res.json({
            success: true,
            message: 'Contest has been manually ended',
            contest
        });
    } catch (error) {
        console.error('Manual end error:', error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/admin/contests/:contestId/cancel
 * Cancel contest with reason
 */
adminContestController.cancelContest = async (req, res) => {
    try {
        const { contestId } = req.params;
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'A recorded cancellation reason is required' });
        }

        const contest = await contestScheduler.cancelContestManually(contestId, req.user._id, reason.trim());

        return res.json({
            success: true,
            message: 'Contest has been cancelled',
            contest
        });
    } catch (error) {
        console.error('Cancel contest error:', error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/admin/contests/:contestId/duplicate
 * Duplicate existing contest into a new draft
 */
adminContestController.duplicateContest = async (req, res) => {
    try {
        const Contest = mongoose.model('Contest');
        const { contestId } = req.params;

        const source = await Contest.findById(contestId);
        if (!source) {
            return res.status(404).json({ success: false, message: 'Source contest not found' });
        }

        const copyTitle = `${source.title} (Copy)`;
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        const copySlug = `${source.slug}-copy-${randomSuffix}`;

        const duplicated = new Contest({
            ...source.toObject(),
            _id: new mongoose.Types.ObjectId(),
            title: copyTitle,
            slug: copySlug,
            status: 'draft',
            publishedAt: null,
            startedAt: null,
            endedAt: null,
            cancelledAt: null,
            cancellationReason: '',
            resultsPublishedAt: null,
            createdBy: req.user._id,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await duplicated.save();

        return res.status(201).json({
            success: true,
            message: 'Contest duplicated as draft',
            contest: duplicated
        });
    } catch (error) {
        console.error('Duplicate contest error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * DELETE /api/admin/contests/:contestId
 * Delete contest if no submissions exist
 */
adminContestController.deleteContest = async (req, res) => {
    try {
        const Contest = mongoose.model('Contest');
        const ContestSubmission = mongoose.model('ContestSubmission');
        const ContestRegistration = mongoose.model('ContestRegistration');
        const ContestScore = mongoose.model('ContestScore');
        const { contestId } = req.params;

        const subCount = await ContestSubmission.countDocuments({ contest: contestId });
        if (subCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Data Retention Policy: Cannot delete contest with ${subCount} recorded submissions. You may cancel it instead.`
            });
        }

        await Promise.all([
            Contest.findByIdAndDelete(contestId),
            ContestRegistration.deleteMany({ contest: contestId }),
            ContestScore.deleteMany({ contest: contestId }),
            contestScheduler.cancelContestLifecycle(contestId)
        ]);

        return res.json({
            success: true,
            message: 'Contest and related records deleted successfully'
        });
    } catch (error) {
        console.error('Delete contest error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests/:contestId/participants
 * List participants with search, score, and rank
 */
adminContestController.getContestParticipants = async (req, res) => {
    try {
        const ContestRegistration = mongoose.model('ContestRegistration');
        const ContestScore = mongoose.model('ContestScore');
        const ContestSubmission = mongoose.model('ContestSubmission');

        const { contestId } = req.params;
        const { search = '', status = 'all', page = 1, limit = 20 } = req.query;

        const query = { contest: contestId };
        if (status !== 'all') {
            query.participationStatus = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let registrations = await ContestRegistration.find(query)
            .sort({ registeredAt: -1 })
            .populate('user', 'name username email avatar')
            .lean();

        if (search.trim()) {
            const s = search.toLowerCase().trim();
            registrations = registrations.filter(r =>
                r.user?.name?.toLowerCase().includes(s) ||
                r.user?.username?.toLowerCase().includes(s) ||
                r.user?.email?.toLowerCase().includes(s)
            );
        }

        const total = registrations.length;
        const paginated = registrations.slice(skip, skip + parseInt(limit));

        // Attach score and submission count
        const userIds = paginated.map(p => p.user?._id).filter(Boolean);
        const [scores, subCounts] = await Promise.all([
            ContestScore.find({ contest: contestId, user: { $in: userIds } }).lean(),
            ContestSubmission.aggregate([
                { $match: { contest: new mongoose.Types.ObjectId(contestId), user: { $in: userIds } } },
                { $group: { _id: '$user', count: { $sum: 1 } } }
            ])
        ]);

        const scoreMap = {};
        for (const sc of scores) scoreMap[sc.user.toString()] = sc;
        const subCountMap = {};
        for (const item of subCounts) subCountMap[item._id.toString()] = item.count;

        const result = paginated.map(p => {
            const sc = scoreMap[p.user?._id.toString()];
            return {
                ...p,
                totalScore: sc?.totalScore || 0,
                problemsSolved: sc?.problemsSolved || 0,
                penaltyTime: sc?.penaltyTime || 0,
                rank: sc?.rank || '-',
                submissionCount: subCountMap[p.user?._id.toString()] || 0,
                isDisqualified: p.participationStatus === 'disqualified' || sc?.disqualified
            };
        });

        return res.json({
            success: true,
            participants: result,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching participants:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/:contestId/disqualify
 * Disqualify a participant with required reason
 */
adminContestController.disqualifyParticipant = async (req, res) => {
    try {
        const ContestRegistration = mongoose.model('ContestRegistration');
        const ContestScore = mongoose.model('ContestScore');
        const ContestAuditLog = mongoose.model('ContestAuditLog');

        const { contestId } = req.params;
        const { userId, reason } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        if (!reason || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'Disqualification reason is required' });
        }

        const now = new Date();

        // Update registration record
        await ContestRegistration.findOneAndUpdate(
            { contest: contestId, user: userId },
            {
                $set: {
                    participationStatus: 'disqualified',
                    disqualificationReason: reason.trim(),
                    disqualifiedAt: now
                }
            }
        );

        // Update score record: set disqualified = true without deleting submission history
        await ContestScore.findOneAndUpdate(
            { contest: contestId, user: userId },
            {
                $set: {
                    disqualified: true,
                    rank: 0
                }
            }
        );

        // Re-calculate ranks for remaining participants
        await contestScoringService.updateContestRanks(contestId);

        // Audit log
        await ContestAuditLog.create({
            contest: contestId,
            actor: req.user._id,
            action: 'DISQUALIFY_PARTICIPANT',
            reason: reason.trim(),
            metadata: { disqualifiedUserId: userId },
            timestamp: now
        });

        return res.json({
            success: true,
            message: 'Participant has been disqualified and contest ranks updated'
        });
    } catch (error) {
        console.error('Disqualify error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests/:contestId/submissions
 * Inspect all submissions in a contest with filters and code viewing
 */
adminContestController.getContestSubmissions = async (req, res) => {
    try {
        const ContestSubmission = mongoose.model('ContestSubmission');
        const { contestId } = req.params;
        const { problemId, verdict, search = '', page = 1, limit = 20 } = req.query;

        const query = { contest: contestId };
        if (problemId && problemId !== 'all') {
            query.problem = problemId;
        }
        if (verdict && verdict !== 'all') {
            query.verdict = verdict;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [submissions, total] = await Promise.all([
            ContestSubmission.find(query)
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('user', 'name username email avatar')
                .populate('problem', 'quesName difficulty')
                .lean(),
            ContestSubmission.countDocuments(query)
        ]);

        return res.json({
            success: true,
            submissions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/:contestId/publish-results
 * Finalize and publish results
 */
adminContestController.publishResults = async (req, res) => {
    try {
        const Contest = mongoose.model('Contest');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { contestId } = req.params;

        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }

        // Re-verify ranks before finalizing
        await contestScoringService.updateContestRanks(contestId);

        const now = new Date();
        contest.resultsPublishedAt = now;
        await contest.save();

        await ContestAuditLog.create({
            contest: contest._id,
            actor: req.user._id,
            action: 'RESULTS_PUBLISHED',
            reason: 'Official contest results finalized and published',
            timestamp: now
        });

        return res.json({
            success: true,
            message: 'Official contest results published successfully',
            resultsPublishedAt: now
        });
    } catch (error) {
        console.error('Publish results error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/:contestId/rebuild-leaderboard
 * Rebuild leaderboard from persistent submissions
 */
adminContestController.rebuildLeaderboard = async (req, res) => {
    try {
        const { contestId } = req.params;
        const result = await contestScoringService.rebuildContestLeaderboard(contestId);
        return res.json({
            success: true,
            message: 'Contest leaderboard successfully rebuilt from submissions',
            ...result
        });
    } catch (error) {
        console.error('Rebuild leaderboard error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/:contestId/disable
 * Admin disables / bans any contest (public or private)
 */
adminContestController.disableContest = async (req, res) => {
    try {
        const Contest = mongoose.model('Contest');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { contestId } = req.params;
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'A reason is required to disable this contest' });
        }

        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }

        if (contest.status === 'disabled') {
            return res.status(400).json({ success: false, message: 'Contest is already disabled' });
        }

        const previousState = { status: contest.status };
        const now = new Date();

        contest.status = 'disabled';
        contest.disabledAt = now;
        contest.disabledBy = req.user._id;
        contest.disabledReason = reason.trim();
        await contest.save();

        await ContestAuditLog.create({
            contest: contest._id,
            actor: req.user._id,
            action: 'DISABLE_CONTEST',
            previousState,
            newState: { status: 'disabled', disabledReason: reason.trim() },
            reason: reason.trim(),
            timestamp: now
        });

        return res.json({
            success: true,
            message: 'Contest has been disabled successfully. Participation and submissions are now blocked.',
            contest
        });
    } catch (error) {
        console.error('Error disabling contest:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/:contestId/restore
 * Admin restores a previously disabled contest
 */
adminContestController.restoreContest = async (req, res) => {
    try {
        const Contest = mongoose.model('Contest');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { contestId } = req.params;
        const { reason = 'Restored by administrator' } = req.body;

        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }

        if (contest.status !== 'disabled') {
            return res.status(400).json({ success: false, message: 'Contest is not disabled' });
        }

        const now = new Date();
        let targetStatus = 'scheduled';
        if (now < contest.startTime) {
            targetStatus = 'scheduled';
        } else if (now >= contest.startTime && now <= contest.endTime) {
            targetStatus = 'live';
        } else {
            targetStatus = 'ended';
        }

        const previousState = { status: contest.status, disabledReason: contest.disabledReason };

        contest.status = targetStatus;
        contest.disabledAt = null;
        contest.disabledBy = null;
        contest.disabledReason = '';
        await contest.save();

        await ContestAuditLog.create({
            contest: contest._id,
            actor: req.user._id,
            action: 'RESTORE_CONTEST',
            previousState,
            newState: { status: targetStatus },
            reason: reason.trim(),
            timestamp: now
        });

        return res.json({
            success: true,
            message: `Contest restored successfully to status: ${targetStatus}`,
            contest
        });
    } catch (error) {
        console.error('Error restoring contest:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests/passes/plans
 * Get all contest pass plans for admin management
 */
adminContestController.getAdminPassPlans = async (req, res) => {
    try {
        const ContestPassPlan = mongoose.model('ContestPassPlan');
        const plans = await ContestPassPlan.find().sort({ price: 1 }).lean();
        return res.json({ success: true, plans });
    } catch (error) {
        console.error('Error getting admin pass plans:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/passes/plans
 * Admin creates a new contest pass plan
 */
adminContestController.createAdminPassPlan = async (req, res) => {
    try {
        const ContestPassPlan = mongoose.model('ContestPassPlan');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { name, planCode, slug, price, participantLimit, validityDays, isActive, description, features } = req.body;

        if (!name || price === undefined || participantLimit === undefined) {
            return res.status(400).json({ success: false, message: 'Name, price, and participantLimit are required' });
        }

        const planSlug = (slug || planCode || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim().toLowerCase();
        const existing = await ContestPassPlan.findOne({ slug: planSlug });
        if (existing) {
            return res.status(400).json({ success: false, message: `Plan with slug "${planSlug}" already exists` });
        }

        const plan = await ContestPassPlan.create({
            name: name.trim(),
            slug: planSlug,
            price: Number(price),
            participantLimit: Number(participantLimit),
            validityDays: Number(validityDays || 30),
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            description: description || '',
            features: Array.isArray(features) ? features : []
        });

        await ContestAuditLog.create({
            actor: req.user._id,
            action: 'CREATE_PASS_PLAN',
            newState: plan.toObject(),
            reason: `Admin created pass plan: ${plan.name}`,
            timestamp: new Date()
        });

        return res.status(201).json({ success: true, message: 'Pass plan created successfully', plan });
    } catch (error) {
        console.error('Error creating pass plan:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * PUT /api/admin/contests/passes/plans/:planId
 * Admin updates an existing contest pass plan
 */
adminContestController.updateAdminPassPlan = async (req, res) => {
    try {
        const ContestPassPlan = mongoose.model('ContestPassPlan');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { planId } = req.params;
        const updates = req.body;

        const plan = await ContestPassPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Pass plan not found' });
        }

        const previousState = plan.toObject();

        if (updates.name !== undefined) plan.name = updates.name.trim();
        if (updates.price !== undefined) plan.price = Number(updates.price);
        if (updates.participantLimit !== undefined) plan.participantLimit = Number(updates.participantLimit);
        if (updates.validityDays !== undefined) plan.validityDays = Number(updates.validityDays);
        if (updates.isActive !== undefined) plan.isActive = Boolean(updates.isActive);
        if (updates.description !== undefined) plan.description = updates.description;
        if (updates.features !== undefined && Array.isArray(updates.features)) plan.features = updates.features;

        await plan.save();

        await ContestAuditLog.create({
            actor: req.user._id,
            action: 'UPDATE_PASS_PLAN',
            previousState,
            newState: plan.toObject(),
            reason: `Admin updated pass plan: ${plan.name}`,
            timestamp: new Date()
        });

        return res.json({ success: true, message: 'Pass plan updated successfully', plan });
    } catch (error) {
        console.error('Error updating pass plan:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests/passes/purchases
 * View all contest pass purchases with pagination and search
 */
adminContestController.getAdminPassPurchases = async (req, res) => {
    try {
        const ContestPassPurchase = mongoose.model('ContestPassPurchase');
        const User = mongoose.model('User');
        const { status = 'all', search = '', page = 1, limit = 15 } = req.query;

        const query = {};
        if (status && status !== 'all') {
            query.status = status;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            const matchedUsers = await User.find({
                $or: [{ name: regex }, { username: regex }, { email: regex }]
            }).select('_id').lean();
            const matchedUserIds = matchedUsers.map(u => u._id);

            query.$or = [
                { paymentOrderId: regex },
                { paymentId: regex },
                { user: { $in: matchedUserIds } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [purchases, total] = await Promise.all([
            ContestPassPurchase.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('user', 'name username email avatar')
                .populate('plan')
                .populate('contest', 'title slug')
                .lean(),
            ContestPassPurchase.countDocuments(query)
        ]);

        return res.json({
            success: true,
            purchases,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching admin pass purchases:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests/passes/summary
 * Revenue and metrics for contest pass purchases
 */
adminContestController.getAdminPassPurchasesSummary = async (req, res) => {
    try {
        const ContestPassPurchase = mongoose.model('ContestPassPurchase');
        const [totalCount, completedCount, revenueAgg] = await Promise.all([
            ContestPassPurchase.countDocuments(),
            ContestPassPurchase.countDocuments({ status: 'completed' }),
            ContestPassPurchase.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
            ])
        ]);

        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

        return res.json({
            success: true,
            summary: {
                totalPurchases: totalCount,
                completedPurchases: completedCount,
                totalRevenue
            }
        });
    } catch (error) {
        console.error('Error fetching pass summary:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/passes/grant
 * Admin manually grants a pass to a user
 */
adminContestController.manuallyGrantPass = async (req, res) => {
    try {
        const ContestPassPurchase = mongoose.model('ContestPassPurchase');
        const ContestPassPlan = mongoose.model('ContestPassPlan');
        const User = mongoose.model('User');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { userId, planId, reason } = req.body;

        if (!userId || !planId) {
            return res.status(400).json({ success: false, message: 'userId and planId are required' });
        }

        const [user, plan] = await Promise.all([
            User.findById(userId),
            ContestPassPlan.findById(planId)
        ]);

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (!plan) return res.status(404).json({ success: false, message: 'Pass plan not found' });

        const now = new Date();
        const expiresAt = new Date(now.getTime() + (plan.validityDays || 30) * 24 * 60 * 60 * 1000);

        const purchase = await ContestPassPurchase.create({
            user: user._id,
            plan: plan._id,
            planSnapshot: {
                name: plan.name,
                participantLimit: plan.participantLimit,
                price: plan.price,
                currency: plan.currency || 'INR'
            },
            paymentGateway: 'manual_admin_grant',
            paymentOrderId: `manual_order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            paymentId: `manual_pay_${Date.now()}`,
            amount: 0,
            currency: 'INR',
            status: 'completed',
            participantLimitGranted: plan.participantLimit,
            purchasedAt: now,
            expiresAt,
            grantedByAdmin: true,
            adminNote: reason || 'Manual grant by administrator'
        });

        await ContestAuditLog.create({
            actor: req.user._id,
            action: 'MANUAL_GRANT_PASS',
            newState: purchase.toObject(),
            reason: reason || `Admin granted ${plan.name} to ${user.username}`,
            timestamp: now
        });

        return res.json({
            success: true,
            message: `Successfully granted ${plan.name} to user ${user.username}`,
            purchase
        });
    } catch (error) {
        console.error('Error manually granting pass:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/passes/revoke/:purchaseId
 * Admin manually revokes a pass
 */
adminContestController.manuallyRevokePass = async (req, res) => {
    try {
        const ContestPassPurchase = mongoose.model('ContestPassPurchase');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { purchaseId } = req.params;
        const { reason = 'Revoked by administrator' } = req.body;

        const purchase = await ContestPassPurchase.findById(purchaseId);
        if (!purchase) {
            return res.status(404).json({ success: false, message: 'Purchase record not found' });
        }

        const previousState = { status: purchase.status };
        purchase.status = 'revoked';
        await purchase.save();

        await ContestAuditLog.create({
            actor: req.user._id,
            action: 'MANUAL_REVOKE_PASS',
            previousState,
            newState: { status: 'revoked' },
            reason: reason.trim(),
            timestamp: new Date()
        });

        return res.json({
            success: true,
            message: 'Contest pass revoked successfully',
            purchase
        });
    } catch (error) {
        console.error('Error revoking pass:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests/audit-logs/all
 * View admin audit logs with pagination and filters
 */
adminContestController.getAdminAuditLogs = async (req, res) => {
    try {
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const { contestId, action, page = 1, limit = 20 } = req.query;

        const query = {};
        if (contestId) query.contest = contestId;
        if (action && action !== 'all') query.action = action;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [logs, total] = await Promise.all([
            ContestAuditLog.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('actor', 'name username email')
                .populate('contest', 'title slug')
                .lean(),
            ContestAuditLog.countDocuments(query)
        ]);

        return res.json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching admin audit logs:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests/scheduler/config
 * Get weekly contest scheduler configuration and next execution schedule
 */
adminContestController.getWeeklySchedulerConfig = async (req, res) => {
    try {
        const config = await weeklyContestService.getConfig();
        const schedule = weeklyContestService.computeNextSchedule(config);
        return res.json({
            success: true,
            config,
            nextSchedule: schedule
        });
    } catch (error) {
        console.error('Error fetching weekly scheduler config:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * PUT /api/admin/contests/scheduler/config
 * Update weekly contest scheduler configuration
 */
adminContestController.updateWeeklySchedulerConfig = async (req, res) => {
    try {
        const updatedConfig = await weeklyContestService.updateConfig(req.body, req.user._id);
        const nextSchedule = weeklyContestService.computeNextSchedule(updatedConfig);
        return res.json({
            success: true,
            message: 'Weekly contest scheduler settings updated successfully',
            config: updatedConfig,
            nextSchedule
        });
    } catch (error) {
        console.error('Error updating weekly scheduler config:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/scheduler/pause
 * Pause weekly contest scheduler
 */
adminContestController.pauseWeeklyScheduler = async (req, res) => {
    try {
        const config = await weeklyContestService.pauseScheduler(req.user._id);
        return res.json({
            success: true,
            message: 'Weekly contest automatic generation has been paused',
            config
        });
    } catch (error) {
        console.error('Error pausing weekly scheduler:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/scheduler/resume
 * Resume weekly contest scheduler
 */
adminContestController.resumeWeeklyScheduler = async (req, res) => {
    try {
        const config = await weeklyContestService.resumeScheduler(req.user._id);
        const nextSchedule = weeklyContestService.computeNextSchedule(config);
        return res.json({
            success: true,
            message: 'Weekly contest automatic generation has been resumed',
            config,
            nextSchedule
        });
    } catch (error) {
        console.error('Error resuming weekly scheduler:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests/scheduler/preview
 * Preview selected questions and schedule for next weekly contest
 */
adminContestController.previewWeeklyContest = async (req, res) => {
    try {
        const preview = await weeklyContestService.previewWeeklyContest();
        return res.json({
            success: true,
            preview
        });
    } catch (error) {
        console.error('Error previewing weekly contest:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/admin/contests/scheduler/trigger
 * Manually trigger weekly contest generation immediately
 */
adminContestController.triggerWeeklyContest = async (req, res) => {
    try {
        const result = await weeklyContestService.generateWeeklyContest({ manual: true, adminUser: req.user });
        return res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error triggering weekly contest:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/admin/contests/scheduler/history
 * View previously generated weekly contests
 */
adminContestController.getWeeklyContestsHistory = async (req, res) => {
    try {
        const Contest = mongoose.model('Contest');
        const { page = 1, limit = 10 } = req.query;

        const query = {
            $or: [
                { weeklyIdentifier: { $exists: true, $ne: null } },
                { generatedBy: 'scheduler' }
            ]
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [contests, total] = await Promise.all([
            Contest.find(query)
                .sort({ startTime: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('createdBy', 'name username email')
                .lean(),
            Contest.countDocuments(query)
        ]);

        return res.json({
            success: true,
            contests,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching weekly contests history:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = adminContestController;
