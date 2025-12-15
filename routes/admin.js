const adminController = require('../controllers/adminController')

const router = require('express').Router()

router.get('/dashboard',adminController.Dashboard)
router.get('/questions',adminController.Questions)
router.get('/submissions',adminController.AllSubmissions);
router.get('/users',adminController.AllUsers);
module.exports = router