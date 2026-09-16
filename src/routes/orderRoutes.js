import { Router } from 'express';
import { authRequired, requireRol } from '../middleware/auth.js';
import { createOrder, getMisPedidos, getPendientes, tomarPedido, despacharPedido } from '../controllers/orderController.js';

const router = Router();

// Cliente
router.post('/', authRequired, requireRol('cliente', 'admin'), createOrder);
router.get('/mis-pedidos', authRequired, requireRol('cliente', 'admin'), getMisPedidos);

// Empleado (user) — despacho
router.get('/pendientes', authRequired, requireRol('user', 'admin'), getPendientes);
router.patch('/:id/tomar', authRequired, requireRol('user', 'admin'), tomarPedido);
router.patch('/:id/despachar', authRequired, requireRol('user', 'admin'), despacharPedido);

export default router;