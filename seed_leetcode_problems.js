/**
 * seed_leetcode_problems.js
 * Comprehensive seeder script for CoderHaveli
 * Seeds all 2,849 LeetCode questions into MongoDB in CoderHaveli schema format:
 * - ProblemList
 * - Constraints
 * - TestCase
 * - StarterCode (JavaScript, Python, C++, Java)
 * - Hint
 */

require('dotenv').config();
const mongoose = require('mongoose');
const rawQuestions = require('./leetcode_questions.json');
require('./models')(mongoose);

// Helper: Convert string to camelCase function identifier
function toCamelCase(str) {
    if (!str) return 'solution';
    const words = str
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .trim()
        .split(/\s+/);
    if (!words.length || !words[0]) return 'solution';
    return words.map((w, i) => {
        const l = w.toLowerCase();
        return i === 0 ? l : l.charAt(0).toUpperCase() + l.slice(1);
    }).join('');
}

// Helper: Decode HTML entities & unescape JSON quotes
function decodeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\\"/g, '"');
}

// Helper: Parse testcase examples from HTML description
function parseExamples(desc, title) {
    if (!desc) return [];
    const examples = [];
    const preRegex = /<pre>([\s\S]*?)<\/pre>/gi;
    let match;
    while ((match = preRegex.exec(desc)) !== null) {
        const text = match[1];
        if (!/input/i.test(text) || !/output/i.test(text)) continue;
        const clean = decodeHtml(text.replace(/<[^>]+>/g, '')).trim();
        const inMatch = clean.match(/Input:?\s*([\s\S]*?)(?=Output:?|$)/i);
        const outMatch = clean.match(/Output:?\s*([\s\S]*?)(?=Explanation:?|$)/i);
        const expMatch = clean.match(/Explanation:?\s*([\s\S]*)$/i);
        if (inMatch && outMatch) {
            const inputVal = inMatch[1].trim();
            const outputVal = outMatch[1].trim();
            if (inputVal && outputVal) {
                examples.push({
                    input: inputVal,
                    output: outputVal,
                    explaination: expMatch ? expMatch[1].trim() : ''
                });
            }
        }
    }

    // Fallback if no examples could be parsed (e.g. premium or empty description)
    if (examples.length === 0) {
        examples.push({
            input: `/* Sample input for ${title} */`,
            output: `/* Expected output for ${title} */`,
            explaination: `Standard sample test case for ${title}.`
        });
    }

    return examples;
}

// Helper: Parse constraints from HTML description
function parseConstraints(desc) {
    if (!desc) return [];
    const constraints = [];
    const match = desc.match(/<strong>Constraints:?<\/strong>[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
    if (match) {
        const liRegex = /<li>([\s\S]*?)<\/li>/gi;
        let liMatch;
        while ((liMatch = liRegex.exec(match[1])) !== null) {
            let clean = liMatch[1]
                .replace(/<sup>(.*?)<\/sup>/gi, '^$1')
                .replace(/<sub>(.*?)<\/sub>/gi, '$1')
                .replace(/<[^>]+>/g, '')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ')
                .trim();
            if (clean) constraints.push(clean);
        }
    }
    return constraints;
}

// Helper: Extract parameter names from sample input string
function extractParams(exampleInput) {
    if (!exampleInput) return ['input'];
    const paramMatches = [...exampleInput.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g)];
    if (paramMatches && paramMatches.length > 0) {
        const set = new Set();
        paramMatches.forEach(m => {
            const name = m[1].toLowerCase();
            if (!['true', 'false', 'null', 'undefined', 'return', 'let', 'var', 'const'].includes(name)) {
                set.add(m[1]);
            }
        });
        if (set.size > 0) return Array.from(set);
    }
    return ['input'];
}

// Helper: Generate starter code skeletons for all 4 supported languages
function generateStarterCodes(title, params) {
    const fnName = toCamelCase(title) || 'solution';
    const paramList = params.join(', ');
    
    return [
        {
            language: 'javascript',
            code: `/**\n * @param {any} ${params.join('\n * @param {any} ')}\n * @return {any}\n */\nfunction ${fnName}(${paramList}) {\n    // Write your code here\n    \n};`
        },
        {
            language: 'python',
            code: `class Solution:\n    def ${fnName}(self, ${paramList}):\n        # Write your code here\n        pass\n`
        },
        {
            language: 'cpp',
            code: `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Write your code here\n    auto ${fnName}(${params.map(p => 'auto ' + p).join(', ')}) {\n        \n    }\n};`
        },
        {
            language: 'java',
            code: `class Solution {\n    public Object ${fnName}(${params.map(p => 'Object ' + p).join(', ')}) {\n        // Write your code here\n        return null;\n    }\n}`
        }
    ];
}

async function seedLeetCodeProblems() {
    const startTime = Date.now();
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');

    const ProblemList = mongoose.model('ProblemList');
    const TestCase = mongoose.model('TestCase');
    const Constraints = mongoose.model('Constraints');
    const StarterCode = mongoose.model('StarterCode');
    const Hint = mongoose.model('Hint');

    // Filter valid LeetCode questions (skip id: 0 duplicate)
    const validQuestions = rawQuestions.filter(q => q.id > 0);
    const totalQuestions = validQuestions.length;
    console.log(`📦 Found ${totalQuestions} unique LeetCode questions to seed.`);

    const BATCH_SIZE = 150;
    let processedCount = 0;
    let totalTestCasesInserted = 0;

    for (let i = 0; i < totalQuestions; i += BATCH_SIZE) {
        const batch = validQuestions.slice(i, i + BATCH_SIZE);
        const batchQuesIds = batch.map(q => String(q.id));

        const constraintOps = [];
        const problemOps = [];
        const starterCodeOps = [];
        const hintOps = [];
        const testCaseDocs = [];

        for (const q of batch) {
            const quesId = String(q.id);
            const title = q.title.trim();
            const difficulty = (q.difficulty || 'medium').toLowerCase();
            const tags = Array.isArray(q.categories) ? q.categories : [];

            // Description cleaning
            let desc = q.description ? q.description.trim() : '';
            if (!desc || desc.includes('Premium Question')) {
                desc = `<p><strong>${title}</strong> is a <strong>${q.difficulty}</strong> problem on LeetCode.</p>
<p><strong>Topics:</strong> ${tags.length > 0 ? tags.join(', ') : 'Algorithms, Data Structures'}</p>
<p>For more details, check out the official LeetCode link: <a href="${q.question_link || 'https://leetcode.com'}" target="_blank" rel="noopener noreferrer">${title} on LeetCode</a>.</p>`;
            }

            // Constraints
            let constraintsList = parseConstraints(desc);
            if (!constraintsList || constraintsList.length === 0) {
                constraintsList = [
                    '1 <= input.length <= 10^5',
                    'All inputs are within standard competitive programming limits.',
                    'Time limit: 1000ms | Memory limit: 256MB'
                ];
            }

            const constraintId = new mongoose.Types.ObjectId();
            constraintOps.push({
                updateOne: {
                    filter: { quesId },
                    update: {
                        $set: {
                            quesId,
                            constraint: constraintsList,
                            constraints: constraintsList,
                            contraints: constraintsList,
                            modifiedAt: new Date()
                        },
                        $setOnInsert: {
                            _id: constraintId,
                            createdAt: new Date()
                        }
                    },
                    upsert: true
                }
            });

            // ProblemList
            problemOps.push({
                updateOne: {
                    filter: { quesId },
                    update: {
                        $set: {
                            quesId,
                            quesName: title,
                            quesDesc: desc,
                            difficulty,
                            tags,
                            Constraints: constraintId,
                            constraints: constraintId,
                            languages: ['javascript', 'python', 'java', 'cpp'],
                            modifiedAt: new Date()
                        },
                        $setOnInsert: {
                            createdAt: new Date()
                        }
                    },
                    upsert: true
                }
            });

            // Examples & Test cases
            const examples = parseExamples(q.description, title);
            for (const ex of examples) {
                testCaseDocs.push({
                    quesId,
                    input: ex.input,
                    output: ex.output,
                    explaination: ex.explaination || '',
                    timeLimit: 1000,
                    memoryLimit: 256
                });
            }

            // Starter Code
            const params = extractParams(examples.length > 0 ? examples[0].input : '');
            const starters = generateStarterCodes(title, params);
            for (const sc of starters) {
                starterCodeOps.push({
                    updateOne: {
                        filter: { quesId, language: sc.language },
                        update: {
                            $set: {
                                quesId,
                                language: sc.language,
                                code: sc.code,
                                modifiedAt: new Date()
                            },
                            $setOnInsert: {
                                createdAt: new Date()
                            }
                        },
                        upsert: true
                    }
                });
            }

            // Hints
            const hints = [
                `Carefully examine problem constraints and edge cases for "${title}".`,
                `Applicable patterns & tags: ${tags.length > 0 ? tags.join(', ') : 'Standard algorithmic techniques'}.`,
                `Think about optimal time and space complexity tradeoffs (e.g. O(n) or O(n log n)).`
            ];
            hintOps.push({
                updateOne: {
                    filter: { quesId },
                    update: {
                        $set: {
                            quesId,
                            hints,
                            modifiedAt: new Date()
                        },
                        $setOnInsert: {
                            createdAt: new Date()
                        }
                    },
                    upsert: true
                }
            });
        }

        // Execute batch DB operations in parallel
        await Promise.all([
            Constraints.bulkWrite(constraintOps, { ordered: false }),
            ProblemList.bulkWrite(problemOps, { ordered: false }),
            StarterCode.bulkWrite(starterCodeOps, { ordered: false }),
            Hint.bulkWrite(hintOps, { ordered: false }),
            (async () => {
                await TestCase.deleteMany({ quesId: { $in: batchQuesIds } });
                if (testCaseDocs.length > 0) {
                    await TestCase.insertMany(testCaseDocs, { ordered: false });
                }
            })()
        ]);

        processedCount += batch.length;
        totalTestCasesInserted += testCaseDocs.length;
        const progressPct = ((processedCount / totalQuestions) * 100).toFixed(1);
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`⏩ [${progressPct}%] Seeded ${processedCount}/${totalQuestions} problems (${totalTestCasesInserted} test cases) in ${elapsedSec}s`);
    }

    // Final verification counts
    const finalProblemCount = await ProblemList.countDocuments();
    const finalTestCaseCount = await TestCase.countDocuments();
    const finalStarterCodeCount = await StarterCode.countDocuments();
    const finalConstraintsCount = await Constraints.countDocuments();
    const finalHintCount = await Hint.countDocuments();

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n======================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`⏱ Total Time Taken: ${totalDuration} seconds`);
    console.log(`📊 Final Database Status:`);
    console.log(`   - Problems in ProblemList: ${finalProblemCount}`);
    console.log(`   - Test Cases in TestCase: ${finalTestCaseCount}`);
    console.log(`   - Starter Codes in StarterCode: ${finalStarterCodeCount}`);
    console.log(`   - Constraints in Constraints: ${finalConstraintsCount}`);
    console.log(`   - Hints in Hint: ${finalHintCount}`);
    console.log('======================================================\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
}

seedLeetCodeProblems().catch(err => {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
});
