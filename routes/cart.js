const router = require('express').Router()
const cartController = require('../controllers/cartController')
const Authenticate = require('../middlewares/Auth')

router.post('/remove', Authenticate, cartController.removeItem);
router.get('/', Authenticate, cartController.getCartItems);
router.post('/add', Authenticate, cartController.addItems);


module.exports = router