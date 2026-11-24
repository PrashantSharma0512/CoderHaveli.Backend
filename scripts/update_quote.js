const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/coderhaveli');
  const DailyProblem = mongoose.connection.db.collection('dailyproblems');
  const doc = await DailyProblem.findOne({});
  console.log('Current doc:', doc ? { date: doc.date, quesId: doc.quesId, quesName: doc.quesName, quote: doc.catchyQuote } : 'none');
  const updateRes = await DailyProblem.updateMany({}, {
    $set: { catchyQuote: 'Consistency is the Key — Solve Today\'s Challenge!' }
  });
  console.log('Update result:', updateRes);
  await mongoose.disconnect();
}

run().catch(console.error);

