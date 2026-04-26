const router = require('express').Router()
const cartController = require('../controllers/cartController');
const AnalyticsMiddleware = require('../middlewares/Analytics');
const Authenticate = require('../middlewares/Auth')

router.post('/remove', Authenticate, AnalyticsMiddleware, cartController.removeItem);
router.get('/', Authenticate, cartController.getCartItems);
router.post('/add', Authenticate, AnalyticsMiddleware, cartController.addItems);
router.delete('/clear', Authenticate, cartController.clearCart);
router.get('/user-cart-count', Authenticate, cartController.getUserCartCount);

module.exports = router