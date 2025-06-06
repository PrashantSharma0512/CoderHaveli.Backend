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

// const run = async (req, res) => {
//     try {
//         const { quesId, lang, code, testcases } = req.body;
//         if (!testcases.length) return res.status(404).json({ error: 'No test cases found' });
//         const langMap = {
//             java: 'java',
//             cpp: 'cpp',
//             python: 'py',
//             js: 'js',
//             javascript: 'js'
//         };
//         const language = langMap[lang.toLowerCase()];

//         if (!language) return res.status(400).json({ error: 'Unsupported language' });
//         const compilerUrl = process.env.COMPILER;

//         const config = {
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             withCredentials: true,
//             // timeout: 60000,
//         };
//         const results = [];
//         console.log(compilerUrl, "compiler url");
//         const response = await axios.post(
//             `${compilerUrl}/api/batch`, {
//             language: lang,
//             code: code,
//             testcases: testcases
//         },
//             config
//         );
// console.log(response,'response');

//         if (response.data.error) {
//             return res.status(400).json({ error: response.data.error });
//         }
//         return res.json(response.data);
//     } catch (err) {
//         console.error('Error occurred:', err);
//         if (err.response) {
//             console.error('Response data:', err.response.data);
//             console.error('Response status:', err.response.status);
//             console.error('Response headers:', err.response.headers);
//         } else if (err.request) {
//             console.error('No response received:', err.request);
//         } else {
//             console.error('Error setting up request:', err.message);
//         }

//         res.status(500).send({ message: 'Internal Server Error', details: err.message });
//     }

// };

const run = async (req, res) => {
    try {
        const { lang, code, testcases } = req.body;
        
        if (!testcases?.length) {
            return res.status(400).json({ error: 'No test cases provided' });
        }

        const compilerUrl = 'https://coderhaveli-compiler.onrender.com';
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 25000, // 25 seconds timeout (Render free tier has 30s limit)
        };

        console.log(`Sending request to compiler: ${compilerUrl}/api/batch`);
        
        const response = await axios.post(
            `${compilerUrl}/api/batch`,
            {
                language: lang,
                code: code,
                testcases: testcases
            },
            config
        );

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


problemController.getAllProblems = getAllProblems;
problemController.getProblemById = getProblemById;
problemController.getEditorialById = getEditorialById;
problemController.run = run;
module.exports = problemController;