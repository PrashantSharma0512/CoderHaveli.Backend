const problemController = {}
const axios = require('axios')

const getAllProblems = async (req, res) => {
    try {
        const Problem = nosql.model('ProblemList');
        const problems = await Problem.find({}, { _id: 1, quesName: 1, difficulty: 1, tags: 1 });
        res.json(problems);
    } catch (error) {
        console.error('Error fetching problems:', error);
        return res.status(500).json({ error: error.message });
    }
}


const getProblemById = async (req, res) => {
    try {
        const Problem = nosql.model('ProblemList');
        const { id } = req.params;

        if (!nosql.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid problem ID format" });
        }
        const getProblem = await Problem.aggregate([
            {
                $match: { _id: new nosql.Types.ObjectId(id) }
            },
            {
                $lookup: {
                    from: 'testcases',
                    localField: 'quesId',
                    foreignField: 'quesId',
                    as: 'problemExample'
                }
            },
            {
                $lookup: {
                    from: 'constraints',
                    localField: 'quesId',
                    foreignField: 'quesId',
                    as: 'constraints'
                }
            },
            { $unwind: { path: '$constraints', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'hints',
                    localField: 'quesId',
                    foreignField: 'quesId',
                    as: 'hints'
                }
            },
            { $unwind: { path: '$hints', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    quesId: 1,
                    quesName: 1,
                    quesDesc: 1,
                    difficulty: 1,
                    problemExample: {
                        $slice: [
                            {
                                $map: {
                                    input: "$problemExample",
                                    as: "example",
                                    in: {
                                        input: "$$example.input",
                                        output: "$$example.output",
                                        explaination: "$$example.explaination"
                                    }
                                }
                            },
                            3
                        ]
                    },
                    hints: "$hints.hints",
                    constraints: "$constraints.contraints",
                    tags: 1
                }
            }

        ]);

        res.json(getProblem);
    } catch (error) {
        console.error('Error fetching problem:', error);
        return res.status(500).json({ error: error.message });
    }
};

const getEditorialById = async (req, res) => {
    try {
        const { id } = req.params;
        const ProblemList = nosql.model('ProblemList');
        const Approaches = nosql.model('Approaches');

        const quesIndex = await ProblemList.findOne({ _id: id }, { quesId: 1 });
        if (!quesIndex) {
            return res.status(404).json({ message: "Problem not found" });
        }


        // const data = await Approaches.aggregate([
        //     {
        //         $lookup: {
        //             from: 'problemlists',
        //             localField: 'quesId',
        //             foreignField: 'quesIndex.quesId',
        //             as: 'approachesData'
        //         }
        //     },
        //     {
        //         $unwind: '$approachesData'
        //     },
        //     {
        //         $project: {
        //             approachDesc: 1,
        //             approachType: 1,
        //             code: 1,
        //             time_complexity: 1,
        //             space_complexity: 1,
        //         }
        //     }
        // ])

        const data = await Approaches.find(
            { quesId: quesIndex.quesId },
            {
                approachDesc: 1,
                approachType: 1,
                code: 1,
                time_complexity: 1,
                space_complexity: 1,
                videoUrl: 1,
                order: 1,
            }
        );

        res.status(200).json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};

const run = async (req, res) => {
    const { quesId, code, lang } = req.body;

    const Submission = nosql.model('Submission');
    const TestCase = nosql.model('TestCase');

    try {
        // Save or update the submission

        console.log(quesId);

        // Fetch all test cases for the question
        const testcases = await TestCase.find({ quesId });

        if (!testcases.length) return res.status(404).json({ error: 'No test cases found' });

        // Language mapping (adjust based on Judge0's supported languages)
        const langMap = {
            'cpp': 54,
            'c': 50,
            'java': 62,
            'python': 71,
            'javascript': 63
        };

        const language_id = langMap[lang.toLowerCase()];
        if (!language_id) return res.status(400).json({ error: 'Unsupported language' });

        const judgeURL = process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
        const headers = {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        };

        const results = [];

        // Loop over each test case
        for (let test of testcases) {
            const submissionPayload = {
                source_code: code,
                language_id,
                stdin: test.input,
                expected_output: test.output,
                cpu_time_limit: test.timeLimit / 1000, // ms to seconds
                memory_limit: test.memoryLimit * 1024 // MB to KB
            };

            // Send submission to Judge0
            const { data: tokenData } = await axios.post(
                `${judgeURL}/submissions?base64_encoded=false&wait=true`,
                submissionPayload,
                { headers }
            );

            const status = tokenData.status.description;
            const output = tokenData.stdout?.trim();
            const expected = test.output?.trim();

            results.push({
                input: test.input,
                output,
                expected,
                status,
                isCorrect: output === expected
            });
        }

        const allPassed = results.every(r => r.isCorrect);
        const message =  allPassed ? 'Accepted' : 'Wrong Answer'
        await Submission.updateOne(
            { quesId },
            { $set: { codelanguage: lang, code: code , status : message } },
            { upsert: true }
        );
        res.json({
            message:message,
            details: results
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error', err: err.message });
    }
};


problemController.getAllProblems = getAllProblems;
problemController.getProblemById = getProblemById;
problemController.getEditorialById = getEditorialById;
problemController.run = run;
module.exports = problemController;