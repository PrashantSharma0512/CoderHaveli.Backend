const adminController = require('../controllers/adminController');
const Authenicated = require('../middlewares/Auth');

const router = require('express').Router()

router.get('/dashboard', Authenicated, adminController.Dashboard)
router.get('/questions', Authenicated, adminController.Questions)
router.get('/submissions', Authenicated, adminController.AllSubmissions);
router.get('/users', Authenicated, adminController.AllUsers);
router.get('/approaches', Authenicated, adminController.Approaches);
router.get('/get-approach', Authenicated, adminController.getApproach);
router.post('/save-approach', Authenicated, adminController.saveApproach);
router.delete('/delete-approach', Authenicated, adminController.deleteApproach);
router.get('/coins/overview', Authenicated, adminController.getCoinsOverview);
router.post('/coins/adjust', Authenicated, adminController.adjustUserCoins);
router.put('/coins/config', Authenicated, adminController.updateCoinsConfig);
router.get('/privacy-policy', Authenicated, adminController.getPrivacyPolicy);
router.put('/privacy-policy', Authenicated, adminController.updatePrivacyPolicy);
module.exports = router