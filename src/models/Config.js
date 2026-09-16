import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  clave: { type: String, default: 'sitio', unique: true },
  tema:  { type: String, enum: ['violeta', 'trueno', 'bosque'], default: 'violeta' }
}, { timestamps: true });

export default mongoose.model('Config', configSchema);