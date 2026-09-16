import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { getProducts,getProductsByDay ,createProduct,updateProduct ,deleteProduct } from '../controllers/productController.js';

const router = express.Router();

router.get('/',  getProducts);
router.get('/products', authRequired, getProductsByDay);
router.put('/:id', authRequired, updateProduct);
router.post('/', authRequired, createProduct);
router.delete('/:id', authRequired, deleteProduct);

export default router;