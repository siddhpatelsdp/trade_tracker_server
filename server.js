const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
import helmet from 'helmet';
import morgan from 'morgan';

// Initialize Express app
const app = express();

// Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan('combined'));

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());

// Load trade data with error handling
let trades = [];
try {
  trades = require('./trades.json');
  console.log('Successfully loaded trade data');
} catch (err) {
  console.error('Error loading trades.json:', err);
  process.exit(1); // Exit if we can't load the essential data
}

// API Routes
app.get('/api/trades', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Add some basic request logging
    console.log(`[${new Date().toISOString()}] Trade data requested from ${req.ip}`);
    
    res.json(trades);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    tradeCount: trades.length
  });
});

// Static files (should come after API routes)
app.use(express.static(path.join(__dirname, 'public')));

// Serve SPA (Single Page Application) - should be after static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path
  });
});

// Server startup
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server terminated');
    process.exit(0);
  });
});