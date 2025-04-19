import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  instrument: { type: String, required: true },
  entry_price: Number,
  exit_price: Number,
  trade_date: String, // stored as YYYY-MM-DD
  profit_loss: Number,
  notes: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const Trade = mongoose.model('Trade', tradeSchema);
export default Trade;