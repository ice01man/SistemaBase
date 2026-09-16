import { Router } from 'express';
import { login } from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);


export default router;
