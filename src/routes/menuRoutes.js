import express from 'express';
import { crearMenu, listarMenus, obtenerMenu } from '../controllers/menuController.js';


const router = express.Router();

// Rutas protegidas
router.post('/crear', crearMenu);
router.get('/listar', listarMenus);
router.get('/:id', obtenerMenu);

export default router;