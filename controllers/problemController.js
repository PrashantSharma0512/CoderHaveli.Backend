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
        const { id } = req.query;

        // ✅ Validate ObjectId before using it
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

        const data = await Approaches.find(
            { quesId: quesIndex.quesId },
            {
                approachDesc: 1,
                approachName: 1,
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
        const Code = mongoose.model('Code')
        const { lang, code, testcases, } = req.body;
        if (!lang || typeof lang !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid language' });
        }

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid code' });
        }

        if (!testcases?.length) {
            return res.status(400).json({ error: 'No test cases provided' });
        }

        const compilerUrl = process.env.COMPILER;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 25000, // 25 seconds timeout (Render free tier has 90s limit)
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
        const { quesId, lang, code, userId } = req.body;

        // Validate required fields
        if (!quesId || !lang || !code || !userId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const Testcase = mongoose.model('TestCase');
        const Submission = mongoose.model('Submission');
        const Code = mongoose.model('Code');

        // Get test cases
        const testcases = await Testcase.find({ quesId }, { input: 1, output: 1 });
        if (!testcases?.length) {
            return res.status(400).json({ error: 'No test cases found for this question' });
        }

        // Compile and test the code
        const compilerUrl = process.env.COMPILER;
        const config = {
            headers: { 'Content-Type': 'application/json' },
            timeout: 250000,
        };

        const response = await axios.post(
            `${compilerUrl}/api/batch`,
            { language: lang, code, testcases },
            config
        );

        // Determine submission status
        const status = response.data.isFullyPassed ? 'Accepted' : 'Wrong Answer';
        const executionTime = response.data.totalExecutionTime || 0;

        // Create new Code document
        const newCode = new Code({
            userId,
            quesId,
            code,
            codelanguage: lang,
            createdAt: new Date(),
            modifiedAt: new Date()
        });
        const savedCode = await newCode.save();

        // Create new Submission document
        const newSubmission = new Submission({
            userId,
            quesId,
            code: new mongoose.Types.ObjectId(savedCode._id),
            codelanguage: lang,
            status,
            execution_time: executionTime,
            createdAt: new Date(),
            modifiedAt: new Date()
        });
        const savedSubmission = await newSubmission.save();

        return res.json({
            ...response.data,
            submissionId: savedSubmission._id,
            codeId: savedCode._id
        });

    } catch (err) {
        console.error('Submission error:', err);

        // Handle specific error cases
        if (err instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({
                error: 'Validation error',
                details: err.message
            });
        }

        if (err.response) {
            // Compiler service responded with error
            const status = err.response.status === 502 ? 503 : err.response.status;
            return res.status(status).json({
                error: 'Compiler service error',
                details: err.response.data || 'Unknown compiler error'
            });
        }

        if (err.request) {
            // No response from compiler
            return res.status(504).json({
                error: 'Compiler service timeout',
                details: 'The compiler service did not respond in time'
            });
        }

        // Other errors
        return res.status(500).json({
            error: 'Internal server error',
            details: err.message
        });
    }
};

const getSubmission = async (req, res) => {
    try {
        const { userId, quesId } = req.params;

        const Submission = mongoose.model('Submission');

        const submissions = await Submission.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    quesId: quesId
                }
            },
            {
                $project: {
                    _id: 0,
                    // "QNo": "$quesId",
                    Language: "$codelanguage",
                    Status: "$status",
                    "Execution Time": "$execution_time",
                    "Submission Time": "$createdAt",
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.status(200).json(submissions);
    } catch (error) {
        console.error("Error in getting submission", error);
        res.status(500).send('Internal server error');
    }
}

const getStarterCode = async (req, res) => {
    try {
        const { quesId, language } = req.query;

        // ✅ Validate presence
        if (!quesId || !language) {
            return res.status(400).json({
                error: "Missing required query parameters: 'quesId' and 'language'."
            });
        }

        // ✅ Validate allowed languages
        const allowedLanguages = ['javascript', 'python', 'java', 'cpp'];
        if (!allowedLanguages.includes(language.toLowerCase())) {
            return res.status(400).json({
                error: `Invalid language. Allowed values are: ${allowedLanguages.join(', ')}.`
            });
        }

        // ✅ Optional: Validate quesId format (if ObjectId is expected elsewhere)
        if (typeof quesId !== 'string') {
            return res.status(400).json({
                error: "Invalid 'quesId'. It must be a string."
            });
        }

        const StarterCode = mongoose.model('StarterCode');

        const skeleton = await StarterCode.aggregate([
            {
                $match: {
                    quesId: quesId,
                    language: language.toLowerCase()
                }
            },
            {
                $project: {
                    code: 1,
                    _id: 0
                }
            }
        ]);

        if (!skeleton || skeleton.length === 0) {
            return res.status(404).json({
                error: "Starter code not found for the given quesId and language."
            });
        }

        return res.status(200).json(skeleton[0]); // return single object not array
    } catch (error) {
        console.error("Error getting starter code:", error);
        return res.status(500).json({
            error: "Internal server error",
            details: error.message
        });
    }
};

const fetchComment = async (req, res) => {
    try {
        const { quesId, userId } = req.query;
        if (!quesId) {
            return res.status(400).json({ error: "Missing quesId in query" });
        }
        if (!userId) {
            return res.status(400).json({ error: "Missing userId in query" });
        }

        const Comment = mongoose.model("Comment");
        const User = mongoose.model("User");

        // Fetch logged-in user's minimal info (if needed separately)
        const userData = await User.findById(userId, { avatar: 1, name: 1 });

        // Fetch comments & populate author with name + avatar
        const comments = await Comment.find({ quesId, isDeleted: false })
            .populate("author", "avatar name") // populate correct field
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, comments, userData });
    } catch (error) {
        console.error("Error in fetchComment:", error);
        res.status(500).json({ error: "Server error while fetching comments" });
    }
};


const addComment = async (req, res) => {
    try {
        const { quesId, content, commentType, author, parentComment } = req.body;
        const Comment = mongoose.model("Comment");


        if (!quesId || !content || !commentType || !author) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newComment = new Comment({
            quesId,
            content,
            type: commentType,
            author: author,
            parentComment: parentComment || null,
        });

        await newComment.save();

        res.status(201).json({ success: true, comment: 'comment add sucessfully' });
    } catch (error) {
        console.error("Error in addComment:", error);
        res.status(500).json({ error: "Server error while adding comment" });
    }
};
const editComment = async (req, res) => {
    try {
        const Comment = mongoose.model('Comment');
        const { id, content, type } = req.body;

        if (!id || !content) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const updated = await Comment.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
            { $set: { content, type: type, updatedAt: new Date() } },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: "Comment not found" });
        }

        res.status(200).json({ success: true, updated });
    } catch (error) {
        console.error("Error editing comment:", error);
        res.status(500).json({ error: "Server error" });
    }
};

const deleteComment = async (req, res) => {
    try {
        const Comment = mongoose.model("Comment");
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: "Comment Id not found" });
        }
        const deletedComment = await Comment.findOneAndUpdate(
            { _id: id },
            { $set: { isDeleted: true } },
            { new: true }
        );

        if (!deletedComment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        res.status(200).json({ message: "Comment deleted successfully", deletedComment });
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ error: "Server error" });
    }
};

const addLike = async (req, res) => {
    try {
        const Comment = mongoose.model("Comment");
        const { id, userId } = req.body;

        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }

        const alreadyLiked = comment.likes.includes(userId);

        if (alreadyLiked) {
            // Remove like if already liked (toggle functionality)
            await Comment.findByIdAndUpdate(
                id,
                { $pull: { likes: userId } },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: "Like removed",
                liked: false
            });
        } else {
            // Add like if not already liked
            await Comment.findByIdAndUpdate(
                id,
                { $addToSet: { likes: userId } }, // Using $addToSet to prevent duplicates
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: "Like added",
                liked: true
            });
        }
    } catch (error) {
        console.error("Error adding like:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// admin

const addQuestion = async (req, res) => {
    try {
        const { question } = req.body;
        const { quesId, quesName, quesDesc, languages, hints, testcases, difficulty, tags, code, constraints } = question;
        if (!quesId || !quesName || !quesDesc || !languages || !hints || !testcases || !difficulty || !tags || !code || !constraints) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }
        const ProblemList = mongoose.model('ProblemList');
        const TestCase = mongoose.model('TestCase');
        const Hint = mongoose.model('Hint');
        const StarterCode = mongoose.model('StarterCode');
        const Constraints = mongoose.model('Constraints');

        const constraintResult = await Constraints.findOneAndUpdate(
            { quesId: quesId },
            {
                $set: {
                    quesId: quesId,
                    constraints: constraints,
                    createdAt: new Date(),
                }
            },
            {
                upsert: true, new: true
            }
        )
        await ProblemList.findOneAndUpdate(
            {
                quesId: quesId
            },
            {
                $set: {
                    quesId: quesId,
                    quesName: quesName,
                    quesDesc: quesDesc,
                    languages: languages,
                    difficulty: difficulty,
                    constraints: constraintResult._id,
                    tags: tags,
                    createdAt: new Date(),
                }
            },
            {
                upsert: true, new: true
            }
        );

        await Hint.findOneAndUpdate(
            { quesId: quesId },
            {
                $set: {
                    quesId: quesId,
                    hints: hints,
                    createdAt: new Date(),
                }
            },
            {
                upsert: true, new: true
            }
        );
        testcases.map(async testcase => {
            await TestCase.findOneAndUpdate(
                { quesId: quesId },
                {
                    $set: {
                        quesId: quesId,
                        input: testcase.input,
                        output: testcase.output,
                        explaination: testcase.explaination,
                        memoryLimit: testcase.memoryLimit,
                        timeLimit: testcase.timeLimit
                    }
                }
            )
        })
        for (const [language, starterCode] of Object.entries(code)) {
            await StarterCode.findOneAndUpdate(
                { quesId: quesId, language: language },
                {
                    $set: {
                        quesId: quesId,
                        language: language,
                        code: starterCode
                    }
                },
                { upsert: true, new: true }
            );
        }

        res.status(201).json({ success: true, message: "Question added successfully" });
    } catch (error) {
        console.error("error while adding question", error);
        res.status(500).json({ success: false, error: error.message });
    }
}


problemController.getAllProblems = getAllProblems;
problemController.fetchComment = fetchComment
problemController.addComment = addComment
problemController.editComment = editComment
problemController.deleteComment = deleteComment
problemController.getEditorialById = getEditorialById;
problemController.run = run;
problemController.submit = submit;
problemController.getSubmission = getSubmission;
problemController.getStarterCode = getStarterCode;
problemController.getProblemById = getProblemById;
problemController.addLike = addLike;
problemController.addQuestion = addQuestion;

module.exports = problemController;