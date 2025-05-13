const { get } = require("mongoose");

const problemController = {}


const getAllProblems = async (req, res) => {
    try {
        const Problem = nosql.model('Problem');
        const problems = await Problem.find();
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

        const getProblem = await Problem.aggregate([
            {
                $match: { _id: new nosql.Types.ObjectId(id) }
            },
            {
                $lookup: {
                    from: 'problemexamples',
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
                    hints: "$hints.hints",
                    constraints: "$constraints.contraints"
                }
            }
        ]);

        res.json(getProblem);
    } catch (error) {
        console.error('Error fetching problem:', error);
        return res.status(500).json({ error: error.message });
    }
};
// const getEditorialById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const problem = nosql.model('ProblemList')
//         const quesIndex = await problem.findOne({ _id: id },{quesId : 1});
//         const Approaches = nosql.model('Approaches')
//         const data = await Approaches.find(
//             { quesId: quesIndex }
//             // {
//             //     approachDesc : 1 ,
//             //     approachType: 1,
//             //     code:1,
//             //     time_complexity: 1,
//             //     space_complexity:1,
//             // }
//         )
//         res.send(data)

//     } catch (error) {
//         console.error('error ', error);
//         res.send(error.message)

//     }
// }
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

        const data = await Approaches.findOne(
            { quesId: quesIndex.quesId },
            {
                approachDesc: 1,
                approachType: 1,
                code: 1,
                time_complexity: 1,
                space_complexity: 1,
            }
        );

        res.status(200).json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};
// const getEditorialById = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const ProblemList = nosql.model('ProblemList');
//         const Approaches = nosql.model('Approaches');

//         const quesIndex = await ProblemList.findOne({ _id: id }, { quesId: 1 }).lean();
//         if (!quesIndex) {
//             return res.status(404).json({ message: "Problem not found" });
//         }

// 

//         // Fetching approaches using quesId without $lookup
//         const data = await Approaches.find(
//             { quesId: quesIndex.quesId },
//             // {
//             //     approachDesc: 1,
//             //     approachType: 1,
//             //     code: 1,
//             //     time_complexity: 1,
//             //     space_complexity: 1,
//             // }
//         ).lean();

//         res.status(200).json(data);
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ message: error.message });
//     }
// };




problemController.getAllProblems = getAllProblems;
problemController.getProblemById = getProblemById;
problemController.getEditorialById = getEditorialById;
module.exports = problemController;