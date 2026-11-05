import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    day: { type: String, enum: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"], required: true },
    description: { type: String, required: true },
    ingredients: [],
    image: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    activo: { type: Boolean, default: true }, // false = no aparece en el menú público (se conserva para historial de pedidos)
    // Receta: insumos que consume UNA porción. Se descuentan del stock en el corte de producción (P3).
    receta: [{
        _id: false,
        insumo: { type: mongoose.Schema.Types.ObjectId, ref: 'Insumo', required: true },
        cantidad: { type: Number, required: true, min: 0 },
    }],
    // Campos para la tarjeta de menú (badges/rating): cargados por el admin, no por reseñas de clientes.
    tags: { type: [String], default: [] },          // ej: "Sin Gluten", "100% Vegano"
    destacado: { type: String, default: null },      // ej: "Almuerzo Incluido" (badge sobre la foto)
    rating: {
        promedio: { type: Number, default: 0, min: 0, max: 5 },
        cantidad: { type: Number, default: 0, min: 0 },
    },
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model('Product', productSchema);
