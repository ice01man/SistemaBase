import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { db } from '../store/index.js';
import { noAutorizado, prohibido } from '../utils/errores.js';

export const firmarToken = (u) =>
  jwt.sign({ id: String(u._id), rol: u.rol, email: u.email }, JWT_SECRET, { expiresIn: '8h', algorithm: 'HS256' });

export const verificarToken = (token) => jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

/**
 * Exige un token válido (Bearer). Ya NO existe el atajo "modo sin Mongo = admin":
 * sea cual sea la persistencia, sin token válido no se entra.
 * Además confirma que el usuario siga existiendo y activo (si lo desactivan, pierde acceso ya).
 */
export async function authRequired(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw noAutorizado();
  let payload;
  try { payload = verificarToken(token); } catch { throw noAutorizado('Token inválido o expirado'); }
  const u = await db.users.get(payload.id);
  if (!u || u.activo === false) throw noAutorizado('La cuenta no existe o está desactivada');
  req.usuario = { id: String(u._id), rol: u.rol, email: u.email, nombre: u.nombre };
  next();
}

export const requireRol = (...roles) => (req, _res, next) => {
  if (!req.usuario) throw noAutorizado();
  if (!roles.includes(req.usuario.rol)) throw prohibido();
  next();
};

export const authMiddleware = authRequired;

// Grupos de roles reutilizables.
export const ROLES_COCINA = ['admin', 'produccion', 'user'];
export const ROLES_REPARTO = ['admin', 'reparto', 'user'];
export const ROLES_STAFF = ['admin', 'produccion', 'reparto', 'user'];
