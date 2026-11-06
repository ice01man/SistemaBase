import express from 'express';
import { getConfig, getConfigAdmin, updateConfig, getEntregas } from '../controllers/configController.js';
import { authRequired, requireRol } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getConfig);               // público: tema y hora de corte
router.get('/entregas', getEntregas);     // público: fechas de entrega por día de menú
router.get('/admin', authRequired, requireRol('admin'), getConfigAdmin); // incluye margen objetivo
router.patch('/', authRequired, requireRol('admin'), updateConfig); // solo admin

export default router;
