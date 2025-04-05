const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://siddhpatelsdp.github.io'],
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Handle preflight requests
app.options('*', cors());

// Static files
app.use(express.static('public'));

// Trade data
const trades = require('./trades.json');

// API Route (with error handling)
app.get('/api/trades', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(trades);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve docs
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});