import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: { 
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
    status: { 
        type: String, 
        enum: ['Pendiente', 'En Proceso', 'Entregado'], 
        default: 'Pendiente' 
    }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);