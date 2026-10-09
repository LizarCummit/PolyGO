const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const webhookRoutes = require('./routes/webhooks');
const lectureRoutes = require('./routes/lectures');
const authRoutes = require('./routes/auth');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use(morgan('dev'));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Webhook routes (must be before body-parser)
app.use('/api/webhooks', webhookRoutes);

// Routes
app.use('/auth', authRoutes);
app.use('/api/lectures', lectureRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: err.message || 'Something broke!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

module.exports = app; 