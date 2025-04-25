import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import morgan from 'morgan';
import { readFile, writeFile } from 'fs/promises';
import Joi from 'joi';
import Trade from './models/Trade.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cors({
  origin: ['http://localhost:3001', 'https://siddhpatelsdp.github.io'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));

const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const tradeSchema = Joi.object({
  instrument: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'Instrument cannot be empty',
      'string.min': 'Instrument must be at least 2 characters'
    }),
  entryPrice: Joi.alternatives().try(
    Joi.number(),
    Joi.string().pattern(/^[+-]?\d*\.?\d+$/)
  ).required()
    .messages({
      'alternatives.match': 'Entry price must be a valid number'
    }),
  exitPrice: Joi.alternatives().try(
    Joi.number(),
    Joi.string().pattern(/^[+-]?\d*\.?\d+$/)
  ).required(),
  tradeDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
    .messages({
      'date.base': 'Invalid trade date format (use YYYY-MM-DD)'
    }),
  profitLoss: Joi.alternatives().try(
    Joi.number(),
    Joi.string().pattern(/^[+-]?\d*\.?\d+$/)
  ).required(),
  notes: Joi.string().allow('').max(500).optional()
});

// GET all trades
app.get('/api/trades', async (req, res) => {
  try {
    const trades = await Trade.find().sort({ trade_date: -1 });
    res.json(trades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET one trade
app.get('/api/trades/:id', async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });
    res.json(trade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new trade
app.post('/api/trades', async (req, res) => {
  const { error, value } = tradeSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    convert: false
  });
  if (error) {
    const errors = error.details.map(d => ({ field: d.path[0], message: d.message }));
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  try {
    const newTrade = new Trade({
      instrument:  value.instrument,
      entry_price: parseFloat(value.entryPrice),
      exit_price:  parseFloat(value.exitPrice),
      trade_date:  new Date(value.tradeDate),
      profit_loss: parseFloat(value.profitLoss),
      notes:       value.notes || ''
    });
    await newTrade.save();
    res.status(201).json(newTrade);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update existing trade
app.put('/api/trades/:id', async (req, res) => {
  const { error, value } = tradeSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    convert: false
  });
  if (error) {
    const errors = error.details.map(d => ({ field: d.path[0], message: d.message }));
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  try {
    const updated = await Trade.findByIdAndUpdate(
      req.params.id,
      {
        instrument:  value.instrument,
        entry_price: parseFloat(value.entryPrice),
        exit_price:  parseFloat(value.exitPrice),
        trade_date:  new Date(value.tradeDate),
        profit_loss: parseFloat(value.profitLoss),
        notes:       value.notes || ''
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Trade not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a trade
app.delete('/api/trades/:id', async (req, res) => {
  try {
    const deleted = await Trade.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Trade not found' });
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.message
    })
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    server.close(() => {
      console.log('Server terminated');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  shutdown('unhandledRejection');
});