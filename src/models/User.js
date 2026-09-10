import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; 

const usuarioSchema = new mongoose.Schema({
  nombre:       { type: String, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  rol:          { type: String, enum: ['user', 'admin'], default: 'user', required: true },
  direccion:    { type: String, trim: true, default: '' },
  lat:          { type: Number, default: null },
  lng:          { type: Number, default: null },
  activo:       { type: Boolean, default: true },
}, { timestamps: true });

// Middleware para hashear antes de guardar
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Método para comparar contraseñas
/* userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.passwordHash);
};
 */
export default mongoose.models.Usuario || mongoose.model('User', usuarioSchema);
