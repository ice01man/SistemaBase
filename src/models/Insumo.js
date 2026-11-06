import mongoose from 'mongoose';

// Insumo = ingrediente/material de cocina con stock (arroz, pollo, envases...).
const insumoSchema = new mongoose.Schema({
  nombre:        { type: String, required: true, trim: true, unique: true },
  unidad:        { type: String, enum: ['kg', 'g', 'l', 'ml', 'u'], default: 'kg' },
  stock_actual:  { type: Number, default: 0, min: 0 },
  stock_minimo:  { type: Number, default: 0, min: 0 },
  costo_unitario:{ type: Number, default: 0, min: 0 },
  categoria:     { type: String, default: 'Otros' },     // Verduras, Lácteos, Carnes... (para filtrar)
  vencimiento:   { type: String, default: '' },          // 'YYYY-MM-DD' del lote en stock ('' = sin vencimiento)
  activo:        { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Insumo || mongoose.model('Insumo', insumoSchema);
