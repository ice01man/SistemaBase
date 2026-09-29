import express from 'express';
import { getConfig, updateConfig } from '../controllers/configController.js';
import { authRequired, requireRol } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getConfig);                        // público: cualquiera necesita saber el tema activo
router.patch('/', authRequired, requireRol('admin'), updateConfig); // solo admin puede cambiar la apariencia

export default router;