const indexController = {}

const getCourseData = async (req, res) => {
    try {
        const Course = nosql.model('Course');

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






indexController.getCourseData = getCourseData;

module.exports = indexController;