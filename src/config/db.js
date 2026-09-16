import mongoose from 'mongoose';
import { setModo } from './modo.js'; // ⚠️ ajustá el path según dónde tengas db.js

export async function conectarDB(uri, dbName = 'SistemaBase') {
  // Si forzaste local por .env, ni intentamos Mongo
  if (process.env.PERSISTENCIA !== 'mongo') {
    setModo('memoria');
    return false;
  }
  if (!uri) {
    console.warn('⚠️  Falta MONGODB_URI — sigo en modo LOCAL (memoria)');
    setModo('memoria');
    return false;
  }
  try {
    await mongoose.connect(uri, { dbName });
    console.log(`MongoDB conectado ✅  (base: ${dbName})`);
    setModo('mongo');
    return true;
  } catch (err) {
    console.warn(`⚠️  Mongo no disponible (${err.message}) — sigo en modo LOCAL (memoria)`);
    setModo('memoria');
    return false;
  }
}