import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  clave: { type: String, default: 'sitio', unique: true },
  tema:  { type: String, enum: ['violeta', 'trueno', 'bosque'], default: 'violeta' },
  horaCorte: { type: Number, default: 10, min: 0, max: 23 },  // corte de producción (P3)
  ultimoCorte: { type: String, default: '' },                 // 'YYYY-MM-DD' del último corte automático
}, { timestamps: true });

export default mongoose.models.Config || mongoose.model('Config', configSchema);
