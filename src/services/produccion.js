// Proceso P3 — Corte de producción: a la hora de corte se "congela" el día,
// se calcula cuánto insumo consumen los pedidos y se descuenta del stock.
import { db, obtenerConfig } from '../store/index.js';
import { ahora, esFecha } from '../utils/fecha.js';
import { badRequest } from '../utils/errores.js';
import { consumirInsumo, alertasDeStock } from './stock.js';

const redondear = (n) => Math.round(n * 1000) / 1000;
let corteEnCurso = false;

/** Suma insumos que consumen unos pedidos según la receta de cada plato. */
export async function consumoDePedidos(pedidos) {
  const productos = new Map((await db.products.list({})).map((p) => [String(p._id), p]));
  const insumos = new Map((await db.insumos.list({})).map((i) => [String(i._id), i]));
  const consumo = new Map();      // insumoId -> cantidad
  const sinReceta = new Set();    // nombres de platos sin receta cargada
  for (const ped of pedidos) {
    for (const it of ped.items) {
      const prod = productos.get(String(it.productId));
      if (!prod || !(prod.receta || []).length) { sinReceta.add(it.name); continue; }
      for (const r of prod.receta) {
        if (!insumos.has(String(r.insumo))) continue;
        consumo.set(String(r.insumo), (consumo.get(String(r.insumo)) || 0) + r.cantidad * it.qty);
      }
    }
  }
  return { consumo, insumos, sinReceta: [...sinReceta] };
}

/** Lo que tiene que producir la cocina para una fecha de entrega. */
export async function listaDeProduccion(fecha) {
  if (!esFecha(fecha)) throw badRequest('Fecha inválida (usá AAAA-MM-DD).');
  const pedidos = await db.orders.list({ fechaEntrega: fecha, estado: { $ne: 'cancelado' } });

  const porPlato = new Map();
  for (const p of pedidos) for (const it of p.items) {
    const k = String(it.productId);
    const f = porPlato.get(k) || { productId: k, name: it.name, qty: 0, pedidos: 0 };
    f.qty += it.qty; f.pedidos += 1;
    porPlato.set(k, f);
  }

  const pendientes = pedidos.filter((p) => !p.stockDescontado);
  const { consumo: aDescontar, insumos, sinReceta } = await consumoDePedidos(pendientes);
  const { consumo: total } = await consumoDePedidos(pedidos);

  const filas = [...total.entries()].map(([id, necesarioTotal]) => {
    const i = insumos.get(id);
    const pend = aDescontar.get(id) || 0;
    return {
      insumo: id, nombre: i.nombre, unidad: i.unidad, stock_actual: redondear(i.stock_actual),
      necesario_total: redondear(necesarioTotal), a_descontar: redondear(pend),
      faltante: redondear(Math.max(0, pend - i.stock_actual)),
    };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const porEstado = {};
  for (const p of pedidos) porEstado[p.estado] = (porEstado[p.estado] || 0) + 1;

  return {
    fecha,
    pedidos: pedidos.length,
    porEstado,
    platos: [...porPlato.values()].sort((a, b) => b.qty - a.qty),
    insumos: filas,
    sinReceta,
    corteEjecutado: pedidos.length > 0 && pendientes.length === 0,
    pedidosPendientesDeDescuento: pendientes.length,
  };
}

/**
 * Ejecuta el corte para una fecha: descuenta insumos de todos los pedidos no cancelados
 * que todavía no se descontaron. Es seguro correrlo dos veces (no descuenta doble).
 */
export async function ejecutarCorte(fecha, por = 'sistema') {
  if (!esFecha(fecha)) throw badRequest('Fecha inválida (usá AAAA-MM-DD).');
  if (corteEnCurso) throw badRequest('Ya hay un corte en curso. Esperá unos segundos.');
  corteEnCurso = true;
  const reclamados = [];
  try {
    const candidatos = await db.orders.list({ fechaEntrega: fecha, stockDescontado: false, estado: { $ne: 'cancelado' } });
    for (const p of candidatos) {
      // Compare-and-set: si otro proceso ya lo tomó, no lo contamos dos veces.
      const ok = await db.orders.updateOne({ _id: p._id, stockDescontado: false, estado: { $ne: 'cancelado' } }, { stockDescontado: true });
      if (ok) reclamados.push(p);
    }
    const { consumo, insumos, sinReceta } = await consumoDePedidos(reclamados);
    const motivo = `Corte de producción ${fecha}`;
    const consumos = [];
    const faltantes = [];
    try {
      for (const [id, cant] of consumo) {
        const ins = await db.insumos.get(id);
        const r = await consumirInsumo(ins, redondear(cant), motivo, por);
        consumos.push({ insumo: id, nombre: ins.nombre, unidad: ins.unidad, consumido: r.consumido, stock: r.stock });
        if (r.faltante > 0) faltantes.push({ insumo: id, nombre: ins.nombre, unidad: ins.unidad, faltante: r.faltante });
      }
    } catch (e) {
      for (const p of reclamados) await db.orders.update(p._id, { stockDescontado: false }); // deshacer marcas
      throw e;
    }
    return {
      fecha, pedidosProcesados: reclamados.length, consumos, faltantes, sinReceta,
      alertas: (await alertasDeStock()).map((i) => ({ nombre: i.nombre, unidad: i.unidad, stock_actual: i.stock_actual, stock_minimo: i.stock_minimo })),
    };
  } finally {
    corteEnCurso = false;
  }
}

/** Corte automático diario (sin dependencias): revisa cada minuto si ya es la hora. */
export function programarCorteDiario() {
  const revisar = async () => {
    try {
      const cfg = await obtenerConfig();
      const t = ahora();
      const laboral = t.dow >= 1 && t.dow <= 5;
      if (laboral && t.hora >= cfg.horaCorte && cfg.ultimoCorte !== t.fecha) {
        const r = await ejecutarCorte(t.fecha, 'sistema');
        await db.config.update(cfg._id, { ultimoCorte: t.fecha });
        console.log(`⏱️  Corte automático ${t.fecha}: ${r.pedidosProcesados} pedidos, ${r.faltantes.length} faltantes`);
      }
    } catch (e) {
      console.error('❌ Corte automático falló:', e.message);
    }
  };
  setTimeout(revisar, 5000).unref();
  setInterval(revisar, 60 * 1000).unref();
}
