import { db } from '../store/index.js';
import { crearProducto, editarProducto, borrarProducto } from '../services/productos.js';
import { badRequest } from '../utils/errores.js';

// El menú público NO expone la receta (es información interna de cocina).
const sinReceta = ({ receta, ...p }) => p;

export const getProducts = async (_req, res) => {
  res.json((await db.products.list({ activo: { $ne: false } })).map(sinReceta));
};

export const getProductsByDay = async (req, res) => {
  res.json((await db.products.list({ day: String(req.query.day ?? ''), activo: { $ne: false } })).map(sinReceta));
};

export const getProductsByCategory = async (req, res) => {
  const category = req.query.category;
  if (typeof category !== 'string' || !category) throw badRequest('Falta la categoría');
  res.json((await db.products.list({ category, activo: { $ne: false } })).map(sinReceta));
};

// Admin: todos (activos e inactivos) y con receta.
export const getProductsAdmin = async (_req, res) => {
  res.json(await db.products.list({}, { sort: { day: 1, name: 1 } }));
};

export const createProduct = async (req, res) => res.status(201).json(await crearProducto(req.body ?? {}));
export const updateProduct = async (req, res) => res.json(await editarProducto(req.params.id, req.body ?? {}));
export const deleteProduct = async (req, res) => res.json(await borrarProducto(req.params.id));
