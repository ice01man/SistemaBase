import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        qty: Number
    }],
    totalAmount: { type: Number, required: true },
    // Flujo real que usa orderController.js: confirmado (cliente pide) → tomado (empleado lo toma) → despachado
    estado: {
        type: String,
        enum: ['confirmado', 'tomado', 'despachado'],
        default: 'confirmado'
    },
    tomadoPor: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);