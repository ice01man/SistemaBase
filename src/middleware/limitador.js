// Limitador de intentos FALLIDOS en memoria (sin dependencias): frena la fuerza bruta en login/registro.
// Los ingresos correctos no cuentan: solo se anotan las respuestas con error (400 o más).
export function limitador({ ventanaMs = 15 * 60 * 1000, max = 10, mensaje = 'Demasiados intentos. Probá de nuevo en unos minutos.' } = {}) {
  const fallos = new Map(); // ip -> [timestamps de intentos fallidos]
  return (req, res, next) => {
    const ahora = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || 'x';
    const recientes = (fallos.get(ip) || []).filter((t) => ahora - t < ventanaMs);
    fallos.set(ip, recientes);
    if (recientes.length >= max) {
      res.set('Retry-After', String(Math.ceil(ventanaMs / 1000)));
      return res.status(429).json({ error: mensaje });
    }
    res.on('finish', () => {
      if (res.statusCode >= 400 && res.statusCode !== 429) {
        const lista = (fallos.get(ip) || []).filter((t) => Date.now() - t < ventanaMs);
        lista.push(Date.now());
        fallos.set(ip, lista);
      }
    });
    if (fallos.size > 5000) for (const [k, v] of fallos) if (!v.some((t) => ahora - t < ventanaMs)) fallos.delete(k);
    next();
  };
}
