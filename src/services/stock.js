import { db } from '../store/index.js';
import { badRequest, noEncontrado, texto, numero, conflicto } from '../utils/errores.js';

const UNIDADES = ['kg', 'g', 'l', 'ml', 'u'];
const redondear = (n) => Math.round(n * 1000) / 1000;

export const conAlerta = (i) => ({ ...i, bajoMinimo: i.activo !== false && i.stock_actual < i.stock_minimo });

export async function listarInsumos({ soloActivos = false } = {}) {
  const lista = await db.insumos.list(soloActivos ? { activo: true } : {}, { sort: { nombre: 1 } });
  return lista.map(conAlerta);
}

export async function alertasDeStock() {
  return (await listarInsumos({ soloActivos: true })).filter((i) => i.bajoMinimo);
}

function validarInsumo(d, parcial = false) {
  const out = {};
  if (!parcial || d.nombre !== undefined) out.nombre = texto(d.nombre, 'El nombre', { max: 80 });
  if (!parcial || d.unidad !== undefined) {
    if (!UNIDADES.includes(d.unidad)) throw badRequest(`Unidad inválida (${UNIDADES.join(', ')}).`);
    out.unidad = d.unidad;
  }
  if (!parcial || d.stock_minimo !== undefined) out.stock_minimo = numero(d.stock_minimo ?? 0, 'El stock mínimo', { max: 1e7 });
  if (!parcial || d.costo_unitario !== undefined) out.costo_unitario = numero(d.costo_unitario ?? 0, 'El costo', { max: 1e9 });
  if (d.activo !== undefined) out.activo = !!d.activo;
  return out;
}

export async function crearInsumo(d, por) {
  const datos = validarInsumo(d);
  const stockInicial = numero(d.stock_actual ?? 0, 'El stock inicial', { max: 1e7 });
  try {
    const i = await db.insumos.create({ ...datos, stock_actual: stockInicial, activo: datos.activo ?? true });
    if (stockInicial > 0) await registrar(i, 'ingreso', stockInicial, 'Stock inicial', por);
    return conAlerta(i);
  } catch (e) {
    if (e.code === 11000) throw conflicto('Ya existe un insumo con ese nombre.');
    throw e;
  }
}

export async function editarInsumo(id, d) {
  const datos = validarInsumo(d, true);
  // El stock NO se edita acá: se mueve con movimientos para que quede auditado.
  try {
    const i = await db.insumos.update(id, datos);
    if (!i) throw noEncontrado('Insumo no encontrado');
    return conAlerta(i);
  } catch (e) {
    if (e.code === 11000) throw conflicto('Ya existe un insumo con ese nombre.');
    throw e;
  }
}

export async function borrarInsumo(id) {
  const usados = await db.products.list({});
  if (usados.some((p) => (p.receta || []).some((r) => String(r.insumo) === String(id)))) {
    throw conflicto('El insumo está en la receta de algún plato. Desactivalo o sacalo de la receta primero.');
  }
  if (!(await db.insumos.remove(id))) throw noEncontrado('Insumo no encontrado');
  return { message: 'Insumo eliminado' };
}

async function registrar(insumo, tipo, cantidad, motivo, por) {
  return db.movimientos.create({
    insumo: insumo._id, nombre: insumo.nombre, tipo, cantidad: redondear(cantidad),
    stock_resultante: redondear(insumo.stock_actual), motivo: motivo || '', por: por || '',
  });
}

/**
 * Movimiento manual de stock.
 *  ingreso → suma (compra/reposición) · egreso → resta (merma, vencimiento) · ajuste → fija el valor contado
 */
export async function moverStock(id, { tipo, cantidad, motivo }, por) {
  if (!['ingreso', 'egreso', 'ajuste'].includes(tipo)) throw badRequest('Tipo de movimiento inválido.');
  cantidad = numero(cantidad, 'La cantidad', { min: tipo === 'ajuste' ? 0 : 0.001, max: 1e7 });
  motivo = texto(motivo, 'El motivo', { max: 200, requerido: tipo !== 'ingreso' });
  const actual = await db.insumos.get(id);
  if (!actual) throw noEncontrado('Insumo no encontrado');
  let nuevo;
  if (tipo === 'ingreso') nuevo = actual.stock_actual + cantidad;
  else if (tipo === 'egreso') {
    if (cantidad > actual.stock_actual) throw badRequest(`No hay tanto stock (disponible: ${redondear(actual.stock_actual)} ${actual.unidad}).`);
    nuevo = actual.stock_actual - cantidad;
  } else nuevo = cantidad;
  const i = await db.insumos.update(id, { stock_actual: redondear(nuevo) });
  await registrar(i, tipo, tipo === 'ajuste' ? Math.abs(nuevo - actual.stock_actual) : cantidad, motivo, por);
  return conAlerta(i);
}

export async function listarMovimientos({ insumo, limit = 200 } = {}) {
  return db.movimientos.list(insumo ? { insumo } : {}, { sort: { createdAt: -1 }, limit });
}

/** Resta stock por consumo de producción. Nunca deja negativo: devuelve lo que faltó. */
export async function consumirInsumo(insumo, cantidad, motivo, por) {
  const disponible = Math.max(0, insumo.stock_actual);
  const consumido = Math.min(disponible, cantidad);
  const faltante = redondear(cantidad - consumido);
  if (consumido > 0) {
    const i = await db.insumos.inc(insumo._id, 'stock_actual', -consumido);
    i.stock_actual = redondear(i.stock_actual);
    await db.insumos.update(insumo._id, { stock_actual: i.stock_actual });
    await registrar(i, 'consumo', consumido, motivo, por);
    return { consumido: redondear(consumido), faltante, stock: i.stock_actual };
  }
  return { consumido: 0, faltante, stock: insumo.stock_actual };
}

/** Devuelve stock (cancelación de un pedido ya descontado). */
export async function reponerInsumo(insumo, cantidad, motivo, por) {
  const i = await db.insumos.inc(insumo._id, 'stock_actual', cantidad);
  const stock = redondear(i.stock_actual);
  await db.insumos.update(insumo._id, { stock_actual: stock });
  await registrar({ ...i, stock_actual: stock }, 'reposicion', cantidad, motivo, por);
}
