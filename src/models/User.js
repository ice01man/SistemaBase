import mongoose from 'mongoose';

// Roles del sistema (RBAC). "user" se conserva como Empleado general (cocina + reparto).
export const ROLES = ['admin', 'produccion', 'reparto', 'user', 'cliente'];

const usuarioSchema = new mongoose.Schema({
  nombre:       { type: String, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  rol:          { type: String, enum: ROLES, default: 'cliente', required: true },
  direccion:    { type: String, trim: true, default: '' },
  telefono:     { type: String, trim: true, default: '' },
  lat:          { type: Number, default: null },
  lng:          { type: Number, default: null },
  activo:       { type: Boolean, default: true },
  empresa:      { type: String, trim: true, default: '' },          // nombre de la empresa (si es cliente empresa)
  zona:         { type: String, default: '' },                     // zona de entrega del CLIENTE ('' = sin asignar)
  zonasReparto: { type: [String], default: undefined },            // zonas que cubre un REPARTIDOR
  tipoCliente:  { type: String, enum: ['final', 'empresa', 'descuento'], default: 'final' }, // decide qué precio de la lista se le cobra
}, { timestamps: true });

// OJO: el hash de la contraseña se hace en src/services/usuarios.js (igual en modo mongo y
// memoria). Antes había un pre('save') acá; se sacó para no hashear dos veces.
export default mongoose.models.User || mongoose.model('User', usuarioSchema);
