import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'SistemaBase' });

  const existe = await User.findOne({ email: 'admin@demo.com' });
  if (existe) {
    console.log('El admin ya existe, no hago nada.');
  } else {
    await User.create({
      nombre: 'Admin',
      email: 'admin@demo.com',
      passwordHash: 'admin123',   // ← TEXTO PLANO: el pre('save') lo hashea solo
      rol: 'admin'
    });
    console.log('✅ Admin creado: admin@demo.com / admin123');
  }
  await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });