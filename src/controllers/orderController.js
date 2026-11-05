import * as pedidos from '../services/pedidos.js';
import { esFecha } from '../utils/fecha.js';
import { ESTADOS } from '../models/Order.js';

const estadosDeQuery = (q) => {
  if (!q) return undefined;
  const lista = String(q).split(',').filter((e) => ESTADOS.includes(e));
  return lista.length ? lista : undefined;
};
const fechaDeQuery = (q) => (esFecha(q) ? q : undefined);

// ---------- CLIENTE ----------
export const createOrder = async (req, res) => res.status(201).json(await pedidos.crearPedido(req.usuario, req.body ?? {}));
export const getMisPedidos = async (req, res) => res.json(await pedidos.misPedidos(req.usuario.id));
export const getPedido = async (req, res) => res.json(await pedidos.obtenerPedido(req.params.id, req.usuario));
export const cancelarPedido = async (req, res) => res.json(await pedidos.cancelarPedido(req.params.id, req.usuario, req.body?.motivo));
export const getFechasEntrega = async (_req, res) => res.json(await pedidos.fechasDeEntrega());

// ---------- COCINA ----------
export const getCocina = async (req, res) =>
  res.json(await pedidos.listarPedidos({ estados: ['confirmado', 'en_preparacion'], fecha: fechaDeQuery(req.query.fecha) }));

// ---------- REPARTO ----------
export const getReparto = async (req, res) =>
  res.json(await pedidos.listarPedidos({ estados: ['producido', 'en_camino'], fecha: fechaDeQuery(req.query.fecha) }));

// ---------- ADMIN ----------
export const getTodos = async (req, res) =>
  res.json(await pedidos.listarPedidos({ estados: estadosDeQuery(req.query.estado), fecha: fechaDeQuery(req.query.fecha), desc: true }));

// ---------- CAMBIO DE ESTADO (cocina / reparto / admin) ----------
export const patchEstado = async (req, res) => res.json(await pedidos.cambiarEstado(req.params.id, req.usuario, req.body?.estado));
export const patchPago = async (req, res) => res.json(await pedidos.marcarPago(req.params.id, req.body?.pagado));
