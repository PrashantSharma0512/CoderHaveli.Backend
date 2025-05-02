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
        const {id} = req.params;
        
        const quesid  = await Problem.find({_id : id});
        console.log(quesid);
        
        const getProblem = await Problem.aggregate([
            {
                $match: { _id: new nosql.Types.ObjectId(id) }
            },
            {
                $lookup: {
                    from: 'problemexamples',
                    localField: 'quesId',
                    foreignField: 'quesId',
                    as: 'problemDetails'
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
            {$unwind: '$constraints'},
            {
                $lookup: {
                    from: 'faqs',
                    localField: 'quesId',
                    foreignField: 'quesId',
                    as: 'faqs'
                }
            },
            // {$unwind: '$faqs'},
            {
                $project: {
                    quesId: 1,
                    quesName: 1,
                    quesDesc: 1,
                    difficulty: 1,
                    problemExample: {
                        input: '$problemDetails.input',
                        output: '$problemDetails.output',
                        explaination: '$problemDetails.explaination'
                    },
                    faqs: {
                        question: '$faqs.question',
                        answer: '$faqs.answer'
                    },
                    contraints: '$constraints.contraints',

                    submissions: 1,
                    community: 1
                }
            }
        ]);
        res.json(getProblem);
    } catch (error) {
        console.error('Error fetching problem:', error);
        return res.status(500).json({ error: error.message });
    }
}   
// const getProblemById = async (req, res) => {
//     try {
//         const Problem = nosql.model('ProblemList');
//         const { id } = req.params;
        
//         const getProblem = await Problem.aggregate([
//             {
//                 $match: { _id: new nosql.Types.ObjectId(id) }
//             },
//             {
//                 $lookup: {
//                     from: 'problemexamples',
//                     localField: 'quesId',
//                     foreignField: 'quesId',
//                     as: 'problemExamples'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'constraints',
//                     localField: 'quesId',
//                     foreignField: 'quesId',
//                     as: 'constraints'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'faqs',
//                     localField: 'quesId',
//                     foreignField: 'quesId',
//                     as: 'faqs'
//                 }
//             },
//             {
//                 $project: {
//                     quesId: 1,
//                     quesName: 1,
//                     quesDesc: 1,
//                     difficulty: 1,
//                     problemExamples: {
//                         $map: {
//                             input: '$problemExamples',
//                             as: 'example',
//                             in: {
//                                 input: '$$example.input',
//                                 output: '$$example.output',
//                                 explanation: '$$example.explaination'
//                             }
//                         }
//                     },
//                     faqs: {
//                         $map: {
//                             input: '$faqs',
//                             as: 'faq',
//                             in: {
//                                 question: '$$faq.question',
//                                 answer: '$$faq.answer'
//                             }
//                         }
//                     },
//                     constraints: {
//                         $ifNull: [
//                             { $arrayElemAt: ['$constraints.contraints', 0] },
//                             []
//                         ]
//                     },
//                     submissions: 1,
//                     createdAt: 1
//                 }
//             }
//         ]);

//         if (!getProblem || getProblem.length === 0) {
//             return res.status(404).json({ error: 'Problem not found' });
//         }

//         res.json(getProblem[0]);
//     } catch (error) {
//         console.error('Error fetching problem:', error);
//         return res.status(500).json({ error: error.message });
//     }
// };



problemController.getAllProblems = getAllProblems;
problemController.getProblemById = getProblemById;
module.exports = problemController;