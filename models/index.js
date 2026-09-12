const userSchema = require('./users.schema');
const imageSchema = require('./images.schema');
const courseSchema = require('./courses.schema');
const instructorSchema = require('./instructors.schema');
const categorySchema = require('./categories.schema');
const codeSchema = require('./codes.schema');
const testcaseSchema = require('./testcases.schema');
const problemlistSchema = require('./problemlists.schema');
const constraintsSchema = require('./constraints.schema');
const hintSchema = require('./hints.schema');
const submissionSchema = require('./submissions.schema');
const approachesSchema = require('./approaches.schema');
const progessSchema = require('./progesses.schema');
const communitySchema = require('./communities.schema');
const startercodeSchema = require('./startercodes.schema');
const commentSchema = require('./comments.schema');
const subscriptionSchema = require('./subscriptions.schema');
const couponSchema = require('./coupons.schema');
const cartSchema = require('./carts.schema');
const analyticsSchema = require('./analytics.schema');
const newsSchema = require('./news.schema');
const newsletterSchema = require('./newsletters.schema');

module.exports = (mongoose) => {
    const User = userSchema(mongoose);
    const Image = imageSchema(mongoose);
    const Course = courseSchema(mongoose);
    const Instructor = instructorSchema(mongoose);
    const Category = categorySchema(mongoose);
    const Code = codeSchema(mongoose);
    const TestCase = testcaseSchema(mongoose);
    const ProblemList = problemlistSchema(mongoose);
    const Constraints = constraintsSchema(mongoose);
    const Hint = hintSchema(mongoose);
    const Submission = submissionSchema(mongoose);
    const Approaches = approachesSchema(mongoose);
    const Progess = progessSchema(mongoose);
    const Community = communitySchema(mongoose);
    const StarterCode = startercodeSchema(mongoose);
    const Comment = commentSchema(mongoose);
    const Subscription = subscriptionSchema(mongoose);
    const Coupon = couponSchema(mongoose);
    const Cart = cartSchema(mongoose);
    const Analytics = analyticsSchema(mongoose);
    const News = newsSchema(mongoose);
    const NewsLetter = newsletterSchema(mongoose);

    return {
        User,
        Image,
        Course,
        Instructor,
        Category,
        Code,
        TestCase,
        ProblemList,
        Constraints,
        hint: Hint,
        Submissions: Submission,
        Approaches,
        Progess,
        Community,
        StarterCodeSchema: StarterCode,
        Comment,
        Subscription,
        Coupon,
        cartSchema: Cart,
        analyticsSchema: Analytics,
        NewsSchema: News,
        NewsletterSchema: NewsLetter,

        email: { type: String, required: true, unique: true, index: true },
        difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'], index: true },
        status: { type: String, required: true, index: true }
    };
};
