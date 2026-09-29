import express from 'express';
import { authRequired, requireRol } from '../middleware/auth.js';
import { getProducts,getProductsByDay ,createProduct,updateProduct ,deleteProduct } from '../controllers/productController.js';

const router = express.Router();

router.get('/',  getProducts);
router.get('/by-day', getProductsByDay); // público: así arma el menú quien todavía no inició sesión
router.put('/:id', authRequired, requireRol('admin'), updateProduct);
router.post('/', authRequired, requireRol('admin'), createProduct);
router.delete('/:id', authRequired, requireRol('admin'), deleteProduct);

export default router;