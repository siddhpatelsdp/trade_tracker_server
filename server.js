const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://siddhpatelsdp.github.io']
}));
app.use(express.static('public'));

// Sample trade data (replace with your actual trade data)
const trades = require('./trades.json');

// API Routes
app.get('/api/trades', (req, res) => {
  res.json(trades);
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});