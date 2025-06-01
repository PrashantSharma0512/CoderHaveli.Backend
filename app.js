require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mongoConnect = require('./connection');

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Add your domain here
  credentials: true
}));
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

app.use((req, res, next) => {
  console.log('Request Origin:', req.headers.origin);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/', require('./routes/index'));
app.use('/api/problem', require('./routes/problem'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
