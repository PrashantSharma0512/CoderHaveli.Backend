const express = require("express");
const paymentController = require("../controllers/paymentController");
const Authenicated = require("../middlewares/Auth");
const AnalyticsMiddleware = require("../middlewares/Analytics");
const router = express.Router();



// ✅ Create an order (called by frontend before payment)
router.post("/order", Authenicated, AnalyticsMiddleware, paymentController.Order);

// ✅ Verify payment signature
router.post("/verify", Authenicated, AnalyticsMiddleware, paymentController.orderVerify);


module.exports = router
