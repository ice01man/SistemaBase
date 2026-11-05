import { verificarToken } from './auth.js';
import { db } from '../store/index.js';

/** Lee la cookie "sb_token" a mano (sin sumar cookie-parser). */
export function leerCookie(req, nombre) {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${nombre}=`));
  return match ? decodeURIComponent(match.slice(nombre.length + 1)) : null;
}

/**
 * Gatekeeper de páginas HTML privadas: verifica sesión y rol ANTES de mandar el archivo.
 * Sin sesión válida (o usuario desactivado) redirige a login.html.
 */
export function paginaRequiereRol(...roles) {
  return async (req, res, next) => {
    try {
      const token = leerCookie(req, 'sb_token');
      if (!token) return res.redirect('/login.html');
      const payload = verificarToken(token);
      const u = await db.users.get(payload.id);
      if (!u || u.activo === false) return res.redirect('/login.html');
      if (roles.length && !roles.includes(u.rol)) return res.redirect('/login.html');
      req.usuario = { id: String(u._id), rol: u.rol, email: u.email, nombre: u.nombre };
      next();
    } catch {
      return res.redirect('/login.html');
    }
  };
}
