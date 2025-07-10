const nodemailer = require("nodemailer");

// Step 1: Create transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

// transporter.verify((err, success) => {
//   if (err) {
//     console.error("❌ SMTP failed:", err);
//   } else {
//     console.log("✅ SMTP is ready");
//   }
// });

module.exports = transporter;