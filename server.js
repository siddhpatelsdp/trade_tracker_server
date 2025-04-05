const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');

// Middleware
app.use(cors());
app.use(express.static('public'));

// Sample trade data (replace with your actual trade data)
const trades = [
  {
    _id: 1,
    instrument: "AAPL",
    entry_price: "150.50",
    exit_price: "155.75",
    trade_date: "2023-05-15",
    profit_loss: "5.25",
    notes: "Bullish breakout"
  },
  // Add more trades as needed
];

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