const adminController = require('../controllers/adminController')

const router = require('express').Router()

router.get('/dashboard',adminController.Dashboard)
router.get('/questions',adminController.Questions)
router.get('/submissions',adminController.AllSubmissions);
router.get('/users',adminController.AllUsers);
router.get('/approaches',adminController.Approaches);
router.get('/get-approach',adminController.getApproach);
router.post('/save-approach',adminController.saveApproach);
router.delete('/delete-approach',adminController.deleteApproach);
module.exports = router