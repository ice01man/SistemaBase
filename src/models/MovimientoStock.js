import mongoose from 'mongoose';

// Cada cambio de stock deja un renglón (auditoría): quién, cuánto y por qué.
const movimientoSchema = new mongoose.Schema({
  insumo:   { type: mongoose.Schema.Types.ObjectId, ref: 'Insumo', required: true, index: true },
  nombre:   String,                                   // copia del nombre, por si el insumo se borra
  tipo:     { type: String, enum: ['ingreso', 'egreso', 'ajuste', 'consumo', 'reposicion'], required: true },
  cantidad: { type: Number, required: true },         // siempre positiva; el signo lo da el tipo
  stock_resultante: Number,
  motivo:   { type: String, default: '' },
  por:      { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.MovimientoStock || mongoose.model('MovimientoStock', movimientoSchema);
