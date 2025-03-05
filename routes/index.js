const router = require('express').Router();
const index = require('../controllers/indexController');

router.get('/api/get-courses',index.getCourseData); 
router.get('/api/get-carousel',index.getCarouselData);
router.get('/api/get-card-data',index.getCardData);

module.exports = router;    