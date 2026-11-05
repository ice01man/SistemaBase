import { db, obtenerConfig } from '../store/index.js';
import { badRequest } from '../utils/errores.js';
import { fechasDeEntrega } from '../services/pedidos.js';

const TEMAS = ['violeta', 'trueno', 'bosque'];

// GET /api/config → público: el front lo lee al cargar (tema y hora de corte)
export const getConfig = async (_req, res) => {
  const cfg = await obtenerConfig();
  res.json({ tema: cfg.tema, horaCorte: cfg.horaCorte });
};

// GET /api/config/entregas → público: fecha de entrega de cada día del menú
export const getEntregas = async (_req, res) => res.json(await fechasDeEntrega());

// PATCH /api/config → solo admin
export const updateConfig = async (req, res) => {
  const { tema, horaCorte } = req.body ?? {};
  const patch = {};
  if (tema !== undefined) {
    if (!TEMAS.includes(tema)) throw badRequest('Tema inválido');
    patch.tema = tema;
  }
  if (horaCorte !== undefined) {
    const h = Number(horaCorte);
    if (!Number.isInteger(h) || h < 0 || h > 23) throw badRequest('La hora de corte debe ser un entero entre 0 y 23.');
    patch.horaCorte = h;
  }
  const cfg = await obtenerConfig();
  const upd = await db.config.update(cfg._id, patch);
  res.json({ tema: upd.tema, horaCorte: upd.horaCorte });
};
