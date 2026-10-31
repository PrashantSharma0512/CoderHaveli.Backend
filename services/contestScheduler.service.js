const mongoose = require('mongoose');
const { Queue, Worker } = require('bullmq');
const contestScoringService = require('./contestScoring.service');
const weeklyContestService = require('./weeklyContest.service');

class ContestSchedulerService {
    constructor() {
        this.queue = null;
        this.worker = null;
        this.reconciliationInterval = null;
        this.isReconciling = false;
    }

    /**
     * Initialize scheduler: Setup BullMQ queue if Redis connection exists,
     * run initial database reconciliation, and start periodic reconciliation timer.
     */
    async init() {
        console.log('⏳ Initializing Contest Scheduling Engine...');

        // 1. BullMQ queue & worker configuration:
        // CoderHaveli uses Layerbase Redis which is configured with lazyConnect: true
        // and sleeps when idle to preserve quota (see REDIS_OPTIMIZATION_COMPLETE.md).
        // Spawning a persistent BullMQ worker on a sleeping Redis triggers continuous
        // TLS socket ECONNRESET errors that choke the Node.js event loop.
        // Therefore, BullMQ is only activated if ENABLE_CONTEST_BULLMQ is explicitly set to 'true'.
        // Otherwise, the resilient, zero-cost database reconciliation loop is used.
        if (process.env.ENABLE_CONTEST_BULLMQ === 'true') {
            try {
                const connection = require('../configs/ioreis.config');
                if (connection && connection.status === 'ready') {
                    this.queue = new Queue('contest-lifecycle', {
                        connection,
                        defaultJobOptions: {
                            removeOnComplete: { age: 3600, count: 100 },
                            removeOnFail: { age: 3600, count: 50 }
                        }
                    });

                    this.worker = new Worker('contest-lifecycle', async (job) => {
                        const { contestId, action } = job.data;
                        console.log(`[Contest Worker] Processing job ${job.id}: ${action} for contest ${contestId}`);
                        if (action === 'start') {
                            await this.handleScheduledStart(contestId);
                        } else if (action === 'end') {
                            await this.handleScheduledEnd(contestId);
                        }
                    }, {
                        connection,
                        concurrency: 5
                    });

                    this.worker.on('error', (err) => {
                        console.warn('⚠️ Contest Worker Redis Notice:', err.message);
                    });

                    console.log('✅ BullMQ Contest lifecycle queue & worker ready');
                }
            } catch (queueErr) {
                console.warn('⚠️ BullMQ initialization skipped (using resilient database scheduler):', queueErr.message);
            }
        } else {
            console.log('ℹ️ Contest Engine: Using resilient, zero-cost database reconciliation (Layerbase Redis stays in sleep mode)');
        }

        // 2. Perform initial reconciliation if MongoDB is ready
        if (mongoose.connection.readyState === 1) {
            await this.reconcileContestStates();
        }

        // 3. Setup periodic resilient database reconciliation timer (runs every 30 seconds)
        // Guarantees missed transitions are recovered even if server restarts or platform sleeps
        if (!this.reconciliationInterval) {
            this.reconciliationInterval = setInterval(() => {
                this.reconcileContestStates().catch(err => {
                    console.error('❌ Error during periodic contest reconciliation:', err.message);
                });
            }, 30000);
        }

        console.log('✅ Persistent Contest Scheduler and Auto-Reconciliation active');
    }

    /**
     * Database-driven reconciliation process:
     * - Scheduled contests where startTime has passed -> atomically set to Live
     * - Live contests where endTime has passed -> atomically set to Ended
     */
    async reconcileContestStates() {
        if (this.isReconciling) return;
        
        // Guard: Do not query if MongoDB is not connected to avoid buffering timeouts
        if (mongoose.connection.readyState !== 1) {
            return;
        }

        this.isReconciling = true;

        try {
            const Contest = mongoose.model('Contest');
            const ContestAuditLog = mongoose.model('ContestAuditLog');
            const now = new Date();

            // 0. Auto-generate upcoming weekly public contest if enabled and not created yet
            try {
                await weeklyContestService.generateWeeklyContest({ manual: false });
            } catch (wErr) {
                // Insufficient questions or paused config is tracked in WeeklyContestConfig without crashing loop
            }

            // 1. Find scheduled contests that should now be LIVE
            const scheduledToStart = await Contest.find({
                status: 'scheduled',
                startTime: { $lte: now }
            });

            for (const c of scheduledToStart) {
                // Atomic conditional update ensures idempotency across multiple workers
                const updated = await Contest.findOneAndUpdate(
                    {
                        _id: c._id,
                        status: 'scheduled',
                        startTime: { $lte: now }
                    },
                    {
                        $set: {
                            status: 'live',
                            startedAt: now
                        }
                    },
                    { new: true }
                );

                if (updated) {
                    console.log(`🚀 [Contest Lifecycle] Contest "${updated.title}" (${updated._id}) is now LIVE`);

                    // Audit log
                    await ContestAuditLog.create({
                        contest: updated._id,
                        actor: updated.createdBy,
                        action: 'AUTO_START',
                        previousState: { status: 'scheduled' },
                        newState: { status: 'live', startedAt: now },
                        reason: 'Contest start time reached via persistent scheduler',
                        timestamp: now
                    });
                }
            }

            // 2. Find live contests that should now be ENDED
            const liveToEnd = await Contest.find({
                status: 'live',
                endTime: { $lte: now }
            });

            for (const c of liveToEnd) {
                // Atomic conditional update ensures idempotency
                const updated = await Contest.findOneAndUpdate(
                    {
                        _id: c._id,
                        status: 'live',
                        endTime: { $lte: now }
                    },
                    {
                        $set: {
                            status: 'ended',
                            endedAt: now
                        }
                    },
                    { new: true }
                );

                if (updated) {
                    console.log(`🏁 [Contest Lifecycle] Contest "${updated.title}" (${updated._id}) has ENDED`);

                    // Finalize rankings
                    await contestScoringService.updateContestRanks(updated._id);

                    // Audit log
                    await ContestAuditLog.create({
                        contest: updated._id,
                        actor: updated.createdBy,
                        action: 'AUTO_END',
                        previousState: { status: 'live' },
                        newState: { status: 'ended', endedAt: now },
                        reason: 'Contest end time reached via persistent scheduler',
                        timestamp: now
                    });
                }
            }
        } catch (err) {
            console.error('❌ Error during contest state reconciliation:', err);
        } finally {
            this.isReconciling = false;
        }
    }

    /**
     * Schedule or reschedule background jobs when a contest is scheduled or updated
     */
    async scheduleContestLifecycle(contest) {
        const now = new Date();
        const startTime = new Date(contest.startTime);
        const endTime = new Date(contest.endTime);

        // Remove any existing pending jobs for this contest
        await this.cancelContestLifecycle(contest._id.toString());

        if (this.queue) {
            try {
                // Job to transition Scheduled -> Live
                if (startTime > now) {
                    const delayStart = Math.max(0, startTime.getTime() - now.getTime());
                    await this.queue.add(
                        'start',
                        { contestId: contest._id.toString(), action: 'start' },
                        { delay: delayStart, jobId: `start_${contest._id}` }
                    );
                }

                // Job to transition Live -> Ended
                if (endTime > now) {
                    const delayEnd = Math.max(0, endTime.getTime() - now.getTime());
                    await this.queue.add(
                        'end',
                        { contestId: contest._id.toString(), action: 'end' },
                        { delay: delayEnd, jobId: `end_${contest._id}` }
                    );
                }
            } catch (jobErr) {
                console.warn('⚠️ BullMQ job scheduling notice:', jobErr.message);
            }
        }

        // Trigger immediate reconciliation in case times already passed
        await this.reconcileContestStates();
    }

    /**
     * Remove queued lifecycle jobs for a contest
     */
    async cancelContestLifecycle(contestId) {
        if (!this.queue) return;
        try {
            const startJob = await this.queue.getJob(`start_${contestId}`);
            if (startJob) await startJob.remove();

            const endJob = await this.queue.getJob(`end_${contestId}`);
            if (endJob) await endJob.remove();
        } catch (err) {
            // Ignore if jobs not found
        }
    }

    /**
     * Handler invoked when start job triggers
     */
    async handleScheduledStart(contestId) {
        const Contest = mongoose.model('Contest');
        const now = new Date();

        const contest = await Contest.findById(contestId);
        if (!contest || contest.status !== 'scheduled') {
            return;
        }

        if (new Date(contest.startTime) <= now) {
            await this.reconcileContestStates();
        }
    }

    /**
     * Handler invoked when end job triggers
     */
    async handleScheduledEnd(contestId) {
        const Contest = mongoose.model('Contest');
        const now = new Date();

        const contest = await Contest.findById(contestId);
        if (!contest || contest.status !== 'live') {
            return;
        }

        if (new Date(contest.endTime) <= now) {
            await this.reconcileContestStates();
        }
    }

    /**
     * Manual start by authorized admin
     */
    async startContestManually(contestId, adminUserId) {
        const Contest = mongoose.model('Contest');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const now = new Date();

        const contest = await Contest.findById(contestId);
        if (!contest) throw new Error('Contest not found');

        if (contest.status === 'live') {
            throw new Error('Contest is already live');
        }
        if (contest.status === 'ended' || contest.status === 'cancelled') {
            throw new Error(`Cannot start a contest that is already ${contest.status}`);
        }

        const prev = { status: contest.status, startTime: contest.startTime };
        contest.status = 'live';
        contest.startedAt = now;
        if (new Date(contest.startTime) > now) {
            contest.startTime = now; // adjust start time so durations align
        }
        await contest.save();

        await ContestAuditLog.create({
            contest: contest._id,
            actor: adminUserId,
            action: 'MANUAL_START',
            previousState: prev,
            newState: { status: 'live', startedAt: now, startTime: contest.startTime },
            reason: 'Contest manually started by administrator',
            timestamp: now
        });

        // Reschedule end job if needed
        await this.scheduleContestLifecycle(contest);

        return contest;
    }

    /**
     * Manual end by authorized admin
     */
    async endContestManually(contestId, adminUserId) {
        const Contest = mongoose.model('Contest');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const now = new Date();

        const contest = await Contest.findById(contestId);
        if (!contest) throw new Error('Contest not found');

        if (contest.status !== 'live') {
            throw new Error(`Cannot end a contest that is currently ${contest.status}`);
        }

        const prev = { status: contest.status, endTime: contest.endTime };
        contest.status = 'ended';
        contest.endedAt = now;
        contest.endTime = now;
        await contest.save();

        // Finalize ranking
        await contestScoringService.updateContestRanks(contest._id);

        await ContestAuditLog.create({
            contest: contest._id,
            actor: adminUserId,
            action: 'MANUAL_END',
            previousState: prev,
            newState: { status: 'ended', endedAt: now, endTime: now },
            reason: 'Contest manually ended by administrator',
            timestamp: now
        });

        await this.cancelContestLifecycle(contestId);

        return contest;
    }

    /**
     * Manual cancel with reason by authorized admin
     */
    async cancelContestManually(contestId, adminUserId, reason) {
        const Contest = mongoose.model('Contest');
        const ContestAuditLog = mongoose.model('ContestAuditLog');
        const now = new Date();

        const contest = await Contest.findById(contestId);
        if (!contest) throw new Error('Contest not found');

        if (contest.status === 'ended' || contest.status === 'cancelled') {
            throw new Error(`Cannot cancel a contest that is already ${contest.status}`);
        }

        const prev = { status: contest.status };
        contest.status = 'cancelled';
        contest.cancelledAt = now;
        contest.cancellationReason = reason || 'Cancelled by administrator';
        await contest.save();

        await ContestAuditLog.create({
            contest: contest._id,
            actor: adminUserId,
            action: 'MANUAL_CANCEL',
            previousState: prev,
            newState: { status: 'cancelled', cancelledAt: now, reason: contest.cancellationReason },
            reason: contest.cancellationReason,
            timestamp: now
        });

        await this.cancelContestLifecycle(contestId);

        return contest;
    }
}

module.exports = new ContestSchedulerService();
