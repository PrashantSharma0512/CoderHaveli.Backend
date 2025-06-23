require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoConnect = require('./connection');

const app = express();

const allowedOrigin = [
  'https://coderhaveli.vercel.app',
  'http://localhost:5173' // or 3000, etc., depending on your dev port
];

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.options('*', cors({
  origin: allowedOrigin,
  credentials: true
}));
// Connect to MongoDB
mongoConnect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Load models
require('./models/modal')(mongoose);

// Attach mongoose to request object
// global.nosql = mongoose;
// app.use((req, res, next) => {
//   req.nosql = mongoose;
//   next();
// });
app.get('/', (req, res) => {
  res.send('Hello from Render!');
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
