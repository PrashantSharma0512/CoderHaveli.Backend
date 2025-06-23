const problemController = {}
const axios = require('axios')
const mongoose = require('mongoose')
const getAllProblems = async (req, res) => {
    try {
        const Problem = mongoose.model('ProblemList');
        const problems = await Problem.find({}, { _id: 1, quesName: 1, difficulty: 1, tags: 1 });
        res.json(problems);
    } catch (error) {
        console.error('Error fetching problems:', error);
        return res.status(500).json({ error: error.message });
    }
}

const getProblemById = async (req, res) => {
    try {
        const Problem = mongoose.model('ProblemList');
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid problem ID format" });
        }
        const getProblem = await Problem.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(id) }
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
        const ProblemList = mongoose.model('ProblemList');
        const Approaches = mongoose.model('Approaches');

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
    try {
        const Submission = mongoose.model('Submission')
        const { lang, code, testcases } = req.body;
        if (!testcases?.length) {
            return res.status(400).json({ error: 'No test cases provided' });
        }
        const compilerUrl = process.env.COMPILER;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 25000, // 25 seconds timeout (Render free tier has 30s limit)
        };
        const response = await axios.post(
            `${compilerUrl}/api/batch`,
            {
                language: lang,
                code: code,
                testcases: testcases
            },
            config
        );
        // const status = response.data.isFullyPassed === true ? 'Accepted' : 'Wrong Answer';

        // await Submission.updateOne(
        //     {
        //         // user: req.user._id,
        //         quesId: req.body.quesId
        //     },
        //     {
        //         code: code,
        //         codelanguage: lang,
        //         status: status,
        //         modifiedAt: new Date()
        //     }, { upsert: true });
        return res.json(response.data);

    } catch (err) {
        console.error('Compiler service error:', err);

        if (err.response) {
            // The request was made and the server responded with a status code
            console.error('Response data:', err.response.data);
            console.error('Response status:', err.response.status);

            if (err.response.status === 502) {
                return res.status(503).json({
                    error: 'Compiler service unavailable',
                    details: 'The compiler service returned a 502 Bad Gateway error. Please check if it is running.'
                });
            }

            return res.status(err.response.status).json({
                error: 'Compiler service error',
                details: err.response.data
            });
        } else if (err.request) {
            // The request was made but no response was received
            return res.status(504).json({
                error: 'Compiler service timeout',
                details: 'The compiler service did not respond in time'
            });
        } else {
            // Something happened in setting up the request
            return res.status(500).json({
                error: 'Internal server error',
                details: err.message
            });
        }
    }
};

const submit = async (req, res) => {
    try {
        const { quesId, lang, code } = req.body;
        const Testcase = mongoose.model('TestCase');
        const testcases = await Testcase.find({ quesId: quesId }, { input: 1, output: 1, });
        if (!testcases?.length) {
            return res.status(400).json({ error: 'No test cases provided' });
        }
        const compilerUrl = process.env.COMPILER;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 25000,
        };

        const response = await axios.post(
            `${compilerUrl}/api/batch`,
            {
                language: lang,
                code: code,
                testcases: testcases
            },
            config
        );

        console.log("pra", response.data);
        return res.json(response.data);

    } catch (err) {
        console.error('Compiler service error:', err);

        if (err.response) {
            // The request was made and the server responded with a status code
            console.error('Response data:', err.response.data);
            console.error('Response status:', err.response.status);

            if (err.response.status === 502) {
                return res.status(503).json({
                    error: 'Compiler service unavailable',
                    details: 'The compiler service returned a 502 Bad Gateway error. Please check if it is running.'
                });
            }

            return res.status(err.response.status).json({
                error: 'Compiler service error',
                details: err.response.data
            });
        } else if (err.request) {
            // The request was made but no response was received
            return res.status(504).json({
                error: 'Compiler service timeout',
                details: 'The compiler service did not respond in time'
            });
        } else {
            // Something happened in setting up the request
            return res.status(500).json({
                error: 'Internal server error',
                details: err.message
            });
        }
    }
}

problemController.getAllProblems = getAllProblems;
problemController.getProblemById = getProblemById;
problemController.getEditorialById = getEditorialById;
problemController.run = run;
problemController.submit = submit;
module.exports = problemController;