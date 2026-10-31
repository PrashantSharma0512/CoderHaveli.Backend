const mongoose = require('mongoose');

class WeeklyContestService {
    /**
     * Get or initialize the singleton weekly contest configuration
     */
    async getConfig() {
        const WeeklyContestConfig = mongoose.model('WeeklyContestConfig');
        let config = await WeeklyContestConfig.findOne();
        if (!config) {
            config = await WeeklyContestConfig.create({
                isEnabled: true,
                isPaused: false,
                dayOfWeek: 0, // Sunday
                startTime: '11:00',
                endTime: '12:00',
                durationMinutes: 60,
                timezone: 'Asia/Kolkata',
                titleTemplate: 'CoderHaveli Weekly Contest #{weekNumber}',
                descriptionTemplate: 'Welcome to CoderHaveli Weekly Public Coding Contest! Solve 3 algorithmic challenges (Easy, Medium, Hard) within 60 minutes.',
                lastExecutionStatus: 'idle'
            });
        }
        return config;
    }

    /**
     * Update configuration
     */
    async updateConfig(updates, adminUserId = null) {
        const WeeklyContestConfig = mongoose.model('WeeklyContestConfig');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const config = await this.getConfig();

        const previousState = config.toObject();

        if (updates.isEnabled !== undefined) config.isEnabled = Boolean(updates.isEnabled);
        if (updates.isPaused !== undefined) config.isPaused = Boolean(updates.isPaused);
        if (updates.dayOfWeek !== undefined) config.dayOfWeek = Number(updates.dayOfWeek);
        if (updates.startTime !== undefined) config.startTime = updates.startTime.trim();
        if (updates.endTime !== undefined) config.endTime = updates.endTime.trim();
        if (updates.durationMinutes !== undefined) config.durationMinutes = Number(updates.durationMinutes);
        if (updates.timezone !== undefined) config.timezone = updates.timezone.trim();
        if (updates.titleTemplate !== undefined) config.titleTemplate = updates.titleTemplate.trim();
        if (updates.descriptionTemplate !== undefined) config.descriptionTemplate = updates.descriptionTemplate.trim();

        // Recompute nextExecutionAt
        const schedule = this.computeNextSchedule(config);
        config.nextExecutionAt = schedule.startTime;

        await config.save();

        if (adminUserId) {
            await ContestAuditLog.create({
                actor: adminUserId,
                action: 'UPDATE_WEEKLY_SCHEDULER_CONFIG',
                previousState,
                newState: config.toObject(),
                reason: 'Admin updated weekly contest scheduler settings',
                timestamp: new Date()
            });
        }

        return config;
    }

    /**
     * Pause weekly contest scheduler
     */
    async pauseScheduler(adminUserId = null) {
        const config = await this.getConfig();
        config.isPaused = true;
        config.lastExecutionStatus = 'paused';
        await config.save();

        if (adminUserId) {
            const ContestAuditLog = mongoose.model('ContestAuditLog');
            await ContestAuditLog.create({
                actor: adminUserId,
                action: 'PAUSE_WEEKLY_SCHEDULER',
                reason: 'Admin paused weekly contest automatic creation',
                timestamp: new Date()
            });
        }

        return config;
    }

    /**
     * Resume weekly contest scheduler
     */
    async resumeScheduler(adminUserId = null) {
        const config = await this.getConfig();
        config.isPaused = false;
        config.lastExecutionStatus = 'idle';
        const schedule = this.computeNextSchedule(config);
        config.nextExecutionAt = schedule.startTime;
        await config.save();

        if (adminUserId) {
            const ContestAuditLog = mongoose.model('ContestAuditLog');
            await ContestAuditLog.create({
                actor: adminUserId,
                action: 'RESUME_WEEKLY_SCHEDULER',
                reason: 'Admin resumed weekly contest automatic creation',
                timestamp: new Date()
            });
        }

        return config;
    }

    /**
     * Calculate target schedule (in UTC) for the next weekly contest using Asia/Kolkata timezone
     * Target: upcoming Sunday (or configured day) at configured start and end time.
     */
    computeNextSchedule(config, refDate = new Date()) {
        const targetDay = config.dayOfWeek !== undefined ? config.dayOfWeek : 0; // 0 = Sunday
        const [startHour, startMin] = (config.startTime || '11:00').split(':').map(Number);
        const [endHour, endMin] = (config.endTime || '12:00').split(':').map(Number);

        // Convert reference UTC date to Asia/Kolkata date parts
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            weekday: 'short',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });

        // Determine current IST day and time
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(refDate.getTime() + istOffsetMs);
        const currentIstDay = istNow.getUTCDay();

        let daysUntilTarget = (targetDay - currentIstDay + 7) % 7;
        
        // If today is target day, check if end time has already passed in IST
        const currentIstMinutes = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
        const endMinutes = endHour * 60 + endMin;
        if (daysUntilTarget === 0 && currentIstMinutes >= endMinutes) {
            daysUntilTarget = 7;
        }

        // Target Date in IST (UTC representation of the target date)
        const targetIstDate = new Date(istNow.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);
        const targetYear = targetIstDate.getUTCFullYear();
        const targetMonth = targetIstDate.getUTCMonth();
        const targetDateNum = targetIstDate.getUTCDate();

        // Construct UTC timestamps (subtract 5 hours 30 mins from IST time)
        const startUtc = new Date(Date.UTC(targetYear, targetMonth, targetDateNum, startHour, startMin, 0) - istOffsetMs);
        const endUtc = new Date(Date.UTC(targetYear, targetMonth, targetDateNum, endHour, endMin, 0) - istOffsetMs);

        // Compute ISO week number for unique identifier
        const d = new Date(Date.UTC(targetYear, targetMonth, targetDateNum));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        const weeklyIdentifier = `weekly-${targetYear}-w${String(weekNo).padStart(2, '0')}`;

        return {
            startTime: startUtc,
            endTime: endUtc,
            duration: config.durationMinutes || 60,
            weekNumber: weekNo,
            year: targetYear,
            weeklyIdentifier,
            istFormattedDate: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDateNum).padStart(2, '0')}`
        };
    }

    /**
     * Automatically select 3 questions: 1 Easy, 1 Medium, 1 Hard
     * Excludes recentProblemIds from consecutive contests if alternative problems exist
     */
    async selectWeeklyProblems(recentProblemIds = []) {
        const ProblemList = mongoose.model('ProblemList');

        const selectByDifficulty = async (difficultyName, difficultyRegex) => {
            // First attempt: problems not in recentProblemIds
            let eligible = await ProblemList.find({
                difficulty: { $in: [difficultyName.toLowerCase(), difficultyName.charAt(0).toUpperCase() + difficultyName.slice(1).toLowerCase()] },
                _id: { $nin: recentProblemIds }
            }).lean();

            // Fallback: if all problems were in recentProblemIds, use all available
            if (!eligible || eligible.length === 0) {
                eligible = await ProblemList.find({
                    difficulty: { $in: [difficultyName.toLowerCase(), difficultyName.charAt(0).toUpperCase() + difficultyName.slice(1).toLowerCase()] }
                }).lean();
            }

            if (!eligible || eligible.length === 0) {
                throw new Error(`Insufficient problems in database: No eligible problem found for difficulty "${difficultyName}"`);
            }

            // Random selection
            const randomIndex = Math.floor(Math.random() * eligible.length);
            return eligible[randomIndex];
        };

        const [easyProblem, mediumProblem, hardProblem] = await Promise.all([
            selectByDifficulty('Easy'),
            selectByDifficulty('Medium'),
            selectByDifficulty('Hard')
        ]);

        return [
            {
                problem: easyProblem._id,
                quesId: easyProblem.quesId,
                title: easyProblem.quesName,
                difficulty: 'Easy',
                points: 100,
                order: 1
            },
            {
                problem: mediumProblem._id,
                quesId: mediumProblem.quesId,
                title: mediumProblem.quesName,
                difficulty: 'Medium',
                points: 200,
                order: 2
            },
            {
                problem: hardProblem._id,
                quesId: hardProblem.quesId,
                title: hardProblem.quesName,
                difficulty: 'Hard',
                points: 300,
                order: 3
            }
        ];
    }

    /**
     * Preview selected problems and schedule without saving to DB
     */
    async previewWeeklyContest() {
        const config = await this.getConfig();
        const schedule = this.computeNextSchedule(config);
        const problems = await this.selectWeeklyProblems(config.recentProblemIds || []);

        const title = (config.titleTemplate || 'CoderHaveli Weekly Contest #{weekNumber}')
            .replace('{weekNumber}', schedule.weekNumber)
            .replace('{year}', schedule.year);

        return {
            schedule,
            title,
            description: config.descriptionTemplate,
            problems,
            timezone: config.timezone
        };
    }

    /**
     * Generate or idempotently create weekly public contest
     */
    async generateWeeklyContest({ manual = false, adminUser = null } = {}) {
        const config = await this.getConfig();
        const Contest = mongoose.model('Contest');
        const User = mongoose.model('User');
        const ContestAuditLog = mongoose.model('ContestAuditLog');

        if (!manual) {
            if (!config.isEnabled) {
                return { success: false, reason: 'Scheduler is disabled in configuration' };
            }
            if (config.isPaused) {
                return { success: false, reason: 'Scheduler is paused by administrator' };
            }
        }

        const schedule = this.computeNextSchedule(config);

        // Check duplicate creation using unique weeklyIdentifier
        const existing = await Contest.findOne({ weeklyIdentifier: schedule.weeklyIdentifier });
        if (existing) {
            return {
                success: true,
                created: false,
                message: `Weekly contest "${existing.title}" already exists for ${schedule.weeklyIdentifier}`,
                contest: existing
            };
        }

        try {
            // Select questions
            const selectedProblems = await this.selectWeeklyProblems(config.recentProblemIds || []);

            // Identify host: adminUser or first available admin or system user
            let hostId = adminUser?._id;
            if (!hostId) {
                const adminAccount = await User.findOne({ role: 'admin' });
                hostId = adminAccount ? adminAccount._id : (await User.findOne())?._id;
            }

            const title = (config.titleTemplate || 'CoderHaveli Weekly Contest #{weekNumber}')
                .replace('{weekNumber}', schedule.weekNumber)
                .replace('{year}', schedule.year);

            const slug = `coderhaveli-weekly-contest-${schedule.weekNumber}-${Date.now()}`;

            const now = new Date();
            let initialStatus = 'scheduled';
            if (now >= schedule.startTime && now <= schedule.endTime) {
                initialStatus = 'live';
            } else if (now > schedule.endTime) {
                initialStatus = 'ended';
            }

            const contest = await Contest.create({
                title,
                slug,
                description: config.descriptionTemplate,
                contestType: 'public',
                status: initialStatus,
                host: hostId,
                createdBy: hostId,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                duration: schedule.duration,
                participantLimit: 999999, // unlimited public contest
                problems: selectedProblems.map(p => ({
                    problem: p.problem,
                    points: p.points,
                    order: p.order
                })),
                generatedBy: manual ? 'admin' : 'scheduler',
                weeklyIdentifier: schedule.weeklyIdentifier
            });

            // Update configuration status
            config.lastExecutionAt = new Date();
            config.lastExecutionStatus = 'success';
            config.lastExecutionError = null;
            config.lastGeneratedContest = contest._id;
            config.recentProblemIds = selectedProblems.map(p => p.problem);
            
            // Advance nextExecutionAt to next week
            const nextSchedule = this.computeNextSchedule(config, new Date(schedule.endTime.getTime() + 10000));
            config.nextExecutionAt = nextSchedule.startTime;

            await config.save();

            // Audit log
            await ContestAuditLog.create({
                contest: contest._id,
                actor: hostId,
                action: manual ? 'MANUAL_TRIGGER_WEEKLY_CONTEST' : 'AUTO_GENERATE_WEEKLY_CONTEST',
                reason: `Weekly Public Contest created for week ${schedule.weekNumber}`,
                newState: {
                    contestId: contest._id,
                    weeklyIdentifier: schedule.weeklyIdentifier,
                    problemIds: config.recentProblemIds
                },
                timestamp: new Date()
            });

            console.log(`🏆 [Weekly Contest Scheduler] Generated "${contest.title}" (${contest.weeklyIdentifier}) successfully.`);

            return {
                success: true,
                created: true,
                message: `Weekly contest "${contest.title}" generated successfully`,
                contest,
                problems: selectedProblems
            };
        } catch (err) {
            console.error('❌ [Weekly Contest Scheduler] Failed to generate contest:', err.message);
            config.lastExecutionAt = new Date();
            config.lastExecutionStatus = 'failed';
            config.lastExecutionError = err.message;
            await config.save();

            throw err;
        }
    }
}

module.exports = new WeeklyContestService();
