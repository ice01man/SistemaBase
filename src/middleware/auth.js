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

/**
 * Como authRequired pero sin cortar: si hay un token válido, deja req.usuario (con tipoCliente); si no, sigue como visitante.
 * Lo usan los menús públicos para mostrar los platos "solo empresas" únicamente a clientes Empresa.
 */
export async function authOpcional(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const u = await db.users.get(verificarToken(token).id);
      if (u && u.activo !== false) req.usuario = { id: String(u._id), rol: u.rol, email: u.email, nombre: u.nombre, tipoCliente: u.tipoCliente || 'final' };
    } catch { /* token vencido o inválido: se lo trata como visitante */ }
  }
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
