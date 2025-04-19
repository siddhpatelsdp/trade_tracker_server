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

let trades = [];
const TRADES_FILE = path.join(__dirname, 'trades.json');

const initializeTradesFile = async () => {
  try {
    await writeFile(TRADES_FILE, JSON.stringify([], null, 2));
    console.log('Initialized empty trades.json');
  } catch (err) {
    console.error('Error initializing trades file:', err);
    process.exit(1);
  }
};

const loadTrades = async () => {
  try {
    const data = await readFile(TRADES_FILE, 'utf8');
    trades = JSON.parse(data);
    console.log(`Loaded ${trades.length} trades from trades.json`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('trades.json not found, creating new file...');
      await initializeTradesFile();
    } else {
      console.error('Error loading trades:', err);
      throw err;
    }
  }
};

const cleanDuplicateFields = () => {
  trades = trades.map(trade => ({
    _id: trade._id,
    instrument: trade.instrument,
    entry_price: trade.entry_price || trade.entryPrice,
    exit_price: trade.exit_price || trade.exitPrice,
    trade_date: trade.trade_date || trade.tradeDate,
    profit_loss: trade.profit_loss || trade.profitLoss,
    notes: trade.notes,
    created_at: trade.created_at || new Date().toISOString(),
    updated_at: trade.updated_at || new Date().toISOString()
  }));
};

const saveTrades = async () => {
  try {
    await writeFile(TRADES_FILE, JSON.stringify(trades, null, 2));
    console.log(`Saved ${trades.length} trades to trades.json`);
  } catch (err) {
    console.error('Error saving trades:', err);
    throw err;
  }
};

await loadTrades();
cleanDuplicateFields();
await saveTrades();

app.get('/api/trades', async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Content-Type': 'application/json; charset=utf-8'
    });
    
    const responseData = trades.map(trade => ({
      _id: trade._id,
      instrument: trade.instrument,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      trade_date: trade.trade_date,
      profit_loss: trade.profit_loss,
      notes: trade.notes,
      created_at: trade.created_at,
      updated_at: trade.updated_at
    }));
    
    res.json(responseData);
  } catch (err) {
    console.error('GET /api/trades error:', err);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch trades',
      details: err.message 
    });
  }
});

app.post('/api/trades', async (req, res) => {
  try {
    const { error, value } = tradeSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      convert: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors
      });
    }

    const localDate = typeof value.tradeDate === 'string' ? value.tradeDate : String(value.tradeDate);

    const newTrade = {
      _id: Date.now(),
      instrument: value.instrument,
      entry_price: typeof value.entryPrice === 'string' ? parseFloat(value.entryPrice) : value.entryPrice,
      exit_price: typeof value.exitPrice === 'string' ? parseFloat(value.exitPrice) : value.exitPrice,
      trade_date: localDate,
      profit_loss: typeof value.profitLoss === 'string' ? parseFloat(value.profitLoss) : value.profitLoss,
      notes: value.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    trades.push(newTrade);
    await saveTrades();

    res.status(201).json({
      status: 'success',
      data: newTrade
    });
  } catch (err) {
    console.error('POST /api/trades error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create trade',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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
    await saveTrades();
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