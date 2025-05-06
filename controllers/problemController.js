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
        console.log('id', id);

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
const getEditorialById = async (req, res) => {
    try {
        const { id } = req.params;
        const problem = nosq.model('ProblemList')
        const quesId = problem.findOne({ _id: new nosql.Types.ObjectId(id) })
        const Approaches = nosq.model('Approaches')
        const data = Approaches.find(
            { quesId: quesId },
            {
                approachDesc : 1 ,
                approachType: 1,
                code:1,
                time_complexity: 1,
                space_complexity:1,
            }
        )
        res.send(data)
    } catch (error) {
        console.log('error ', error);
        res.send(error.message)

    }
}



problemController.getAllProblems = getAllProblems;
problemController.getProblemById = getProblemById;
problemController.getEditorialById = getEditorialById;
module.exports = problemController;