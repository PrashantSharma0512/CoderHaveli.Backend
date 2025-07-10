const router = require('express').Router();
const index = require('../controllers/indexController');
const multer = require('../utils/multer');
router.get('/get-profile', index.Profile);
router.put('/update-profile', multer.single('avatar'), (req, res, next) => {
    console.log('Multer processed file:', req.file);
    next();
}, index.updateProfile);
router.get('/get-courses', index.getCourseData);
router.get('/get-carousel', index.getCarouselData);
router.get('/get-tutorial', index.getTutorialData);
router.get('/get-instructor', index.getInstructorData);
router.get('/get-category', index.getCategoryData);
router.get('/get-problem', index.getProblemData);
module.exports = router;    