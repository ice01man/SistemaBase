import { Router } from 'express';
import { login, register, logout, me, updateMe } from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';
import { limitador } from '../middleware/limitador.js';

const router = Router();

// Freno a la fuerza bruta: 10 intentos de login cada 15 min por IP, 10 altas por hora.
router.post('/login', limitador({ max: 10 }), login);
router.post('/register', limitador({ max: 10, ventanaMs: 60 * 60 * 1000 }), register);
router.post('/logout', logout);
router.get('/me', authRequired, me);
router.patch('/me', authRequired, updateMe);

export default router;
