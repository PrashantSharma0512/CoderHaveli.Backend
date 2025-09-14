const router = require('express').Router();
const index = require('../controllers/indexController');
const multer = require('../utils/multer');
const Authenicated = require('../middlewares/Auth')

router.get('/get-courses', index.getCourseData);
router.get('/get-carousel', index.getCarouselData);
router.get('/get-tutorial', index.getTutorialData);

router.get('/get-profile', Authenicated, index.Profile);
router.put('/update-profile', Authenicated, index.updateProfile);
router.get('/get-instructor', Authenicated, index.getInstructorData);
router.get('/get-category', Authenicated, index.getCategoryData);
router.get('/get-problem', Authenicated, index.getProblemData);
router.get('/get-detailed-tutorial', Authenicated, index.detailedTutorialOrCourse);
router.post('/enroll-now', Authenicated, index.enrollNow)
router.post('/cancel-subscription', Authenicated, index.cancelSubscription)
router.get('/get-user-course', Authenicated, index.userCourse)
router.get('/check-enrollment', Authenicated, index.checkEnrollment)
module.exports = router;    