import { Router } from 'express';
import { authRequired, requireRol, ROLES_COCINA, ROLES_REPARTO, ROLES_STAFF } from '../middleware/auth.js';
import {
  createOrder, cotizarOrder, getMisPedidos, getPedido, cancelarPedido, getFechasEntrega,
  getCocina, getReparto, getTodos, patchEstado, patchPago,
} from '../controllers/orderController.js';

const router = Router();

// Cliente (el admin también puede pedir)
router.post('/', authRequired, requireRol('cliente', 'admin'), createOrder);
router.post('/cotizar', authRequired, requireRol('cliente', 'admin'), cotizarOrder);
router.get('/mis-pedidos', authRequired, requireRol('cliente', 'admin'), getMisPedidos);
router.get('/fechas', getFechasEntrega); // público: fecha de entrega de cada día

// Cocina / Producción
router.get('/cocina', authRequired, requireRol(...ROLES_COCINA), getCocina);
// Reparto / Entregas
router.get('/reparto', authRequired, requireRol(...ROLES_REPARTO), getReparto);
// Administración: todos los pedidos
router.get('/', authRequired, requireRol('admin'), getTodos);

// Un pedido (dueño o personal) y sus acciones
router.get('/:id', authRequired, getPedido);
router.patch('/:id/estado', authRequired, requireRol(...ROLES_STAFF), patchEstado);
router.patch('/:id/pago', authRequired, requireRol('admin', 'reparto', 'user'), patchPago);
router.post('/:id/cancelar', authRequired, requireRol('cliente', 'admin'), cancelarPedido);

export default router;
