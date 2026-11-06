// Zonas de reparto. El admin define el catálogo (Ajustes); cada CLIENTE tiene una zona y cada REPARTIDOR cubre una o más.
// El pedido copia la zona del cliente al crearse, y solo lo ven/operan los repartidores que cubren esa zona.
//
// Si todavía no hay zonas creadas, el sistema se comporta como antes (sin filtros): así no se rompe una instalación existente.
import { db, obtenerConfig } from '../store/index.js';
import { badRequest, conflicto, prohibido } from '../utils/errores.js';

const ABIERTOS = ['confirmado', 'en_preparacion', 'producido', 'en_camino'];

/** Valida la lista de zonas que manda el admin: texto, sin repetidas (sin distinguir mayúsculas), hasta 30. */
export function validarZonas(lista) {
  if (!Array.isArray(lista) || lista.length > 30) throw badRequest('Las zonas deben ser una lista de hasta 30.');
  const out = [];
  for (const z of lista) {
    if (typeof z !== 'string') throw badRequest('Cada zona debe ser un texto.');
    const n = z.trim().replace(/\s+/g, ' ');
    if (!n || n.length > 40) throw badRequest('El nombre de una zona debe tener entre 1 y 40 caracteres.');
    if (out.some((x) => x.toLowerCase() === n.toLowerCase())) throw badRequest(`La zona "${n}" está repetida.`);
    out.push(n);
  }
  return out;
}

/** Zona de un cliente: '' (sin zona) o el nombre de una zona existente. */
export async function normalizarZona(valor) {
  if (valor === '' || valor === null) return '';
  const { zonas } = await obtenerConfig();
  if (typeof valor !== 'string' || !zonas.includes(valor)) {
    throw badRequest(zonas.length ? 'Esa zona no existe. Elegí una de la lista.' : 'Todavía no hay zonas creadas: crealas primero en Ajustes.');
  }
  return valor;
}

/** Zonas que cubre un repartidor: lista de zonas existentes, sin repetir. */
export async function normalizarZonasReparto(lista) {
  if (!Array.isArray(lista)) throw badRequest('Las zonas del repartidor deben ser una lista.');
  const { zonas } = await obtenerConfig();
  const out = [];
  for (const z of lista) {
    if (typeof z !== 'string' || !zonas.includes(z)) throw badRequest(`La zona "${z}" no existe.`);
    if (!out.includes(z)) out.push(z);
  }
  return out;
}

/**
 * Zonas que puede ver/operar quien hace una acción de REPARTO.
 *   null  → todas (admin, roles que no reparten, o instalación sin zonas creadas)
 *   [..]  → solo esas (puede ser [] si todavía no le asignaron ninguna)
 */
export async function zonasDelActor(actor) {
  if (actor.rol === 'admin' || !['reparto', 'user'].includes(actor.rol)) return null;
  const { zonas } = await obtenerConfig();
  if (!zonas.length) return null;
  const u = await db.users.get(actor.id);
  return (u?.zonasReparto || []).filter((z) => zonas.includes(z));
}

export const puedeOperar = (zonas, pedido) => zonas === null || zonas.includes(pedido.zona);

/** Lanza 403 si el actor de reparto no cubre la zona del pedido. */
export async function exigirZona(actor, pedido) {
  const zonas = await zonasDelActor(actor);
  if (!puedeOperar(zonas, pedido)) {
    throw prohibido(pedido.zona ? `Este pedido es de la zona "${pedido.zona}", que no tenés asignada.` : 'Este pedido todavía no tiene zona: lo asigna el administrador.');
  }
}

/** Al cambiar la zona de un cliente, sus pedidos que todavía no salieron a la calle pasan a la zona nueva. */
export async function sincronizarPedidosAbiertos(userId, zona) {
  const pendientes = await db.orders.list({ userId: String(userId), estado: { $in: ['confirmado', 'en_preparacion', 'producido'] } });
  for (const p of pendientes) if ((p.zona || '') !== zona) await db.orders.update(p._id, { zona });
}

/** Cuántos usuarios y pedidos abiertos usan una zona (para no borrarla estando en uso). */
export async function usoDeZona(nombre) {
  const usuarios = (await db.users.list({})).filter((u) => u.zona === nombre || (u.zonasReparto || []).includes(nombre)).length;
  const pedidos = (await db.orders.list({ zona: nombre, estado: { $in: ABIERTOS } })).length;
  return { usuarios, pedidos };
}

export async function validarBajaDeZonas(actuales, nuevas) {
  for (const z of actuales.filter((x) => !nuevas.includes(x))) {
    const uso = await usoDeZona(z);
    if (uso.usuarios || uso.pedidos) {
      throw conflicto(`La zona "${z}" está en uso (${uso.usuarios} usuario(s), ${uso.pedidos} pedido(s) abiertos). Reasignalos antes de borrarla.`);
    }
  }
}
