import { db } from '../store/index.js';
import { ingredientesDeReceta } from './precios.js';
import { badRequest, noEncontrado, texto, numero } from '../utils/errores.js';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

async function validarReceta(receta) {
  if (receta === undefined) return undefined;
  if (!Array.isArray(receta)) throw badRequest('La receta debe ser una lista.');
  const vistos = new Set();
  const out = [];
  for (const r of receta) {
    const id = String(r?.insumo ?? r?.insumoId ?? '');
    const cantidad = numero(r?.cantidad, 'La cantidad de la receta', { min: 0.0001, max: 1e5 });
    if (vistos.has(id)) throw badRequest('Un insumo está repetido en la receta.');
    vistos.add(id);
    if (!(await db.insumos.get(id))) throw badRequest('La receta tiene un insumo que no existe.');
    out.push({ insumo: id, cantidad });
  }
  return out;
}

export async function validarProducto(d, parcial = false) {
  const out = {};
  const campo = (k) => !parcial || d[k] !== undefined;
  if (campo('name')) out.name = texto(d.name, 'El nombre', { max: 100 });
  if (campo('category')) out.category = texto(d.category, 'La categoría', { max: 40 });
  if (campo('day')) {
    if (!DIAS.includes(d.day)) throw badRequest('Día inválido.');
    out.day = d.day;
  }
  if (campo('description')) out.description = texto(d.description, 'La descripción', { max: 400 });
  if (campo('image')) out.image = texto(d.image, 'La imagen', { max: 500 });
  if (campo('price')) out.price = numero(d.price, 'El precio', { min: 0, max: 1e7 });
  if (campo('precioEmpresa') && d.precioEmpresa !== undefined) out.precioEmpresa = numero(d.precioEmpresa, 'El precio empresa', { min: 0, max: 1e7 });
  if (campo('precioDescuento') && d.precioDescuento !== undefined) out.precioDescuento = numero(d.precioDescuento, 'El precio con descuento', { min: 0, max: 1e7 });
  if (d.ingredients !== undefined) {
    if (!Array.isArray(d.ingredients)) throw badRequest('Los ingredientes deben ser una lista.');
    out.ingredients = d.ingredients.map((x) => texto(x, 'Ingrediente', { max: 80 }));
  }
  if (d.tags !== undefined) {
    if (!Array.isArray(d.tags)) throw badRequest('Los tags deben ser una lista.');
    out.tags = d.tags.map((x) => texto(x, 'Tag', { max: 40 }));
  }
  if (d.destacado !== undefined) out.destacado = d.destacado ? texto(d.destacado, 'El badge', { max: 40 }) : null;
  if (d.rating !== undefined) {
    out.rating = {
      promedio: numero(d.rating?.promedio ?? 0, 'El rating', { min: 0, max: 5 }),
      cantidad: numero(d.rating?.cantidad ?? 0, 'La cantidad de reseñas', { min: 0, max: 1e7, entero: true }),
    };
  }
  if (d.activo !== undefined) out.activo = !!d.activo;
  if (d.soloEmpresas !== undefined) out.soloEmpresas = !!d.soloEmpresas;
  const receta = await validarReceta(d.receta);
  if (receta !== undefined) {
    out.receta = receta;
    // Los ingredientes que ve el cliente salen de los insumos de la receta (única fuente de verdad).
    if (receta.length) {
      const mapa = new Map((await db.insumos.list({})).map((i) => [String(i._id), i]));
      out.ingredients = ingredientesDeReceta(receta, mapa);
    }
  }
  return out;
}

export async function crearProducto(d) {
  return db.products.create({ activo: true, ...(await validarProducto(d)) });
}

export async function editarProducto(id, d) {
  const p = await db.products.update(id, await validarProducto(d, true));
  if (!p) throw noEncontrado('Producto no encontrado');
  return p;
}

export async function borrarProducto(id) {
  if (!(await db.products.remove(id))) throw noEncontrado('Producto no encontrado');
  return { message: 'Producto eliminado' };
}
