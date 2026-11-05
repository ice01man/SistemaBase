import { Router } from 'express';
import { authRequired, requireRol, ROLES_COCINA } from '../middleware/auth.js';
import { getLista, postCorte, getResumen } from '../controllers/produccionController.js';

const router = Router();

router.get('/lista', authRequired, requireRol(...ROLES_COCINA), getLista);
router.post('/corte', authRequired, requireRol('admin', 'produccion'), postCorte);
router.get('/reportes', authRequired, requireRol('admin'), getResumen);

export default router;
