// Configuración de entorno validada al arrancar. Si algo es inseguro, el servidor
// NO arranca (antes caía en silencio a "modo memoria" y dejaba todo abierto como admin).
import 'dotenv/config';
import crypto from 'node:crypto';

export const MODO = (process.env.PERSISTENCIA || 'mongo').toLowerCase();
export const PRODUCCION = process.env.NODE_ENV === 'production';

if (!['mongo', 'memoria'].includes(MODO)) {
  throw new Error(`PERSISTENCIA="${process.env.PERSISTENCIA}" inválida. Usá "mongo" o "memoria".`);
}
if (MODO === 'memoria' && PRODUCCION) {
  throw new Error('PERSISTENCIA=memoria no está permitida con NODE_ENV=production.');
}

const dbg = process.env.JWT_SECRET;
let secreto = dbg;
const debil = !dbg || dbg === 'dev_secret' || dbg.length < 32;
if (debil) {
  if (MODO === 'mongo') {
    throw new Error(
      'Falta JWT_SECRET o es débil (mínimo 32 caracteres). Generá uno con:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
      'y pegalo en tu .env como JWT_SECRET=...'
    );
  }
  secreto = crypto.randomBytes(32).toString('hex'); // solo modo demo: las sesiones mueren al reiniciar
  console.warn('⚠️  JWT_SECRET no definido: uso un secreto aleatorio (modo memoria / demo).');
}

export const JWT_SECRET = secreto;
export const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
export const PORT = Number(process.env.PORT) || 3000;
export const CORS_ORIGIN = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
export const HORA_CORTE_DEFECTO = Number(process.env.HORA_CORTE) || 10;
