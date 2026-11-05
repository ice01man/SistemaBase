import mongoose from 'mongoose';

// Flujo: confirmado → en_preparacion (cocina toma) → producido (listo) → en_camino (reparto) → entregado
//        y cancelado (cliente antes del corte, o admin).
export const ESTADOS = ['confirmado', 'en_preparacion', 'producido', 'en_camino', 'entregado', 'cancelado'];

const orderSchema = new mongoose.Schema({
    numero: { type: Number, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cliente: { nombre: String, email: String, telefono: String },
    items: [{
        _id: false,
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,   // precio tomado de la base al confirmar (no del navegador)
        qty: Number,
    }],
    totalAmount: { type: Number, required: true, min: 0 },
    estado: { type: String, enum: ESTADOS, default: 'confirmado', index: true },
    diaMenu: String,                       // 'lunes'...'viernes'
    fechaEntrega: { type: String, index: true }, // 'YYYY-MM-DD'
    direccion: { type: String, default: '' },
    observaciones: { type: String, default: '' },
    medioPago: { type: String, enum: ['efectivo', 'transferencia'], default: 'efectivo' },
    pagado: { type: Boolean, default: false },
    stockDescontado: { type: Boolean, default: false },  // lo marca el corte de producción (P3)
    tomadoPor: { type: String, default: null },          // quién de cocina lo tomó
    repartidor: { type: String, default: null },         // quién lo reparte
    motivoCancelacion: { type: String, default: '' },
    historial: [{ _id: false, estado: String, fecha: Date, por: String }],
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', orderSchema);
