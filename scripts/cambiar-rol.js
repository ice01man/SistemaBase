// Cambia el rol de un usuario directamente en la base (útil si te quedaste sin admin o
// una cuenta quedó con el rol equivocado).
//   npm run rol -- email@dominio.com reparto
// Roles: admin | produccion | reparto | user | cliente
import 'dotenv/config';
import mongoose from 'mongoose';
import { iniciarStore, db } from '../src/store/index.js';
import { MODO } from '../src/config/env.js';
import { ROLES } from '../src/models/User.js';

const [email, rol] = process.argv.slice(2);
if (!email || !ROLES.includes(rol)) {
  console.error(`Uso: npm run rol -- email@dominio.com <${ROLES.join('|')}>`);
  process.exit(1);
}
if (MODO !== 'mongo') {
  console.error('Este comando es para MongoDB: poné PERSISTENCIA=mongo en tu .env.');
  process.exit(1);
}

await iniciarStore();
const u = await db.users.findOne({ email: email.trim().toLowerCase() });
if (!u) {
  console.error(`No existe ningún usuario con el email ${email}.`);
} else {
  await db.users.update(u._id, { rol });
  console.log(`✅ ${u.email}: rol "${u.rol}" → "${rol}"`);
  console.log('   Que cierre sesión y vuelva a ingresar para que el cambio se note en pantalla.');
}
await mongoose.disconnect();
