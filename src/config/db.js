import mongoose from 'mongoose';

export async function conectarDB(uri, dbName = 'brie') {
  if (!uri) {
    console.error('Falta MONGODB_URI en el .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { dbName });
    console.log(`MongoDB conectado ✅  (base: ${dbName})`);
  } catch (err) {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  }
}
