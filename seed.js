// Carga inicial de MongoDB.
//   npm run seed                → crea el usuario admin si no existe
//   npm run seed -- --demo      → además crea insumos, platos con receta y usuarios de prueba
// La contraseña del admin sale de SEED_ADMIN_PASSWORD; si no la definís, se genera una al azar y se
// imprime UNA vez (no hay más contraseñas fijas tipo "admin123" en la base real).
import 'dotenv/config';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { iniciarStore, db, cargarDemo } from './src/store/index.js';
import { crearUsuario } from './src/services/usuarios.js';
import { MODO } from './src/config/env.js';

if (MODO !== 'mongo') {
  console.error('El seed es para MongoDB: poné PERSISTENCIA=mongo en tu .env.');
  process.exit(1);
}

const demo = process.argv.includes('--demo');
await iniciarStore();

const email = (process.env.SEED_ADMIN_EMAIL || 'admin@brie.local').toLowerCase();
if (await db.users.findOne({ email })) {
  console.log(`El admin ${email} ya existe, no hago nada con usuarios.`);
} else {
  const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  await crearUsuario({ nombre: 'Administrador', email, password, rol: 'admin' });
  console.log(`✅ Admin creado: ${email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) console.log(`   Contraseña (anotala, no se vuelve a mostrar): ${password}`);
}

if (demo) {
  await cargarDemo();
  console.log('✅ Datos demo cargados (insumos, platos con receta, usuarios demo si la colección estaba vacía).');
  console.log('   Usuarios demo: admin@demo.com / admin123, produccion@demo.com / produccion123, reparto@demo.com / reparto123, cliente@demo.com / cliente123');
  console.log('   ⚠️  Son SOLO para desarrollo: borralos antes de salir a producción.');
}

await mongoose.disconnect();
