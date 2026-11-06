import { db, obtenerConfig } from '../store/index.js';
import { costoDeReceta, precioSugerido, margenReal, ingredientesDeReceta } from '../services/precios.js';
import { crearProducto, editarProducto, borrarProducto } from '../services/productos.js';
import { badRequest } from '../utils/errores.js';

// El menú público NO expone la receta (es información interna de cocina), pero los "ingredientes" que ve el cliente
// salen de los insumos de esa receta (si el plato tiene receta). También se ocultan los precios de las otras listas.
const mapaInsumos = async () => new Map((await db.insumos.list({})).map((i) => [String(i._id), i]));
const paraPublico = (insumos) => ({ receta, precioEmpresa, precioDescuento, ...p }) => {
  const ing = ingredientesDeReceta(receta, insumos);
  return ing.length ? { ...p, ingredients: ing } : p;
};

// Los platos "solo empresas" los ven únicamente los clientes tipo Empresa (y el admin). El visitante y el cliente final no.
const veMenuEmpresas = (u) => !!u && (u.rol === 'admin' || u.tipoCliente === 'empresa');
const visibles = (req) => (p) => !p.soloEmpresas || veMenuEmpresas(req.usuario);

export const getProducts = async (req, res) => {
  res.json((await db.products.list({ activo: { $ne: false } })).filter(visibles(req)).map(paraPublico(await mapaInsumos())));
};

export const getProductsByDay = async (req, res) => {
  res.json((await db.products.list({ day: String(req.query.day ?? ''), activo: { $ne: false } })).filter(visibles(req)).map(paraPublico(await mapaInsumos())));
};

export const getProductsByCategory = async (req, res) => {
  const category = req.query.category;
  if (typeof category !== 'string' || !category) throw badRequest('Falta la categoría');
  res.json((await db.products.list({ category, activo: { $ne: false } })).filter(visibles(req)).map(paraPublico(await mapaInsumos())));
};

// Admin: todos (activos e inactivos) y con receta.
// Cada plato trae su costo de receta, el precio sugerido (margen objetivo REAL sobre la venta) y el margen real actual.
export const getProductsAdmin = async (_req, res) => {
  const [lista, insumos, cfg] = await Promise.all([
    db.products.list({}, { sort: { day: 1, name: 1 } }),
    db.insumos.list({}),
    obtenerConfig(),
  ]);
  const mapa = new Map(insumos.map((i) => [String(i._id), i]));
  res.json(lista.map((p) => {
    const c = costoDeReceta(p.receta, mapa);
    return {
      ...p,
      costo: c.costo, costoDetalle: c.detalle, costoIncompleto: c.sinCosto || !(p.receta || []).length,
      ingredients: ingredientesDeReceta(p.receta, mapa).length ? ingredientesDeReceta(p.receta, mapa) : p.ingredients,
      precioSugerido: precioSugerido(c.costo, cfg.margenObjetivo),
      margenReal: margenReal(p.price, c.costo),
      margenEmpresa: p.precioEmpresa > 0 ? margenReal(p.precioEmpresa, c.costo) : null,
      margenDescuento: p.precioDescuento > 0 ? margenReal(p.precioDescuento, c.costo) : null,
    };
  }));
};

export const createProduct = async (req, res) => res.status(201).json(await crearProducto(req.body ?? {}));
export const updateProduct = async (req, res) => res.json(await editarProducto(req.params.id, req.body ?? {}));
export const deleteProduct = async (req, res) => res.json(await borrarProducto(req.params.id));
