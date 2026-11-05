import { db, obtenerConfig } from '../store/index.js';
import { ahora, antesDelCorte, esFecha, fechaDeEntrega } from '../utils/fecha.js';
import { ErrorHttp, badRequest, conflicto, noEncontrado, prohibido, texto, numero } from '../utils/errores.js';
import { ROLES_COCINA, ROLES_REPARTO } from '../middleware/auth.js';
import { consumoDePedidos } from './produccion.js';
import { reponerInsumo } from './stock.js';

const DIAS_MENU = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

// estado destino → { desde, roles que pueden hacerlo }
const TRANSICIONES = {
  en_preparacion: { desde: 'confirmado',     roles: ROLES_COCINA },
  producido:      { desde: 'en_preparacion', roles: ROLES_COCINA },
  en_camino:      { desde: 'producido',      roles: ROLES_REPARTO },
  entregado:      { desde: 'en_camino',      roles: ROLES_REPARTO },
};

const decorar = (p, horaCorte) => ({
  ...p,
  puedeCancelar: p.estado === 'confirmado' && !p.stockDescontado && antesDelCorte(p.fechaEntrega, horaCorte),
});

/** Fechas de entrega de cada día del menú (para mostrar "Entrega: miércoles 12/11" en el carrito). */
export async function fechasDeEntrega() {
  const { horaCorte } = await obtenerConfig();
  const ref = ahora();
  return { horaCorte, hoy: ref.fecha, entregas: Object.fromEntries(DIAS_MENU.map((d) => [d, fechaDeEntrega(d, horaCorte, ref)])) };
}

/**
 * Crea un pedido. IMPORTANTE: el cliente solo manda QUÉ y CUÁNTO (productId + qty).
 * Nombre, precio y total se leen de la base: lo que mande el navegador se ignora.
 */
export async function crearPedido(actor, body) {
  const dia = body?.dia;
  if (!DIAS_MENU.includes(dia)) throw badRequest('Elegí un día del menú (lunes a viernes).');
  if (!Array.isArray(body?.items) || body.items.length === 0) throw badRequest('Carrito vacío.');
  if (body.items.length > 30) throw badRequest('Demasiados platos distintos en un pedido.');

  const pedidos = new Map(); // productId -> qty (si repiten el plato, se suman)
  for (const it of body.items) {
    const id = texto(String(it?.productId ?? ''), 'El plato', { max: 40 });
    const qty = numero(it?.qty, 'La cantidad', { min: 1, max: 50, entero: true });
    pedidos.set(id, (pedidos.get(id) || 0) + qty);
  }

  const items = [];
  let total = 0;
  for (const [id, qty] of pedidos) {
    if (qty > 50) throw badRequest('Máximo 50 unidades por plato.');
    const p = await db.products.get(id);
    if (!p || p.activo === false) throw badRequest('Un plato del carrito ya no está disponible. Actualizá el menú.');
    if (p.day !== dia) throw badRequest(`"${p.name}" no es del menú del ${dia}.`);
    items.push({ productId: String(p._id), name: p.name, price: p.price, qty });
    total += p.price * qty;
  }

  const user = await db.users.get(actor.id);
  if (!user) throw noEncontrado('Usuario no encontrado');
  const direccion = texto(body.direccion || user.direccion || '', 'La dirección de entrega', { max: 200 });
  const observaciones = texto(body.observaciones ?? '', 'Las observaciones', { max: 300, requerido: false });
  const medioPago = body.medioPago ?? 'efectivo';
  if (!['efectivo', 'transferencia'].includes(medioPago)) throw badRequest('Medio de pago inválido.');

  const { horaCorte } = await obtenerConfig();
  const fechaEntrega = fechaDeEntrega(dia, horaCorte);
  const ahoraIso = new Date();
  const pedido = await db.orders.create({
    numero: await db.siguienteNumero('pedido'),
    userId: String(user._id),
    cliente: { nombre: user.nombre, email: user.email, telefono: user.telefono || '' },
    items, totalAmount: total, estado: 'confirmado',
    diaMenu: dia, fechaEntrega, direccion, observaciones, medioPago,
    pagado: false, stockDescontado: false, tomadoPor: null, repartidor: null, motivoCancelacion: '',
    historial: [{ estado: 'confirmado', fecha: ahoraIso, por: user.nombre || user.email }],
  });
  return decorar(pedido, horaCorte);
}

export async function misPedidos(userId) {
  const { horaCorte } = await obtenerConfig();
  const lista = await db.orders.list({ userId }, { sort: { createdAt: -1 } });
  return lista.map((p) => decorar(p, horaCorte));
}

export async function obtenerPedido(id, actor) {
  const p = await db.orders.get(id);
  if (!p) throw noEncontrado('Pedido no encontrado');
  const esDueno = String(p.userId) === String(actor.id);
  if (!esDueno && actor.rol === 'cliente') throw prohibido();
  return decorar(p, (await obtenerConfig()).horaCorte);
}

export async function listarPedidos({ estados, fecha, limit = 300, desc = false } = {}) {
  const filtro = {};
  if (estados?.length) filtro.estado = { $in: estados };
  if (fecha) {
    if (!esFecha(fecha)) throw badRequest('Fecha inválida (usá AAAA-MM-DD).');
    filtro.fechaEntrega = fecha;
  }
  return db.orders.list(filtro, { sort: { createdAt: desc ? -1 : 1 }, limit });
}

/** Avanza un pedido por el flujo cocina → producción → reparto, validando rol y estado de origen. */
export async function cambiarEstado(id, actor, nuevo) {
  const t = TRANSICIONES[nuevo];
  if (!t) throw badRequest('Estado inválido. Para cancelar usá la acción "cancelar".');
  if (!t.roles.includes(actor.rol)) throw prohibido(`Tu rol no puede pasar un pedido a "${nuevo}".`);
  const p = await db.orders.get(id);
  if (!p) throw noEncontrado('Pedido no encontrado');
  if (p.estado !== t.desde) {
    throw conflicto(`El pedido está "${p.estado}": no se puede pasar a "${nuevo}" (tiene que estar "${t.desde}").`);
  }
  const quien = actor.nombre || actor.email;
  const patch = {
    estado: nuevo,
    historial: [...(p.historial || []), { estado: nuevo, fecha: new Date(), por: quien }],
  };
  if (nuevo === 'en_preparacion') patch.tomadoPor = quien;
  if (nuevo === 'en_camino') patch.repartidor = quien;
  if (nuevo === 'entregado' && p.medioPago === 'efectivo') patch.pagado = true; // se cobra al entregar
  // Compare-and-set: si dos personas lo toman a la vez, solo una gana.
  const upd = await db.orders.updateOne({ _id: p._id, estado: t.desde }, patch);
  if (!upd) throw conflicto('Otro usuario acaba de cambiar este pedido. Actualizá la lista.');
  return upd;
}

export async function marcarPago(id, pagado) {
  const upd = await db.orders.update(id, { pagado: !!pagado });
  if (!upd) throw noEncontrado('Pedido no encontrado');
  return upd;
}

/**
 * Cancela un pedido.
 *  - Cliente: solo el suyo, solo si sigue "confirmado" y antes del corte de producción.
 *  - Admin: cualquiera que no esté entregado/cancelado. Si ya se descontó stock, se devuelve.
 */
export async function cancelarPedido(id, actor, motivo = '') {
  const p = await db.orders.get(id);
  if (!p) throw noEncontrado('Pedido no encontrado');
  const esAdmin = actor.rol === 'admin';
  if (!esAdmin) {
    if (String(p.userId) !== String(actor.id)) throw prohibido();
    const { horaCorte } = await obtenerConfig();
    if (p.estado !== 'confirmado' || p.stockDescontado || !antesDelCorte(p.fechaEntrega, horaCorte)) {
      throw conflicto('Este pedido ya no se puede cancelar (pasó el corte de producción o ya está en preparación).');
    }
  }
  if (['entregado', 'cancelado'].includes(p.estado)) throw conflicto(`El pedido ya está "${p.estado}".`);

  const quien = actor.nombre || actor.email;
  const upd = await db.orders.updateOne({ _id: p._id, estado: p.estado }, {
    estado: 'cancelado',
    motivoCancelacion: texto(motivo ?? '', 'El motivo', { max: 200, requerido: false }) || (esAdmin ? 'Cancelado por administración' : 'Cancelado por el cliente'),
    historial: [...(p.historial || []), { estado: 'cancelado', fecha: new Date(), por: quien }],
  });
  if (!upd) throw conflicto('El pedido cambió mientras lo cancelabas. Actualizá y reintentá.');

  if (p.stockDescontado) { // devolver al stock lo que ya se había consumido
    const { consumo, insumos } = await consumoDePedidos([p]);
    for (const [insId, cant] of consumo) {
      await reponerInsumo(insumos.get(insId), Math.round(cant * 1000) / 1000, `Cancelación pedido #${p.numero}`, quien);
    }
  }
  return upd;
}

export { ErrorHttp };
