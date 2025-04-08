const router = require('express').Router();
const index = require('../controllers/indexController');

router.get('/api/get-courses',index.getCourseData); 
router.get('/api/get-carousel',index.getCarouselData);
router.get('/api/get-card-data',index.getCardData);
router.get('/api/get-instructor',index.getInstructorData);
router.get('/api/get-category',index.getCategoryData);

router.get('/api/get-problem',index.getProblemData);
module.exports = router;    