/**
 * Migration Script: Denormalize Problem Data into ProblemList
 * 
 * Embeds:
 * - constraints: [String] (from Constraints collection)
 * - hints: [String] (from Hint collection)
 * - starterCodes: { javascript, python, java, cpp } (from StarterCode collection)
 * - examples: [{ input, output, explaination }] (first 3 from TestCase collection)
 * 
 * Run with: node scripts/denormalize_problem_data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
    const startTime = Date.now();
    console.log(' Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log(' Connected to MongoDB successfully.');

    const db = mongoose.connection.db;
    const problemCol = db.collection('problemlists');
    const constraintCol = db.collection('constraints');
    const hintCol = db.collection('hints');
    const starterCodeCol = db.collection('startercodes');
    const testCaseCol = db.collection('testcases');

    const totalProblems = await problemCol.countDocuments();
    console.log(` Found ${totalProblems} problems to denormalize.`);

    const BATCH_SIZE = 250;
    let processedCount = 0;
    let updatedCount = 0;

    const cursor = problemCol.find({}, { projection: { quesId: 1, quesName: 1 } });
    let batch = [];

    while (await cursor.hasNext()) {
        const problem = await cursor.next();
        batch.push(problem);

        if (batch.length >= BATCH_SIZE) {
            await processBatch(batch);
            processedCount += batch.length;
            const pct = ((processedCount / totalProblems) * 100).toFixed(1);
            console.log(` [${pct}%] Processed ${processedCount}/${totalProblems} problems...`);
            batch = [];
        }
    }

    if (batch.length > 0) {
        await processBatch(batch);
        processedCount += batch.length;
        console.log(` [100.0%] Processed ${processedCount}/${totalProblems} problems.`);
    }

    async function processBatch(problemBatch) {
        const quesIds = problemBatch.map(p => String(p.quesId));

        // Fetch related data in parallel for this batch
        const [constraintsList, hintsList, starterCodesList, testCasesList] = await Promise.all([
            constraintCol.find({ quesId: { $in: quesIds } }).toArray(),
            hintCol.find({ quesId: { $in: quesIds } }).toArray(),
            starterCodeCol.find({ quesId: { $in: quesIds } }).toArray(),
            testCaseCol.find({ quesId: { $in: quesIds } }, { projection: { quesId: 1, input: 1, output: 1, explaination: 1 } }).toArray()
        ]);

        // Build lookup maps
        const constraintMap = new Map();
        for (const c of constraintsList) {
            const list = c.constraint || c.constraints || c.contraints || [];
            if (Array.isArray(list)) constraintMap.set(String(c.quesId), list);
        }

        const hintMap = new Map();
        for (const h of hintsList) {
            if (Array.isArray(h.hints)) hintMap.set(String(h.quesId), h.hints);
        }

        const starterCodeMap = new Map();
        for (const sc of starterCodesList) {
            const qId = String(sc.quesId);
            if (!starterCodeMap.has(qId)) {
                starterCodeMap.set(qId, {
                    javascript: '',
                    python: '',
                    java: '',
                    cpp: ''
                });
            }
            if (sc.language && sc.code) {
                const lang = sc.language.toLowerCase();
                const current = starterCodeMap.get(qId);
                current[lang] = sc.code;
            }
        }

        const exampleMap = new Map();
        for (const tc of testCasesList) {
            const qId = String(tc.quesId);
            if (!exampleMap.has(qId)) {
                exampleMap.set(qId, []);
            }
            const arr = exampleMap.get(qId);
            if (arr.length < 3) {
                arr.push({
                    input: tc.input || '',
                    output: tc.output || '',
                    explaination: tc.explaination || ''
                });
            }
        }

        // Build bulk operations
        const bulkOps = problemBatch.map(p => {
            const qId = String(p.quesId);
            const constraints = constraintMap.get(qId) || [];
            const hints = hintMap.get(qId) || [];
            const starterCodes = starterCodeMap.get(qId) || {
                javascript: '',
                python: '',
                java: '',
                cpp: ''
            };
            const examples = exampleMap.get(qId) || [];

            return {
                updateOne: {
                    filter: { _id: p._id },
                    update: {
                        $set: {
                            constraints,
                            hints,
                            starterCodes,
                            examples,
                            languages: ['javascript', 'python', 'java', 'cpp'],
                            modifiedAt: new Date()
                        },
                        $unset: {
                            Constraints: '',
                            constraint: ''
                        }
                    }
                }
            };
        });

        if (bulkOps.length > 0) {
            const res = await problemCol.bulkWrite(bulkOps, { ordered: false });
            updatedCount += (res.modifiedCount || 0);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(` Migration completed in ${elapsed}s!`);
    console.log(` Total problems updated: ${updatedCount}/${totalProblems}`);

    // Verify a sample problem
    const sample = await problemCol.findOne({ quesId: '1' });
    console.log('\n Verified Sample Problem (Two Sum):');
    console.log(' - Constraints count:', sample.constraints?.length || 0);
    console.log(' - Hints count:', sample.hints?.length || 0);
    console.log(' - Examples count:', sample.examples?.length || 0);
    console.log(' - Starter codes available:', Object.keys(sample.starterCodes || {}).filter(k => !!sample.starterCodes[k]));

    await mongoose.disconnect();
    console.log(' Disconnected from MongoDB.');
    process.exit(0);
}

migrate().catch(err => {
    console.error(' Migration failed:', err);
    process.exit(1);
});
