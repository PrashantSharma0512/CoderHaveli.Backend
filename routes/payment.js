const express = require("express");
const paymentController = require("../controllers/paymentController");
const router = express.Router();



// ✅ Create an order (called by frontend before payment)
router.post("/order", paymentController.Order);

// ✅ Verify payment signature
router.post("/verify", paymentController.orderVerify);


module.exports = router
