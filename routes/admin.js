const adminController = require('../controllers/adminController')

const router = require('express').Router()

router.get('/dashboard',adminController.Dashboard)

module.exports = router