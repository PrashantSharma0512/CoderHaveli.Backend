require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const mongoConnect = require("./connection");

const app = express();

/* ==========================================================
    CORS
========================================================== */

const allowedOrigin = [
  "https://coderhaveli.vercel.app",
  "http://localhost:5173"
];

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  })
);

app.options(
  "*",
  cors({
    origin: allowedOrigin,
    credentials: true
  })
);

/* ==========================================================
    Body Parser
========================================================== */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

/* ==========================================================
    MongoDB
========================================================== */

mongoConnect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error(err));

require("./models")(mongoose);

/* ==========================================================
    Morgan
========================================================== */

morgan.token("coloredstatus", function (req, res) {

  const status = res.statusCode;

  let color = "\x1b[0m";

  if (status >= 500) color = "\x1b[31m";
  else if (status >= 400) color = "\x1b[33m";
  else if (status >= 300) color = "\x1b[36m";
  else if (status >= 200) color = "\x1b[32m";

  return `${color}${status}\x1b[0m`;

});

morgan.token("datetime", function () {

  return new Date().toLocaleString();

});

app.use(
  morgan(":datetime :url :response-time ms :coloredstatus")
);

/* ==========================================================
    Health Check
========================================================== */

app.get("/", (req, res) => {

  res.json({
    success: true,
    message: "CoderHaveli Backend Running 🚀"
  });

});

/* ==========================================================
    Routes
========================================================== */

app.use("/api/auth", require("./routes/auth"));

app.use("/api", require("./routes/index"));

app.use("/api", require("./routes/problem"));

app.use("/api/cart", require("./routes/cart"));

app.use("/api/payment", require("./routes/payment"));

app.use("/admin", require("./routes/admin"));

app.use("/analytics", require("./routes/analytics"));

app.use("/api/newsletter", require("./routes/newsletter"));

/* ==========================================================
    Analytics
========================================================== */

const flushAnalytics = require("./utils/analyticsFlusher");

const FLUSH_INTERVAL = 60000;

setInterval(async () => {

  try {

    await flushAnalytics();

  } catch (error) {

    console.error(error);

  }

}, FLUSH_INTERVAL);

/* ==========================================================
    News Pipeline Workers
========================================================== */

require("./workers/newsFetch.worker");
require("./workers/newsProcess.worker");
require("./workers/newsAi.worker");
require("./workers/newsletter.worker");
require("./workers/newsEmail.worker");

console.log("✅ All news pipeline workers initialized");

/* =========================================================
    News Cron Jobs
========================================================= */

require("./scheduler/news.cron");
/* ==========================================================
    Server
========================================================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`🚀 Server running on port ${PORT}`);

});