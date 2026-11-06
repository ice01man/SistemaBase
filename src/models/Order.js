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
        precioPublico: Number,  // para mostrar el ahorro
        qty: Number,
        costo: { type: Number, default: 0 },   // costo de receta por porción al confirmar (para el margen real)
    }],
    zona: { type: String, default: '', index: true },   // zona del cliente al pedir: decide qué repartidor lo ve
    tipoCliente: { type: String, default: 'final' },  // lista de precios con la que se cobró
    subtotal: { type: Number, default: 0 },          // a precio público
    descuentoPct: { type: Number, default: 0 },
    descuentoMotivo: { type: String, default: '' },
    descuentoMonto: { type: Number, default: 0 },
    costoTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    estado: { type: String, enum: ESTADOS, default: 'confirmado', index: true },
    diaMenu: String,                       // 'lunes'...'viernes'
    fechaEntrega: { type: String, index: true }, // 'YYYY-MM-DD'
    direccion: { type: String, default: '' },
    observaciones: { type: String, default: '' },
    medioPago: { type: String, enum: ['efectivo', 'transferencia'], default: 'efectivo' },
    pagado: { type: Boolean, default: false },
    pagoConfirmadoPor: { type: String, default: '' },   // quién marcó el pago como recibido
    pagoConfirmadoEn: { type: Date, default: null },
    stockDescontado: { type: Boolean, default: false },  // lo marca el corte de producción (P3)
    tomadoPor: { type: String, default: null },          // quién de cocina lo tomó
    repartidor: { type: String, default: null },         // quién lo reparte
    motivoCancelacion: { type: String, default: '' },
    historial: [{ _id: false, estado: String, fecha: Date, por: String }],
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', orderSchema);
