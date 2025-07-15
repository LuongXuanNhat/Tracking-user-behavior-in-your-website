// app.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (nếu cần)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const userRoutes = require('./app/routes/user');
app.use('/api/users', userRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('API is working!');
});

module.exports = app;
