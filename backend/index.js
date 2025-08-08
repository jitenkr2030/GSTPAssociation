// index.js

// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Initialize dotenv to access environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(morgan('dev')); // HTTP request logger
app.use(bodyParser.json()); // Parse JSON bodies

// Import routes (define routes in separate files)
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const membershipRoutes = require('./src/routes/membership'); // Membership-related routes

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes); // Route for authentication (signup/login)
app.use('/api/users', userRoutes); // Route for user-related actions
app.use('/api/memberships', membershipRoutes); // Route for membership management

// Home Route
app.get('/', (req, res) => {
  res.send('Welcome to GSTPAssociation Backend API');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

// Define the PORT
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
