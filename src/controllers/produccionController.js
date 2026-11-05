import { ahora } from '../utils/fecha.js';
import { listaDeProduccion, ejecutarCorte } from '../services/produccion.js';
import { resumen } from '../services/reportes.js';

const fechaOHoy = (f) => (typeof f === 'string' && f ? f : ahora().fecha);

// GET /api/produccion/lista?fecha=AAAA-MM-DD → qué cocinar y qué insumos hacen falta
export const getLista = async (req, res) => res.json(await listaDeProduccion(fechaOHoy(req.query.fecha)));

// POST /api/produccion/corte {fecha?} → corte manual (descuenta stock). Seguro de repetir.
export const postCorte = async (req, res) =>
  res.json(await ejecutarCorte(fechaOHoy(req.body?.fecha), req.usuario.nombre || req.usuario.email));

// GET /api/produccion/reportes?desde=&hasta= → tablero del admin
export const getResumen = async (req, res) =>
  res.json(await resumen({ desde: req.query.desde, hasta: req.query.hasta }));
