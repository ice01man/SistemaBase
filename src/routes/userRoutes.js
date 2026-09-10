import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { getUsers, createUser, deleteUser } from '../controllers/userController.js';

const router = express.Router();

// Todas estas rutas requieren autenticación
router.get('/', authRequired, getUsers);
router.post('/', authRequired, createUser);
router.delete('/:id', authRequired, deleteUser);

export default router;