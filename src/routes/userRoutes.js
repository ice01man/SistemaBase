import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { getUsers, createUser,updateUser ,deleteUser } from '../controllers/userController.js';

const router = express.Router();

// Todas estas rutas requieren autenticación
router.get('/', authRequired, getUsers);
router.post('/', authRequired, createUser);
router.put('/:id', authRequired, updateUser);
router.delete('/:id', authRequired, deleteUser);

export default router;