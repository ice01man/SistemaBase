import mongoose from 'mongoose';

const MenuSchema = new mongoose.Schema({
  nombre_fantasia: { type: String, required: true }, 
  descripcion: { type: String },
  imagen: { type: String, default: null},
  
  // Fechas de vigencia
  semana: { type: Number, required: true }, 
  year: { type: Number, required: true },
  disponible_para: [{ 
    type: String, 
    enum: ['corporativo', 'individual', 'evento'] 
  }],
  // Composición (Ingredientes de Stock)
  ingredientes: [{
    ingredient_id: {  type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    cantidad: { type: Number, required: true }, 
    opcional: { type: Boolean, default: false }, 
    incluido_por_defecto: { type: Boolean, default: true } 
  }],
  // Cálculos económicos
  costo_estimado: { type: Number, default: 0 }, 
  precio_sugerido: { type: Number, default: 0 }, 

  activo: { type: Boolean, default: true }
});

// Índice para buscar menús por semana y tipo
MenuSchema.index({ semana: 1, year: 1 });

export default mongoose.model('Menu', MenuSchema);