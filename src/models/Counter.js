import mongoose from 'mongoose';

// Contadores atómicos (número correlativo de pedido).
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

export default mongoose.models.Counter || mongoose.model('Counter', counterSchema);
