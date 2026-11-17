// Versión LITE: lista BLANCA de endpoints. Todo lo que no figura acá responde 404 como si no existiera
// (usuarios, configuración de admin, reportes, alta/baja de platos o insumos, listado general de pedidos...).
const RUTAS = [
  ['POST', /^\/auth\/(login|register|logout)$/],
  ['GET', /^\/auth\/me$/], ['PATCH', /^\/auth\/me$/],
  ['GET', /^\/products(\/by-day|\/by-category)?$/],
  ['GET', /^\/config(\/entregas)?$/],
  ['POST', /^\/orders$/], ['POST', /^\/orders\/cotizar$/],
  ['GET', /^\/orders\/(mis-pedidos|fechas|cocina|reparto)$/],
  ['PATCH', /^\/orders\/[^/]+\/(estado|pago)$/], ['POST', /^\/orders\/[^/]+\/cancelar$/],
  ['GET', /^\/insumos(\/alertas)?$/], ['POST', /^\/insumos\/[^/]+\/movimiento$/],
  ['GET', /^\/produccion\/lista$/], ['POST', /^\/produccion\/corte$/],
];

export const soloRutasLite = (req, res, next) => {
  const path = req.path.replace(/\/+$/, '') || '/';
  if (RUTAS.some(([m, re]) => m === req.method && re.test(path))) return next();
  return res.status(404).json({ error: 'Ruta no encontrada' });
};
