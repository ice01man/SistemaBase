import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { getProducts, createProduct, deleteProduct } from '../controllers/productController.js';

const router = express.Router();

router.get('/', authRequired, getProducts);
router.post('/', authRequired, createProduct);
router.delete('/:id', authRequired, deleteProduct);

export default router;