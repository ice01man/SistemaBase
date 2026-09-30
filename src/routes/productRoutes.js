import express from 'express';
import { authRequired, requireRol } from '../middleware/auth.js';
import { getProducts,getProductsByDay ,getProductsByCategory, getProductsAdmin, createProduct,updateProduct ,deleteProduct } from '../controllers/productController.js';

const router = express.Router();

router.get('/',  getProducts);
router.get('/by-day', getProductsByDay); // público: así arma el menú quien todavía no inició sesión
router.get('/by-category', getProductsByCategory); // público: "Ver platos →" de una categoría, cualquier día
router.get('/admin', authRequired, requireRol('admin'), getProductsAdmin); // admin: incluye inactivos
router.put('/:id', authRequired, requireRol('admin'), updateProduct);
router.post('/', authRequired, requireRol('admin'), createProduct);
router.delete('/:id', authRequired, requireRol('admin'), deleteProduct);

export default router;