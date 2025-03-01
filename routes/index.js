const router = require('express').Router();
const index = require('../controllers/indexController');
router.get('/api/get-courses',index.getCourseData); 

module.exports = router;    