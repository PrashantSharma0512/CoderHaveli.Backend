require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoConnect = require('./connection');
const morgan = require('morgan');
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

app.use(express.json({ limit: '10mb' }));
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

// Color-coded status based on response code
morgan.token('coloredstatus', function (req, res) {
  const status = res.statusCode;
  let color = '\x1b[0m'; // default white

  if (status >= 500) color = '\x1b[31m'; // red for server errors
  else if (status >= 400) color = '\x1b[33m'; // yellow for client errors
  else if (status >= 300) color = '\x1b[36m'; // cyan for redirects
  else if (status >= 200) color = '\x1b[32m'; // green for success

  return `${color}${status}\x1b[0m`;
});
// Custom Morgan tokens
morgan.token('datetime', function () {
  return new Date().toISOString();
});

morgan.token('statuscode', function (req, res) {
  return res.statusCode;
});
app.use(morgan(':datetime :url :response-time ms :coloredstatus'));
app.get('/', (req, res) => {
  res.send('Hello from Render!');
});
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/index'));
app.use('/api', require('./routes/problem'));


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
