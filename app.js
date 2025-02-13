require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mongoConnect = require('./connection');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Connect to MongoDB
mongoConnect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Load models
require('./models/modal')(mongoose);

// Attach mongoose to request object
global.nosql = mongoose;
app.use((req, res, next) => {
  req.nosql = mongoose;
  next();
});

// Routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
