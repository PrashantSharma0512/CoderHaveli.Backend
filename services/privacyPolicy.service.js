/**
 * privacyPolicy.service.js
 * Manages versioned Privacy Policy documents and per-user acceptance tracking.
 */

const mongoose = require('mongoose');

const DEFAULT_POLICY_TITLE = 'CoderHaveli Privacy Policy';
const DEFAULT_POLICY_CONTENT = `Welcome to CoderHaveli (coderhaveli.com). Your privacy is important to us.

1. Information We Collect
We collect account details (such as your name, email address, and username), coding submissions, Code Tapasya daily streak progress, Haveli Coins activity, and contest participation records to provide and personalize our platform.

2. How We Use Your Information
- To run code execution, evaluate problem & contest submissions, and maintain Tapasya Ranks leaderboards.
- To save your code drafts (autosave), track your daily POTD streaks, and manage Haveli Coin rewards.
- To send essential account verification, password reset, and optional newsletter updates.

3. Data Security & Cookies
We use secure HTTP-only cookies and JWT tokens for authentication. We never sell your personal information to third parties.

4. Policy Updates
Whenever CoderHaveli updates this Privacy Policy, the policy version increases and you will be asked to review and accept the updated terms.

5. Contact Us
If you have questions about this Privacy Policy, contact the CoderHaveli team via our Contact page.`;

class PrivacyPolicyService {
    static async getPolicy() {
        const PrivacyPolicy = mongoose.model('PrivacyPolicy');
        let policy = await PrivacyPolicy.findOne({ key: 'global' }).lean();
        if (!policy) {
            policy = await PrivacyPolicy.findOneAndUpdate(
                { key: 'global' },
                {
                    $setOnInsert: {
                        key: 'global',
                        title: DEFAULT_POLICY_TITLE,
                        content: DEFAULT_POLICY_CONTENT,
                        version: 1,
                        updatedAt: new Date()
                    }
                },
                { upsert: true, new: true }
            ).lean();
        }
        return policy;
    }

    static async getUserStatus(userId = null) {
        const policy = await this.getPolicy();

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return {
                policy,
                needsAcceptance: true,
                userPrivacyPolicy: null
            };
        }

        const User = mongoose.model('User');
        const user = await User.findById(userId, { privacyPolicy: 1 }).lean();
        const pp = user?.privacyPolicy || { accepted: false, acceptedVersion: 0 };

        const needsAcceptance = !(pp.accepted === true && Number(pp.acceptedVersion) === Number(policy.version));

        return {
            policy,
            needsAcceptance,
            userPrivacyPolicy: pp
        };
    }

    static async respondToPolicy(userId, action) {
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Unauthorized');
        }

        const policy = await this.getPolicy();
        const User = mongoose.model('User');
        const now = new Date();

        const update = action === 'accept'
            ? {
                privacyPolicy: {
                    accepted: true,
                    acceptedVersion: policy.version,
                    acceptedAt: now,
                    declinedAt: null
                },
                modifiedAt: now
            }
            : {
                privacyPolicy: {
                    accepted: false,
                    acceptedVersion: 0,
                    acceptedAt: null,
                    declinedAt: now
                },
                modifiedAt: now
            };

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: update },
            { new: true, projection: { privacyPolicy: 1 } }
        ).lean();

        return {
            policy,
            needsAcceptance: action !== 'accept',
            userPrivacyPolicy: updatedUser?.privacyPolicy || null
        };
    }

    static async updatePolicy({ title, content }, adminId = null) {
        if (!content || !String(content).trim()) {
            throw new Error('Privacy policy content is required');
        }

        const PrivacyPolicy = mongoose.model('PrivacyPolicy');
        const existing = await this.getPolicy();

        const nextVersion = (existing?.version || 0) + 1;
        const setFields = {
            title: String(title || DEFAULT_POLICY_TITLE).trim(),
            content: String(content).trim(),
            version: nextVersion,
            updatedAt: new Date()
        };
        if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
            setFields.updatedBy = adminId;
        }

        return PrivacyPolicy.findOneAndUpdate(
            { key: 'global' },
            { $set: setFields },
            { upsert: true, new: true }
        ).lean();
    }

    static async getAdminOverview() {
        const User = mongoose.model('User');
        const policy = await this.getPolicy();
        const [totalUsers, acceptedCount] = await Promise.all([
            User.countDocuments({ isDeleted: false }),
            User.countDocuments({
                isDeleted: false,
                'privacyPolicy.accepted': true,
                'privacyPolicy.acceptedVersion': policy.version
            })
        ]);

        return {
            policy,
            totalUsers,
            acceptedCount
        };
    }
}

module.exports = PrivacyPolicyService;

