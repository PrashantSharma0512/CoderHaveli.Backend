const indexController = {}
const mongoose = require('mongoose');
const { uploadDirectly } = require('../utils/Upload');
const connectRedis = require("../utils/redis");

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

const updateProfile = async (req, res) => {
    try {
        const User = mongoose.model('User');
        const { name, bio, phone, id, avatar } = req.body;

        // Validate required fields
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required',
                code: 'MISSING_USER_ID'
            });
        }

        const updateData = {
            ...(name && { name }),
            ...(bio && { bio }),
            ...(phone && { phone }),
            updatedAt: new Date()
        };


        // Process avatar if provided as base64
        if (avatar) {
            try {
                console.log('Starting Cloudinary upload...');

                // Validate base64 string format
                if (!avatar.startsWith('data:image/')) {
                    throw new Error('Invalid base64 image format');
                }

                const uploadResult = await uploadDirectly(avatar, {
                    folder: 'user_avatars',
                    transformation: [
                        { width: 300, height: 300, crop: 'fill' },
                        { quality: 'auto' }
                    ]
                });

                updateData.avatar = uploadResult.secure_url;
                console.log('Avatar upload successful');

            } catch (uploadError) {
                console.error('Cloudinary upload failed:', uploadError.message);
                return res.status(400).json({
                    success: false,
                    error: 'Invalid image upload',
                    code: 'INVALID_IMAGE',
                    details: uploadError.message
                });
            }
        }


        // Update user data
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updateData },
            {
                new: true,
                runValidators: true,
                context: 'query'
            }
        ).select('-password -__v -resetPasswordToken');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        return res.status(200).json({
            success: true,
            data: updatedUser,
            message: "Profile updated successfully"
        });

    } catch (error) {
        console.error('Profile update error:', error.message);

        // Handle specific error types
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors,
                code: 'VALIDATION_ERROR'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            code: 'SERVER_ERROR',
            ...(process.env.NODE_ENV === 'development' && {
                details: error.message
            })
        });
    }
};

const getCourseData = async (req, res) => {
    try {
        const Course = mongoose.model("Course");
        const Subscription = mongoose.model("Subscription");
        const { userId } = req.query;

        const client = await connectRedis();
        // const client = 'hhh';

        const cacheKey = userId ? `courses:user:${userId}` : "courses:all";

        const cached = await client.get(cacheKey);
        if (cached) {
            console.info("Data Are Come From Redis")
            return res.json(JSON.parse(cached));
        }

        let excludeCourseIds = [];
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const subscriptions = await Subscription.find({
                user: userId,
                isDeleted: false,
                courseType: "course",
            }).select("course");
            excludeCourseIds = subscriptions.map((s) => s.course);
        }

        const courseData = await Course.aggregate([
            {
                $match: {
                    type: "course",
                    _id: { $nin: excludeCourseIds },
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: "images",
                    localField: "image",
                    foreignField: "_id",
                    as: "imageData",
                },
            },
            { $unwind: { path: "$imageData", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "instructors",
                    localField: "instructor",
                    foreignField: "_id",
                    as: "instructorData",
                },
            },
            {
                $unwind: { path: "$instructorData", preserveNullAndEmptyArrays: true },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryData",
                },
            },
            {
                $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true },
            },
            {
                $match: { "imageData.imageType": "course" },
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    price: 1,
                    duration: 1,
                    "image.url": "$imageData.url",
                    "image.imageId": "$imageData.imageId",
                    "instructor.name": "$instructorData.name",
                    "category.name": "$categoryData.name",
                },
            },
        ]);


        await client.set(cacheKey, JSON.stringify(courseData), { EX: 6000 });

        res.json(courseData);
    } catch (error) {
        console.error("Error fetching course data:", error);
        return res.status(500).json({ error: "Internal Server Error" });
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
        const { userId } = req.query;
        const Course = mongoose.model("Course");
        const Subscription = mongoose.model("Subscription");

        const client = await connectRedis();

        const cacheKey = userId ? `tutorial:user:${userId}` : "tutorial:all";

        const cached = await client.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        let excludeCourseIds = [];

        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const subscriptions = await Subscription.find({ user: userId, isDeleted: false, courseType: "tutorial" }).select("course");
            excludeCourseIds = subscriptions.map((s) => s.course);
        }

        const tutorialData = await Course.aggregate([
            {
                $match: {
                    type: "tutorial",
                    _id: { $nin: excludeCourseIds },
                    isDeleted: false
                },
            },
            {
                $lookup: {
                    from: "images",
                    localField: "image",
                    foreignField: "_id",
                    as: "imageData",
                },
            },
            {
                $unwind: { path: "$imageData", preserveNullAndEmptyArrays: true },
            },
            {
                $match: { "imageData.imageType": "tutorial" },
            },
            {
                $lookup: {
                    from: "instructors",
                    localField: "instructor",
                    foreignField: "_id",
                    as: "instructorData",
                },
            },
            {
                $unwind: { path: "$instructorData", preserveNullAndEmptyArrays: true },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryData",
                },
            },
            {
                $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true },
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    price: 1,
                    duration: 1,
                    image: { url: "$imageData.url", imageId: "$imageData.imageId" },
                    instructor: { name: "$instructorData.name" },
                    category: { name: "$categoryData.name" },
                },
            },
        ]);
        await client.set(cacheKey, JSON.stringify(tutorialData), { EX: 6000 });
        res.json(tutorialData);
    } catch (error) {
        console.error("Error fetching card data:", error);
        return res.status(500).json({ error: error.message });
    }
};

const getProblemData = async (req, res) => {
    try {
        const ProblemList = mongoose.model('ProblemList');
        const client = await connectRedis();

        const cacheKey = 'problem-data';

        const cached = await client.get(cacheKey);
        if (cached) {
            console.info("Data Are Come From Redis")
            return res.json(JSON.parse(cached));
        }

        const problemData = await ProblemList.aggregate([
            {
                $lookup: {
                    from: 'codes',
                    localField: 'quesId',
                    foreignField: 'quesId',
                    as: 'codeData'
                }
            },
            {
                $lookup: {
                    from: 'problemexamples', 
                    localField: 'quesId',
                    foreignField: 'quesId',
                    as: 'exampleData'
                }
            },
            {
                $lookup: {
                    from: 'constraints', 
                    localField: 'quesId',
                    foreignField: 'quesId',
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
                    quesId: 1,
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
        await client.set(cacheKey, JSON.stringify(problemData), { EX: 600 });
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

const detailedTutorialOrCourse = async (req, res) => {
    try {
        const Course = mongoose.model('Course')
        const { id, type } = req.query;

        if (!id) {
            throw new Error("id is required")
        }
        const detailedTutorialData = await Course.findOne({
            _id: new mongoose.Types.ObjectId(id),
            type: type
        })
            .populate("image", "url -_id")
            .populate("category", "name -_id")
            .populate({
                path: "instructor",
                select: "-email",
                populate: {
                    path: "image",
                    select: "url -_id"
                }
            })

        res.json(detailedTutorialData)
    } catch (error) {
        console.error("error while fetching detailed courses", error);
    }
}

const enrollNow = async (req, res) => {
    try {
        const { userId, courseId, courseType } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid userId or courseId" });
        }

        const Subscription = mongoose.model("Subscription");

        const filter = {
            user: userId,
            course: courseId,
            courseType: courseType,
            isDeleted: false
        };

        const now = new Date();
        const endDate = new Date();
        endDate.setFullYear(now.getFullYear() + 1); // Example: 1 year subscription period

        const operation = {
            $set: {
                user: userId,
                course: courseId,
                accessType: "free",
                courseType: courseType,
                status: "active",
                startDate: now,
                endDate: endDate,
                payment: {
                    method: "free",
                    transactionId: null,
                    amount: 0,
                    originalAmount: 0,
                    currency: "INR",
                    status: "completed",
                    providerResponse: { note: "Free access granted" },
                },
                isDeleted: false
            },
        };

        const options = {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        };

        const EnrollData = await Subscription.findOneAndUpdate(filter, operation, options);

        return res.status(200).json({
            success: true,
            message: "Enrolled successfully",
            data: EnrollData,
        });
    } catch (error) {
        console.error("Error in enrollNow:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to enroll",
            error: error.message,
        });
    }
};

const userCourse = async (req, res) => {
    try {
        const { id } = req.query; // userId

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid userId" });
        }

        const Subscription = mongoose.model("Subscription");

        const UserCourses = await Subscription.aggregate([
            {
                $match: { user: new mongoose.Types.ObjectId(id), isDeleted: false }
            },
            {
                $lookup: {
                    from: "courses",
                    localField: "course",
                    foreignField: "_id",
                    as: "courseDetails"
                }
            },
            { $unwind: { path: "$courseDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "instructors",
                    localField: "courseDetails.instructor",
                    foreignField: "_id",
                    as: "instructor"
                }
            },
            { $unwind: { path: "$instructor", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "images",
                    localField: "courseDetails.image",
                    foreignField: "_id",
                    as: "imageData"
                }
            },
            { $unwind: { path: "$imageData", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0, // hides subscription id
                    accessType: 1,
                    startDate: 1,
                    endDate: 1,
                    "courseDetails._id": 1,
                    "courseDetails.title": 1,
                    "courseDetails.description": 1,
                    "courseDetails.price": 1,
                    "courseDetails.duration": 1,
                    courseImage: "$imageData", // return actual image doc
                    " ._id": 1,
                    "instructor.name": 1,
                    "instructor.email": 1,
                    "instructor.bio": 1,
                    "instructor.image": 1
                }
            }
        ]);

        res.status(200).json({ success: true, courses: UserCourses });
    } catch (error) {
        console.error("Error fetching user courses:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const checkEnrollment = async (req, res) => {
    try {
        const { userId, courseId, courseType } = req.query;

        // Validate required fields
        if (!userId || !courseId || !courseType) {
            return res
                .status(400)
                .json({ status: "failed", message: "userId, courseId, and courseType are required" });
        }

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ status: "failed", message: "Invalid userId or courseId" });
        }

        const Subscription = mongoose.model("Subscription");

        const Subscribe = await Subscription.findOne({
            user: userId,
            course: courseId,
            courseType: courseType,
            isDeleted: false
        });

        if (Subscribe) {
            return res.status(200).json({ status: "success", enrolled: true, data: Subscribe });
        } else {
            return res.status(200).json({ status: "success", enrolled: false });
        }
    } catch (error) {
        console.error("check enrollment error", error);
        return res.status(500).json({ status: "failed", message: "Server error", error: error.message });
    }
};

const cancelSubscription = async (req, res) => {
    try {
        const { courseId, userId, courseType } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid userId or courseId" });
        }

        const Subscription = mongoose.model('Subscription');

        const cancel_sub = await Subscription.updateOne(
            { course: courseId, user: userId, courseType, isDeleted: false },
            { $set: { isDeleted: true, status: "cancelled" } }
        );

        if (cancel_sub.modifiedCount > 0) {
            res.status(200).json({ success: true, message: "Subscription cancelled successfully" });
        } else {
            res.status(404).json({ success: false, message: "Subscription not found or already cancelled" });
        }
    } catch (error) {
        console.error("Error while cancelling subscription:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

const getCourseDetails = async (req, res) => {
    const { id, type } = req.body;
    const Course = mongoose.model('Course');
    try {
        const courseData = await Course.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id), type: type, isDeleted: false } },
            {
                $lookup: {
                    from: "instructors",
                    localField: "instructor",
                    foreignField: "_id",
                    as: "instructor"
                }
            },
            { $unwind: "$instructor" },
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "_id",
                    as: "category"
                }
            },
            { $unwind: "$category" },
            {
                $lookup: {
                    from: "images",
                    localField: "image",
                    foreignField: "_id",
                    as: "imagesdata"
                }
            },
            { $unwind: "$imagesdata" },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    price: 1,
                    instructor: {
                        _id: "$instructor._id",
                        name: "$instructor.name",
                        bio: "$instructor.bio"
                    },
                    category: {
                        _id: "$category._id",
                        name: "$category.name"
                    },
                    image: "$imagesdata.url"
                }
            }
        ]);

        return res.json({
            success: true,
            data: courseData[0] || null
        });

        res.json({ success: true, data: courseData })
    } catch (error) {
        console.error(error);

    }

}








indexController.cancelSubscription = cancelSubscription;
indexController.checkEnrollment = checkEnrollment;
indexController.userCourse = userCourse;
indexController.getCourseData = getCourseData;
indexController.getCarouselData = getCarouselData;
indexController.getTutorialData = getTutorialData;
indexController.getInstructorData = getInstructorData;
indexController.getCategoryData = getCategoryData;
indexController.getProblemData = getProblemData;
indexController.detailedTutorialOrCourse = detailedTutorialOrCourse;
indexController.Profile = Profile;
indexController.updateProfile = updateProfile;
indexController.enrollNow = enrollNow;
indexController.getCourseDetails = getCourseDetails;


module.exports = indexController;