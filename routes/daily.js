const router = require('express').Router();
const dailyController = require('../controllers/dailyProblemController');
const publicAuth = require('../middlewares/publicAuth');
const Authenticated = require('../middlewares/Auth');

router.get('/aaj-ka-sawal', publicAuth, dailyController.getAajKaSawal);
router.get('/calendar', publicAuth, dailyController.getCalendarData);
router.get('/topics', dailyController.getTopics);

router.get('/coins', Authenticated, dailyController.getCoinSummary);
router.post('/personal-potd/purchase', Authenticated, dailyController.purchasePersonalPotd);
router.patch('/personal-potd/topic', Authenticated, dailyController.updatePersonalTopic);

module.exports = router;
