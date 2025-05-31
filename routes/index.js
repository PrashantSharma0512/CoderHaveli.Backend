const router = require('express').Router();
const index = require('../controllers/indexController');

router.get('/get-courses',index.getCourseData); 
router.get('/get-carousel',index.getCarouselData);
router.get('/get-card-data',index.getCardData);
router.get('/get-instructor',index.getInstructorData);
router.get('/get-category',index.getCategoryData);

router.get('/api/get-problem',index.getProblemData);
module.exports = router;    