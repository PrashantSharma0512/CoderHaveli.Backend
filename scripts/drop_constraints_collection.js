const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const cols = await db.listCollections({ name: 'constraints' }).toArray();
  if (cols.length === 0) {
    console.log('Collection "constraints" does not exist or has already been dropped.');
    process.exit(0);
  }

  const count = await db.collection('constraints').countDocuments();
  console.log(`Dropping "constraints" collection (${count} documents)...`);
  await db.collection('constraints').drop();
  console.log('Successfully dropped "constraints" collection from MongoDB!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error dropping constraints collection:', err);
  process.exit(1);
});
