import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev_secret';

/**
 * Parsea el header Cookie a mano (no agregamos cookie-parser como dependencia
 * nueva solo para esto). Alcanza con encontrar "sb_token=...".
 */
function leerCookie(req, nombre) {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${nombre}=`));
  return match ? decodeURIComponent(match.slice(nombre.length + 1)) : null;
}

/**
 * Gatekeeper de páginas HTML privadas (admin, panel, etc.): verifica el rol
 * ANTES de mandar el archivo, a diferencia de servirlo como estático desde
 * /public (donde cualquiera puede pedir el .html directamente). Si no hay
 * sesión válida, redirige a login.html en vez de devolver la página.
 */
export function paginaRequiereRol(...roles) {
  return (req, res, next) => {
    const token = leerCookie(req, 'sb_token');
    if (!token) return res.redirect('/login.html');
    try {
      const payload = jwt.verify(token, SECRET);
      if (roles.length && !roles.includes(payload.rol)) return res.redirect('/login.html');
      req.usuario = payload;
      next();
    } catch {
      return res.redirect('/login.html');
    }
  };
}
