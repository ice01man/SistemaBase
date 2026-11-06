import * as pedidos from '../services/pedidos.js';
import { zonasDelActor } from '../services/zonas.js';
import { esFecha } from '../utils/fecha.js';
import { ESTADOS } from '../models/Order.js';

// El COSTO de los platos y el margen son datos internos: solo el admin los ve.
// Cliente, cocina y reparto reciben el pedido sin `costoTotal` ni `items[].costo`.
const sinCostos = (p) => {
  if (Array.isArray(p)) return p.map(sinCostos);
  if (!p || typeof p !== 'object') return p;
  const { costoTotal, ...resto } = p;
  return { ...resto, items: (p.items || []).map(({ costo, ...it }) => it) };
};
const enviar = (req, res, data, status = 200) => res.status(status).json(req.usuario?.rol === 'admin' ? data : sinCostos(data));

const estadosDeQuery = (q) => {
  if (!q) return undefined;
  const lista = String(q).split(',').filter((e) => ESTADOS.includes(e));
  return lista.length ? lista : undefined;
};
const fechaDeQuery = (q) => (esFecha(q) ? q : undefined);

// ---------- CLIENTE ----------
export const createOrder = async (req, res) => enviar(req, res, await pedidos.crearPedido(req.usuario, req.body ?? {}), 201);
export const cotizarOrder = async (req, res) => res.json(await pedidos.cotizarPedido(req.usuario, req.body ?? {}));
export const getMisPedidos = async (req, res) => enviar(req, res, await pedidos.misPedidos(req.usuario.id));
export const getPedido = async (req, res) => enviar(req, res, await pedidos.obtenerPedido(req.params.id, req.usuario));
export const cancelarPedido = async (req, res) => enviar(req, res, await pedidos.cancelarPedido(req.params.id, req.usuario, req.body?.motivo));
export const getFechasEntrega = async (_req, res) => res.json(await pedidos.fechasDeEntrega());

// ---------- COCINA ----------
export const getCocina = async (req, res) =>
  enviar(req, res, await pedidos.listarPedidos({ estados: ['confirmado', 'en_preparacion'], fecha: fechaDeQuery(req.query.fecha) }));

// ---------- REPARTO ----------
export const getReparto = async (req, res) =>
  enviar(req, res, await pedidos.listarPedidos({ estados: ['producido', 'en_camino'], fecha: fechaDeQuery(req.query.fecha), zonas: await zonasDelActor(req.usuario) }));

// ---------- ADMIN ----------
export const getTodos = async (req, res) =>
  enviar(req, res, await pedidos.listarPedidos({ estados: estadosDeQuery(req.query.estado), fecha: fechaDeQuery(req.query.fecha), desc: true }));

// ---------- CAMBIO DE ESTADO (cocina / reparto / admin) ----------
export const patchEstado = async (req, res) => enviar(req, res, await pedidos.cambiarEstado(req.params.id, req.usuario, req.body?.estado));
export const patchPago = async (req, res) => enviar(req, res, await pedidos.marcarPago(req.params.id, req.body?.pagado === true, req.usuario));
