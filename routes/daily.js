const router = require('express').Router();
const dailyController = require('../controllers/dailyProblemController');
const publicAuth = require('../middlewares/publicAuth');

router.get('/aaj-ka-sawal', publicAuth, dailyController.getAajKaSawal);
router.get('/calendar', publicAuth, dailyController.getCalendarData);

module.exports = router;

