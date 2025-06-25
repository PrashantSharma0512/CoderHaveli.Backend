const indexController = {}
const mongoose = require('mongoose')

const Profile = async (req, res) => {
    try {
        
        const { id } = req.query;
        
        // Validate ID
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Validate MongoDB ID format if needed
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const User = mongoose.model('User');
        const user = await User.findOne({ _id: id }).select('-password -refreshToken'); // Exclude sensitive fields

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Profile API Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}
const getCourseData = async (req, res) => {
    try {
        const Course = mongoose.model('Course');

        const courseData = await Course.aggregate([
            {
                $lookup: {
                    from: 'images', // Collection name for Image model
                    localField: 'image',
                    foreignField: '_id',
                    as: 'imageData'
                }
            },
            { $unwind: { path: '$imageData', preserveNullAndEmptyArrays: true } }, // Flatten imageData array
            {
                $lookup: {
                    from: 'instructors', // Collection name for Instructor model
                    localField: 'instructor',
                    foreignField: '_id',
                    as: 'instructorData'
                }
            },
            { $unwind: { path: '$instructorData', preserveNullAndEmptyArrays: true } }, // Flatten instructorData array
            {
                $lookup: {
                    from: 'categories', // Collection name for Category model
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryData'
                }
            },
            { $unwind: { path: '$categoryData', preserveNullAndEmptyArrays: true } }, // Flatten categoryData array
            {
                $match: { 'imageData.imageType': 'course' } // Filter images with type 'course'
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    price: 1,
                    duration: 1,
                    'image.url': '$imageData.url',
                    'image.imageId': '$imageData.imageId',
                    'instructor.name': '$instructorData.name',
                    'category.name': '$categoryData.name'
                }
            }
        ]);

        res.json(courseData);
    } catch (error) {
        console.error('Error fetching course data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
const getCarouselData = async (req, res) => {
    try {
        const Image = mongoose.model('Image');

        const carouselData = await Image.find({ imageType: 'carousel' }, { url: 1, _id: 0 });

        res.json(carouselData);
    } catch (error) {
        console.error('Error fetching carousel data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getTutorialData = async (req, res) => {
    try {
        const Tutorial = mongoose.model('Tutorial');
        const tutorialData = await Tutorial.aggregate([
            {
                $lookup: {
                    from: 'images',
                    localField: 'image',
                    foreignField: '_id',
                    as: 'imageData'
                }
            },
            {
                $unwind: { path: '$imageData', preserveNullAndEmptyArrays: true }
            },
            {
                $match: { 'imageData.imageType': 'tutorial' } // Match only 'tutorial' images
            },
            {
                $lookup: {
                    from: 'instructors',
                    localField: 'instructor',
                    foreignField: '_id',
                    as: 'instructorData'
                }
            },
            {
                $unwind: { path: '$instructorData', preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryData'
                }
            },
            {
                $unwind: { path: '$categoryData', preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    price: 1,
                    duration: 1,
                    image: { url: '$imageData.url', imageId: '$imageData.imageId' },
                    instructor: { name: '$instructorData.name' },
                    category: { name: '$categoryData.name' }
                }
            }
        ]);
        res.json(tutorialData);
    } catch (error) {
        console.error('Error fetching card data:', error);
        return res.status(500).json({ error: error.message });
    }
};

const getProblemData = async (req, res) => {
    try {
        const ProblemList = mongoose.model('ProblemList');

        const problemData = await ProblemList.aggregate([
            {
                $lookup: {
                    from: 'codes',
                    localField: 'quesID',
                    foreignField: 'quesID',
                    as: 'codeData'
                }
            },
            {
                $lookup: {
                    from: 'problemexamples', // collection names are lowercase and plural by default
                    localField: 'quesID',
                    foreignField: 'quesID',
                    as: 'exampleData'
                }
            },
            {
                $lookup: {
                    from: 'constraints', // corrected typo and collection name
                    localField: 'quesID',
                    foreignField: 'quesID',
                    as: 'constraintsData'
                }
            },
            {
                $unwind: {
                    path: '$exampleData',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$constraintsData',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    quesID: 1,
                    quesName: 1,
                    quesDesc: 1,
                    difficulty: 1,
                    code: { $arrayElemAt: ['$codeData.code', 0] },
                    codeLanguage: { $arrayElemAt: ['$codeData.language', 0] },
                    exampleInput: '$exampleData.input',
                    exampleOutput: '$exampleData.output',
                    exampleExplanation: '$exampleData.explaination',
                    constraints: '$constraintsData.contraints', // keeping the model's field spelling
                    createdAt: 1,
                    modifiedAt: 1
                }
            }
        ]);

        res.json(problemData);
    } catch (error) {
        console.error('Error fetching problem data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getInstructorData = async (req, res) => {
    try {
        const Instructor = mongoose.model('Instructor');
        const instructorData = await Instructor.find({}, { name: 1, email: 1, bio: 1 });
        res.json(instructorData);
    } catch (error) {
        console.error('Error fetching instructor data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getCategoryData = async (req, res) => {
    try {
        const Category = mongoose.model('Category');
        const categoryData = await Category.find({}, { name: 1 });
        res.json(categoryData);
    } catch (error) {
        console.error('Error fetching category data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}





indexController.getCourseData = getCourseData;
indexController.getCarouselData = getCarouselData;
indexController.getTutorialData = getTutorialData;
indexController.getInstructorData = getInstructorData;
indexController.getCategoryData = getCategoryData;
indexController.getProblemData = getProblemData;
indexController.Profile = Profile;

module.exports = indexController;