import Order from '../models/Order.js';
import { getModo } from '../config/modo.js';
import * as memoria from '../config/memoria.js';

// En mongo el id del usuario sale del token; en modo local no hay identidad real,
// así que el front lo manda en el body/query.
const userIdActual = (req) =>
  (req.usuario && !req.usuario.dev && req.usuario.id) || req.body.userId || req.query.userId || null;

// ---------- CLIENTE ----------
export const createOrder = async (req, res) => {
  try {
    const { items, totalAmount } = req.body;
    if (!items?.length) return res.status(400).json({ message: 'Carrito vacío' });
    const userId = userIdActual(req);
    if (getModo() !== 'mongo') return res.status(201).json(memoria.createOrder({ items, totalAmount, userId }));
    const saved = await new Order({ items, totalAmount, userId, estado: 'confirmado' }).save();
    res.status(201).json(saved);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const getMisPedidos = async (req, res) => {
  try {
    const userId = userIdActual(req);
    if (getModo() !== 'mongo') return res.json(memoria.getOrdersByUser(userId));
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ---------- EMPLEADO (user) — despacho ----------
export const getPendientes = async (req, res) => {
  try {
    if (getModo() !== 'mongo') return res.json(memoria.getOrdersByEstado('confirmado'));
    const orders = await Order.find({ estado: 'confirmado' }).sort({ createdAt: 1 });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const tomarPedido = async (req, res) => {
  try {
    const tomadoPor = userIdActual(req) || 'empleado';
    if (getModo() !== 'mongo') {
      const o = memoria.updateOrderEstado(req.params.id, 'tomado', { tomadoPor });
      return o ? res.json(o) : res.status(404).json({ message: 'Pedido no encontrado' });
    }
    const o = await Order.findByIdAndUpdate(req.params.id, { estado: 'tomado', tomadoPor }, { new: true });
    if (!o) return res.status(404).json({ message: 'Pedido no encontrado' });
    res.json(o);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const despacharPedido = async (req, res) => {
  try {
    if (getModo() !== 'mongo') {
      const o = memoria.updateOrderEstado(req.params.id, 'despachado');
      return o ? res.json(o) : res.status(404).json({ message: 'Pedido no encontrado' });
    }
    const o = await Order.findByIdAndUpdate(req.params.id, { estado: 'despachado' }, { new: true });
    if (!o) return res.status(404).json({ message: 'Pedido no encontrado' });
    res.json(o);
  } catch (e) { res.status(500).json({ message: e.message }); }
};