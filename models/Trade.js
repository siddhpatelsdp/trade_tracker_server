import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  instrument: { type: String, required: true },
  entry_price: Number,
  exit_price: Number,
  trade_date: { type: Date, required: true },
  profit_loss: Number,
  notes: String,
}, {
  timestamps: true
});

const Trade = mongoose.model('Trade', tradeSchema);
export default Trade;