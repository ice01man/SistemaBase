import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
  
  if (process.env.PERSISTENCIA !== 'mongo') {
    req.usuario = { rol: 'admin', dev: true };
    return next();
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export const requireRol = (...roles) => (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ error: 'No autenticado' });
  if (req.usuario.dev) return next();           
  if (!roles.includes(req.usuario.rol))
    return res.status(403).json({ error: 'No tenés permisos para esta acción' });
  next();
};

export const authMiddleware = authRequired; 
