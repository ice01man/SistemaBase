import { db, obtenerConfig } from '../store/index.js';
import { ahora, esFecha } from '../utils/fecha.js';
import { badRequest, noEncontrado, texto, numero, conflicto } from '../utils/errores.js';

const UNIDADES = ['kg', 'g', 'l', 'ml', 'u'];
const redondear = (n) => Math.round(n * 1000) / 1000;

export const CATEGORIAS = ['Verduras', 'Frutas', 'Lácteos', 'Carnes', 'Almacén', 'Envases', 'Otros'];
const DIAS_AVISO_VENCIMIENTO = 7; // "vence pronto" = faltan 7 días o menos
const diasEntre = (desde, hasta) => Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000);

/**
 * Agrega al insumo sus alertas:
 *  bajoMinimo  → stock por debajo del mínimo
 *  llegando    → stock todavía ≥ mínimo, pero a menos de `umbral` % por encima de él
 *  vencido / vencePronto → según la fecha de vencimiento del lote
 *  nivel       → 'critico' (bajo mínimo o vencido), 'aviso' (llegando o vence pronto) u 'ok'
 */
export function conAlerta(i, { umbral = 25, hoy = ahora().fecha } = {}) {
  const activo = i.activo !== false;
  const bajoMinimo = activo && i.stock_actual < i.stock_minimo;
  const llegando = activo && !bajoMinimo && i.stock_minimo > 0 && i.stock_actual <= i.stock_minimo * (1 + umbral / 100);
  const diasParaVencer = i.vencimiento ? diasEntre(hoy, i.vencimiento) : null;
  const vencido = activo && diasParaVencer !== null && diasParaVencer < 0;
  const vencePronto = activo && diasParaVencer !== null && diasParaVencer >= 0 && diasParaVencer <= DIAS_AVISO_VENCIMIENTO;
  const nivel = bajoMinimo || vencido ? 'critico' : llegando || vencePronto ? 'aviso' : 'ok';
  return { ...i, categoria: i.categoria || 'Otros', vencimiento: i.vencimiento || '', bajoMinimo, llegando, diasParaVencer, vencido, vencePronto, nivel };
}

async function opcionesAlerta() {
  const cfg = await obtenerConfig();
  return { umbral: cfg.umbralStockPct, hoy: ahora().fecha };
}

export async function listarInsumos({ soloActivos = false } = {}) {
  const [lista, op] = await Promise.all([db.insumos.list(soloActivos ? { activo: true } : {}, { sort: { nombre: 1 } }), opcionesAlerta()]);
  return lista.map((i) => conAlerta(i, op));
}

export async function alertasDeStock() {
  return (await listarInsumos({ soloActivos: true })).filter((i) => i.bajoMinimo);
}

/** '' = sin vencimiento. Si viene, tiene que ser una fecha AAAA-MM-DD válida. */
function fechaVencimiento(v) {
  if (v === '' || v === null) return '';
  if (!esFecha(v)) throw badRequest('Fecha de vencimiento inválida (usá AAAA-MM-DD).');
  return v;
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
  if (d.categoria !== undefined) {
    if (!CATEGORIAS.includes(d.categoria)) throw badRequest(`Categoría inválida (${CATEGORIAS.join(', ')}).`);
    out.categoria = d.categoria;
  }
  if (d.vencimiento !== undefined) out.vencimiento = fechaVencimiento(d.vencimiento);
  if (d.activo !== undefined) out.activo = !!d.activo;
  return out;
}

export async function crearInsumo(d, por) {
  const datos = validarInsumo(d);
  const stockInicial = numero(d.stock_actual ?? 0, 'El stock inicial', { max: 1e7 });
  try {
    const i = await db.insumos.create({ ...datos, stock_actual: stockInicial, activo: datos.activo ?? true });
    if (stockInicial > 0) await registrar(i, 'ingreso', stockInicial, 'Stock inicial', por);
    return conAlerta(i, await opcionesAlerta());
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
    return conAlerta(i, await opcionesAlerta());
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
export async function moverStock(id, { tipo, cantidad, motivo, vencimiento }, por) {
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
  // En un ingreso se puede cargar el vencimiento del lote nuevo (reemplaza al anterior).
  const patch = { stock_actual: redondear(nuevo) };
  if (tipo === 'ingreso' && vencimiento) patch.vencimiento = fechaVencimiento(vencimiento);
  const i = await db.insumos.update(id, patch);
  await registrar(i, tipo, tipo === 'ajuste' ? Math.abs(nuevo - actual.stock_actual) : cantidad, motivo, por);
  return conAlerta(i, await opcionesAlerta());
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
