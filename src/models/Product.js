import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    day: { type: String, enum: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"], required: true },
    description: { type: String, required: true },
    ingredients: [],
    image: { type: String, required: true },
    price: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);