const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb://localhost:27017/coderhaveli');
    console.log('Connected to MongoDB');

    // Register models
    require('../models')(mongoose);
    const User = mongoose.model('User');
    const ProblemList = mongoose.model('ProblemList');
    const DailyProblem = mongoose.model('DailyProblem');
    const DailyStreak = mongoose.model('DailyStreak');
    const Code = mongoose.model('Code');
    const Submission = mongoose.model('Submission');
    const DailyProblemService = require('../services/dailyProblem.service');

    // 1. Find user by email
    const email = 'prashantsharma0512@gmail.com';
    let user = await User.findOne({ email });
    if (!user) {
      // try case insensitive
      user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    }

    if (!user) {
      console.error(`User with email "${email}" not found!`);
      // list some users for debugging
      const sampleUsers = await User.find({}, { email: 1, name: 1 }).limit(5);
      console.log('Sample users in DB:', sampleUsers);
      return;
    }

    console.log(`Found user: ${user.name || user.email} (_id: ${user._id})`);

    // 2. Get or create today's problem
    const todayProblem = await DailyProblemService.getTodayProblem();
    console.log(`Today's POTD: "${todayProblem.quesName}" (quesId: ${todayProblem.quesId}, problemId: ${todayProblem.problemId || todayProblem.problemRef?._id})`);

    // 3. Create sample accepted code and submission
    const acceptedCode = `// Solution for ${todayProblem.quesName}\n// Solved for ${user.email} on ${todayProblem.serverDate}\nfunction solve() {\n  return true;\n}`;
    const newCode = await Code.create({
      userId: user._id,
      quesId: todayProblem.quesId,
      code: acceptedCode,
      codelanguage: 'javascript',
      createdAt: new Date(),
      modifiedAt: new Date()
    });

    const newSub = await Submission.create({
      userId: user._id,
      quesId: todayProblem.quesId,
      code: newCode._id,
      sourceCode: acceptedCode,
      codelanguage: 'javascript',
      status: 'Accepted',
      execution_time: 45,
      createdAt: new Date(),
      modifiedAt: new Date()
    });

    console.log(`Created Submission (_id: ${newSub._id}, status: Accepted)`);

    // 4. Update daily streak via DailyProblemService
    const streakResult = await DailyProblemService.handleAcceptedSubmission(user._id, todayProblem.quesId);
    console.log('DailyProblemService.handleAcceptedSubmission result:', streakResult);

    // 5. Query updated streak & calendar
    const calendarData = await DailyProblemService.getUserStreakAndCalendar(user._id);
    console.log('\n=== UPDATED USER CODE TAPASYA DATA ===');
    console.log({
      email: user.email,
      userId: user._id,
      currentStreak: calendarData.currentStreak,
      longestStreak: calendarData.longestStreak,
      totalDaysSolved: calendarData.totalDaysSolved,
      lastSolvedDate: calendarData.lastSolvedDate,
      isTodaySolved: calendarData.isTodaySolved,
      solvedDates: calendarData.solvedDates,
      todayDate: calendarData.todayDate
    });

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

run();

