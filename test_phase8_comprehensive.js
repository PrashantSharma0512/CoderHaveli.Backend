const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const http = require('http');
const app = require('./app');

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'test_access_secret';
const RAZOR_PAY_SECRET = process.env.RAZOR_PAY_SECRET || 'dummy_test_secret_only';
const BASE_URL = 'http://127.0.0.1:4005';

let server;
let adminToken;
let hostToken;
let inviteeToken;
let strangerToken;

let adminUser;
let hostUser;
let inviteeUser;
let strangerUser;
let extraUsers = [];

let testProblems = [];
let privateContestId;
let weeklyContestId;
let createdPassPlanId;

function assert(condition, message) {
    if (!condition) {
        console.error(`  ❌ FAILED: ${message}`);
        process.exit(1);
    }
    console.log(`  ✓ ${message}`);
}

async function runPhase8Suite() {
    console.log('\n================================================================');
    console.log('   RUNNING PHASE 8: COMPREHENSIVE E2E & SECURITY AUDIT SUITE    ');
    console.log('================================================================\n');

    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/coderhaveli');
    if (!mongoose.models.User) {
        require('./models')(mongoose);
    }

    const User = mongoose.model('User');
    const Contest = mongoose.model('Contest');
    const ProblemList = mongoose.model('ProblemList');
    const ContestPassPlan = mongoose.model('ContestPassPlan');
    const ContestPassPurchase = mongoose.model('ContestPassPurchase');
    const ContestAuditLog = mongoose.model('ContestAuditLog');

    // Setup Test Users
    adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
        adminUser = await User.create({
            name: 'P8 Admin User',
            username: `admin_p8_${Date.now()}`,
            email: `admin_p8_${Date.now()}@coderhaveli.com`,
            phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
            password: 'AdminPassword123!',
            role: 'admin'
        });
    }

    hostUser = await User.create({
        name: 'P8 Contest Host',
        username: `host_p8_${Date.now()}`,
        email: `host_p8_${Date.now()}@coderhaveli.com`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: 'Password123!',
        role: 'user'
    });

    inviteeUser = await User.create({
        name: 'P8 Invited Friend',
        username: `invitee_p8_${Date.now()}`,
        email: `invitee_p8_${Date.now()}@coderhaveli.com`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: 'Password123!',
        role: 'user'
    });

    strangerUser = await User.create({
        name: 'P8 Unauthorized Stranger',
        username: `stranger_p8_${Date.now()}`,
        email: `stranger_p8_${Date.now()}@coderhaveli.com`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: 'Password123!',
        role: 'user'
    });

    // Create 5 extra users to test the 5-participant limit
    for (let i = 1; i <= 6; i++) {
        const u = await User.create({
            name: `P8 Extra Friend ${i}`,
            username: `friend_p8_${i}_${Date.now()}`,
            email: `friend_p8_${i}_${Date.now()}@coderhaveli.com`,
            phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
            password: 'Password123!',
            role: 'user'
        });
        extraUsers.push(u);
    }

    // Auth Tokens
    adminToken = jwt.sign({ userId: adminUser._id, role: 'admin' }, ACCESS_SECRET, { expiresIn: '1h' });
    hostToken = jwt.sign({ userId: hostUser._id, role: 'user' }, ACCESS_SECRET, { expiresIn: '1h' });
    inviteeToken = jwt.sign({ userId: inviteeUser._id, role: 'user' }, ACCESS_SECRET, { expiresIn: '1h' });
    strangerToken = jwt.sign({ userId: strangerUser._id, role: 'user' }, ACCESS_SECRET, { expiresIn: '1h' });

    // Fetch existing problems
    testProblems = await ProblemList.find().limit(3).lean();
    assert(testProblems.length > 0, `Database contains ${testProblems.length} problem(s)`);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(4005, resolve));

    try {
        // [Section 1] Free Entitlement & Initial Limit Check
        console.log('[Section 1] Testing Default Free Entitlement (5 Participants)...');
        const entRes = await axios.get(`${BASE_URL}/api/contests/user/hosting-entitlement`, {
            headers: { Authorization: `Bearer ${hostToken}` }
        });
        assert(entRes.data.effectiveParticipantLimit === 5, 'Initial participant limit is 5');
        assert(entRes.data.hasActivePass === false, 'Host initially has no active pass');

        // [Section 2] Private Contest Creation with Invited Friend
        console.log('\n[Section 2] Creating Private Contest with Invited Friends...');
        const createContestRes = await axios.post(`${BASE_URL}/api/contests`, {
            title: `P8 Champions Trophy ${Date.now()}`,
            description: 'Top secret algorithmic tournament',
            contestType: 'private',
            startTime: new Date(Date.now() + 600000).toISOString(),
            duration: 90,
            invitedUserIds: [inviteeUser._id],
            problems: testProblems.map((p, idx) => ({ problem: p._id, points: 100 * (idx + 1), order: idx + 1 }))
        }, {
            headers: { Authorization: `Bearer ${hostToken}` }
        });
        assert(createContestRes.status === 201, 'Private contest created with status 201');
        assert(createContestRes.data.contest.contestType === 'private', 'Contest is private');
        privateContestId = createContestRes.data.contest._id;

        // [Section 3] Participant Authorization & Question Masking
        console.log('\n[Section 3] Verifying Security: Question Masking for Unauthorized Visitors...');
        // A. Authorized Host can view full details
        const hostView = await axios.get(`${BASE_URL}/api/contests/${privateContestId}`, {
            headers: { Authorization: `Bearer ${hostToken}` }
        });
        assert(hostView.data.contest.isPrivateRestricted === undefined, 'Host is not restricted');
        assert(hostView.data.contest.description.includes('Top secret'), 'Host can see full contest description');

        // B. Authorized Invitee can view full details
        const inviteeView = await axios.get(`${BASE_URL}/api/contests/${privateContestId}`, {
            headers: { Authorization: `Bearer ${inviteeToken}` }
        });
        assert(inviteeView.data.contest.isPrivateRestricted === undefined, 'Invited friend is not restricted');
        assert(inviteeView.data.contest.description.includes('Top secret'), 'Invitee can see full contest description');

        // C. Unauthorized Stranger gets masked metadata
        const strangerView = await axios.get(`${BASE_URL}/api/contests/${privateContestId}`, {
            headers: { Authorization: `Bearer ${strangerToken}` }
        });
        assert(strangerView.data.contest.isPrivateRestricted === true, 'Unauthorized stranger gets isPrivateRestricted = true');
        assert(strangerView.data.contest.description === undefined, 'Contest description is strictly masked from stranger');
        assert(strangerView.data.contest.problems === undefined, 'Contest problems are strictly hidden from stranger');

        // D. Anonymous visitor gets masked metadata
        const anonView = await axios.get(`${BASE_URL}/api/contests/${privateContestId}`);
        assert(anonView.data.contest.isPrivateRestricted === true, 'Anonymous visitor gets isPrivateRestricted = true');
        assert(anonView.data.contest.problems === undefined, 'Problems are hidden from anonymous visitor');

        // [Section 4] Enforcing 5-Participant Hosting Limit
        console.log('\n[Section 4] Enforcing Free Tier Limit (Max 5 participants: Host + 4 invitees)...');
        // Current roster: Host (1) + Invitee (1) = 2.
        // Add 3 more friends -> total 5 (Allowed)
        const addFriendsRes = await axios.post(`${BASE_URL}/api/contests/${privateContestId}/invitations`, {
            invitedUserIds: [extraUsers[0]._id, extraUsers[1]._id, extraUsers[2]._id]
        }, {
            headers: { Authorization: `Bearer ${hostToken}` }
        });
        assert(addFriendsRes.status === 200, 'Successfully added 3 friends (Roster total: 5)');

        // Now attempt to add 1 more (Total 6: exceeds 5-participant limit) -> MUST FAIL with 403
        try {
            await axios.post(`${BASE_URL}/api/contests/${privateContestId}/invitations`, {
                invitedUserIds: [extraUsers[3]._id]
            }, {
                headers: { Authorization: `Bearer ${hostToken}` }
            });
            assert(false, 'Should have failed with 403 when exceeding participant limit');
        } catch (err) {
            assert(err.response && err.response.status === 403, 'Blocked with 403: Participant limit exceeded');
            assert(err.response.data.requiresPassUpgrade === true, 'Response specifies requiresPassUpgrade: true');
        }

        // [Section 5] Contest Pass Purchase & Cryptographic Payment Verification
        console.log('\n[Section 5] Contest Pass Purchase & HMAC Signature Verification...');
        // Get Basic Pass plan
        const plansRes = await axios.get(`${BASE_URL}/api/contests/pass/plans`);
        const basicPlan = plansRes.data.plans.find(p => p.slug === 'basic' || p.participantLimit === 10);
        assert(basicPlan !== undefined, 'Basic Pass plan exists');

        // Create Order
        const orderRes = await axios.post(`${BASE_URL}/api/contests/pass/order`, {
            planId: basicPlan._id
        }, {
            headers: { Authorization: `Bearer ${hostToken}` }
        });
        assert(orderRes.status === 200, 'Razorpay order created');
        const orderId = orderRes.data.orderId;
        const fakePaymentId = `pay_p8_${Date.now()}`;

        // Verify with fake signature -> MUST FAIL with 400
        try {
            await axios.post(`${BASE_URL}/api/contests/pass/verify`, {
                razorpay_order_id: orderId,
                razorpay_payment_id: fakePaymentId,
                razorpay_signature: 'fraudulent_signature_attempt'
            }, {
                headers: { Authorization: `Bearer ${hostToken}` }
            });
            assert(false, 'Forged signature should have failed with 400');
        } catch (err) {
            assert(err.response && err.response.status === 400, 'Forged signature rejected with 400 Bad Request');
        }

        // Verify with genuine HMAC SHA-256 signature
        const genuineSignature = crypto
            .createHmac('sha256', RAZOR_PAY_SECRET)
            .update(`${orderId}|${fakePaymentId}`)
            .digest('hex');

        const verifyRes = await axios.post(`${BASE_URL}/api/contests/pass/verify`, {
            razorpay_order_id: orderId,
            razorpay_payment_id: fakePaymentId,
            razorpay_signature: genuineSignature
        }, {
            headers: { Authorization: `Bearer ${hostToken}` }
        });
        assert(verifyRes.status === 200, 'Legitimate signature verified and pass activated');
        assert(verifyRes.data.entitlement.effectiveLimit === 10, 'Effective limit upgraded to 10');

        // Now host can invite 6th participant without error
        const add6thRes = await axios.post(`${BASE_URL}/api/contests/${privateContestId}/invitations`, {
            invitedUserIds: [extraUsers[3]._id]
        }, {
            headers: { Authorization: `Bearer ${hostToken}` }
        });
        assert(add6thRes.status === 200, '6th participant successfully added with upgraded Contest Pass!');

        // [Section 6] Admin Contest Disabling & Submissions Blocking
        console.log('\n[Section 6] Admin Contest Disabling & Submissions Restrictions...');
        const disableRes = await axios.post(`${BASE_URL}/api/admin/contests/${privateContestId}/disable`, {
            reason: 'Emergency audit: suspicious submission patterns'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert(disableRes.status === 200, 'Admin disabled contest');
        assert(disableRes.data.contest.status === 'disabled', 'Contest status changed to disabled');

        // Submissions to disabled contest are blocked
        try {
            await axios.post(`${BASE_URL}/api/contests/${privateContestId}/submissions`, {
                problemId: testProblems[0]._id,
                code: 'console.log("hello")',
                language: 'javascript'
            }, {
                headers: { Authorization: `Bearer ${hostToken}` }
            });
            assert(false, 'Submissions on disabled contest should fail with 403');
        } catch (err) {
            assert(err.response && err.response.status === 403, 'Submissions on disabled contest blocked with 403');
        }

        // Admin restores contest
        const restoreRes = await axios.post(`${BASE_URL}/api/admin/contests/${privateContestId}/restore`, {
            reason: 'Audit cleared: no cheating detected'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert(restoreRes.status === 200, 'Admin restored contest');
        assert(restoreRes.data.contest.status !== 'disabled', 'Contest status is no longer disabled');

        // [Section 7] Automatic Weekly Public Contest System (Phase 5 & 6)
        console.log('\n[Section 7] Automatic Weekly Public Contest System...');
        const previewRes = await axios.get(`${BASE_URL}/api/admin/contests/scheduler/preview`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert(previewRes.data.preview.problems.length === 3, 'Weekly contest contains exactly 3 problems');
        const diffs = previewRes.data.preview.problems.map(p => p.difficulty);
        assert(diffs.includes('Easy') && diffs.includes('Medium') && diffs.includes('Hard'), 'Contains 1 Easy, 1 Medium, and 1 Hard problem');

        // Manual Trigger
        const triggerRes = await axios.post(`${BASE_URL}/api/admin/contests/scheduler/trigger`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert(triggerRes.status === 200, 'Weekly contest triggered successfully');
        weeklyContestId = triggerRes.data.contest._id;
        assert(triggerRes.data.contest.weeklyIdentifier.startsWith('weekly-'), 'Generated contest has weeklyIdentifier');
        assert(triggerRes.data.contest.contestType === 'public', 'Weekly contest is public');

        // Duplicate prevention test
        const duplicateTriggerRes = await axios.post(`${BASE_URL}/api/admin/contests/scheduler/trigger`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert(duplicateTriggerRes.data.created === false, 'Scheduler idempotency prevents duplicate contest generation');

        // [Section 8] Backward Compatibility with Public Contests
        console.log('\n[Section 8] Verifying Backward Compatibility with Existing Contests...');
        const publicListing = await axios.get(`${BASE_URL}/api/contests`);
        assert(publicListing.status === 200, 'Public listing returns 200 OK');
        assert(publicListing.data.contests.length > 0, 'Public contests list accessible');
        // Verify disabled contests are hidden from public listing
        assert(!publicListing.data.contests.some(c => c.status === 'disabled'), 'Disabled contests are excluded from public listing');

        console.log('\n================================================================');
        console.log('   🎉 ALL PHASE 8 COMPREHENSIVE E2E TESTS PASSED 100%!           ');
        console.log('================================================================\n');

    } finally {
        // Clean up test data
        if (privateContestId) await Contest.deleteOne({ _id: privateContestId });
        if (weeklyContestId) await Contest.deleteOne({ _id: weeklyContestId });
        await ContestPassPurchase.deleteMany({ user: hostUser._id });
        await User.deleteMany({ _id: { $in: [hostUser._id, inviteeUser._id, strangerUser._id, ...extraUsers.map(u => u._id)] } });

        server.close();
        await mongoose.disconnect();
    }
}

runPhase8Suite().catch(err => {
    console.error('Fatal Phase 8 test error:', err.response?.data || err.message);
    if (server) server.close();
    process.exit(1);
});
