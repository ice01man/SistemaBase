import * as stock from '../services/stock.js';

export const getInsumos = async (_req, res) => res.json(await stock.listarInsumos());
export const getAlertas = async (_req, res) => res.json(await stock.alertasDeStock());
export const createInsumo = async (req, res) => res.status(201).json(await stock.crearInsumo(req.body ?? {}, req.usuario.nombre));
export const updateInsumo = async (req, res) => res.json(await stock.editarInsumo(req.params.id, req.body ?? {}));
export const deleteInsumo = async (req, res) => res.json(await stock.borrarInsumo(req.params.id));
export const moverInsumo = async (req, res) => res.json(await stock.moverStock(req.params.id, req.body ?? {}, req.usuario.nombre));
export const getMovimientos = async (req, res) =>
  res.json(await stock.listarMovimientos({ insumo: typeof req.query.insumo === 'string' ? req.query.insumo : undefined }));
