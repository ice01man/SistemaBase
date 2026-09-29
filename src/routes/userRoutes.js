import express from 'express';
import { authRequired, requireRol } from '../middleware/auth.js';
import { getUsers, createUser,updateUser ,deleteUser } from '../controllers/userController.js';

const router = express.Router();

// Gestión de usuarios: exclusiva de admin (antes cualquier logueado podía crear/borrar usuarios)
router.get('/', authRequired, requireRol('admin'), getUsers);
router.post('/', authRequired, requireRol('admin'), createUser);
router.put('/:id', authRequired, requireRol('admin'), updateUser);
router.delete('/:id', authRequired, requireRol('admin'), deleteUser);

export default router;