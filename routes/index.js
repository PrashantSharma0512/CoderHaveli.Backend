const router = require('express').Router();
const index = require('../controllers/indexController');
const multer = require('../utils/multer');
const Authenicated = require('../middlewares/Auth');
const publicAuth = require('../middlewares/publicAuth');
const AnalyticsMiddleware = require('../middlewares/Analytics');

router.get('/get-courses', index.getCourseData);
router.get('/get-carousel', index.getCarouselData);
router.get('/get-tutorial', index.getTutorialData);

router.get('/get-profile', Authenicated, index.Profile);
router.put('/update-profile', Authenicated, AnalyticsMiddleware, index.updateProfile);
router.get('/get-instructor', Authenicated, index.getInstructorData);
router.get('/get-category', Authenicated, index.getCategoryData);
router.get('/get-problem', Authenicated, AnalyticsMiddleware, index.getProblemData);
router.get('/get-detailed-tutorial', Authenicated, AnalyticsMiddleware, index.detailedTutorialOrCourse);
router.post('/enroll-now', Authenicated, AnalyticsMiddleware, index.enrollNow)
router.post('/cancel-subscription', Authenicated, AnalyticsMiddleware, index.cancelSubscription)
router.get('/get-user-course', Authenicated, index.userCourse)
router.get('/check-enrollment', Authenicated, index.checkEnrollment)


router.post('/get-course-details', Authenicated, index.getCourseDetails)
module.exports = router;    