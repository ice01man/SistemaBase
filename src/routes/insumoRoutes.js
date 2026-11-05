import { Router } from 'express';
import { authRequired, requireRol, ROLES_COCINA } from '../middleware/auth.js';
import {
  getInsumos, getAlertas, createInsumo, updateInsumo, deleteInsumo, moverInsumo, getMovimientos,
} from '../controllers/insumoController.js';

const router = Router();

// Ver stock: admin y cocina. Modificar stock: admin y producción (no el empleado general).
router.get('/', authRequired, requireRol(...ROLES_COCINA), getInsumos);
router.get('/alertas', authRequired, requireRol(...ROLES_COCINA), getAlertas);
router.get('/movimientos', authRequired, requireRol('admin', 'produccion'), getMovimientos);
router.post('/', authRequired, requireRol('admin'), createInsumo);
router.put('/:id', authRequired, requireRol('admin'), updateInsumo);
router.delete('/:id', authRequired, requireRol('admin'), deleteInsumo);
router.post('/:id/movimiento', authRequired, requireRol('admin', 'produccion'), moverInsumo);

export default router;
