import mongoose from 'mongoose';
import { MODO, MONGODB_URI } from './env.js';

/**
 * Conecta a MongoDB. Si falla, TIRA el error: el servidor no debe seguir
 * funcionando "sin base" porque eso saltaba toda la seguridad.
 */
export async function conectarDB(dbName = process.env.MONGODB_DB || 'SistemaBase') {
  if (MODO !== 'mongo') return false;
  if (!MONGODB_URI) throw new Error('Falta MONGODB_URI en el .env (PERSISTENCIA=mongo).');
  await mongoose.connect(MONGODB_URI, { dbName, serverSelectionTimeoutMS: 8000 });
  console.log(`MongoDB conectado ✅  (base: ${dbName})`);
  return true;
}
