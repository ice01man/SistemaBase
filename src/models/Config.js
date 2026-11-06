import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  clave: { type: String, default: 'sitio', unique: true },
  tema:  { type: String, enum: ['violeta', 'trueno', 'bosque'], default: 'violeta' },
  horaCorte: { type: Number, default: 10, min: 0, max: 23 },  // corte de producción (P3)
  soloPedidoDelDia: { type: Boolean, default: true },        // true = solo se puede pedir el menú de HOY, antes del corte
  zonas: { type: [String], default: undefined },                   // zonas de reparto (catálogo)
  umbralStockPct: { type: Number, default: 25, min: 0, max: 200 },   // "llegando al mínimo" = stock hasta N % por encima del mínimo
  margenObjetivo: { type: Number, default: 30, min: 1, max: 90 },   // % de margen REAL sobre el precio de venta
  ultimoCorte: { type: String, default: '' },                 // 'YYYY-MM-DD' del último corte automático
}, { timestamps: true });

export default mongoose.models.Config || mongoose.model('Config', configSchema);
