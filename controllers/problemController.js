const problemController = {}


const getAllProblems = async (req, res) => {
    try {
        const Problem = nosql.model('ProblemList');
        const problems = await Problem.find({},{_id:1,quesName:1,difficulty:1,tags:1});
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
                    constraints: "$constraints.contraints",
                    tags: 1,
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
                videoUrl:1,
                order: 1,
            } 
        );

        res.status(200).json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};






problemController.getAllProblems = getAllProblems;
problemController.getProblemById = getProblemById;
problemController.getEditorialById = getEditorialById;
module.exports = problemController;