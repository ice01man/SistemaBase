import { db, obtenerConfig } from '../store/index.js';
import { ahora, esFecha, sumarDias } from '../utils/fecha.js';
import { badRequest } from '../utils/errores.js';
import { alertasDeStock } from './stock.js';

/** Resumen para el tablero del admin. Rango por fecha de entrega (por defecto, últimos 30 días). */
export async function resumen({ desde, hasta } = {}) {
  const hoy = ahora().fecha;
  hasta = hasta || sumarDias(hoy, 14);
  desde = desde || sumarDias(hoy, -30);
  if (!esFecha(desde) || !esFecha(hasta)) throw badRequest('Fechas inválidas (usá AAAA-MM-DD).');

  const pedidos = await db.orders.list({ fechaEntrega: { $gte: desde, $lte: hasta } });
  const validos = pedidos.filter((p) => p.estado !== 'cancelado');

  const porEstado = {};
  for (const p of pedidos) porEstado[p.estado] = (porEstado[p.estado] || 0) + 1;

  const ventas = validos.reduce((a, p) => a + p.totalAmount, 0);
  const cobrado = validos.filter((p) => p.pagado).reduce((a, p) => a + p.totalAmount, 0);

  // Margen real = (ventas − costo) / ventas, ya con los descuentos aplicados. Solo cuenta pedidos con costo registrado
  // (los anteriores a esta función no lo tienen y falsearían el porcentaje).
  const conCosto = validos.filter((p) => p.costoTotal > 0);
  const ventasConCosto = conCosto.reduce((a, p) => a + p.totalAmount, 0);
  const costo = Math.round(conCosto.reduce((a, p) => a + p.costoTotal, 0));
  const descuentos = validos.reduce((a, p) => a + (p.descuentoMonto || 0), 0);

  const platos = new Map();
  for (const p of validos) for (const it of p.items) {
    const f = platos.get(it.name) || { name: it.name, qty: 0, monto: 0 };
    f.qty += it.qty; f.monto += it.qty * it.price;
    platos.set(it.name, f);
  }

  const porFecha = new Map();
  for (const p of validos) {
    const f = porFecha.get(p.fechaEntrega) || { fecha: p.fechaEntrega, pedidos: 0, monto: 0 };
    f.pedidos += 1; f.monto += p.totalAmount;
    porFecha.set(p.fechaEntrega, f);
  }

  // Zonas: clientes sin zona y pedidos abiertos sin zona (el admin tiene que asignarlas para que lleguen al repartidor correcto).
  const { zonas } = await obtenerConfig();
  const clientesSinZona = (await db.users.list({ rol: 'cliente' })).filter((u) => u.activo !== false && !u.zona).length;
  const pedidosSinZona = (await db.orders.list({ estado: { $in: ['confirmado', 'en_preparacion', 'producido', 'en_camino'] } })).filter((p) => !p.zona).length;

  return {
    desde, hasta, hoy,
    zonasConfiguradas: zonas.length > 0, clientesSinZona, pedidosSinZona,
    pedidos: pedidos.length,
    pedidosValidos: validos.length,
    ventas, cobrado, porCobrar: ventas - cobrado,
    ticketPromedio: validos.length ? Math.round(ventas / validos.length) : 0,
    costo, descuentos, ganancia: ventasConCosto - costo,
    margenReal: ventasConCosto > 0 ? Math.round(((ventasConCosto - costo) / ventasConCosto) * 1000) / 10 : null,
    porEstado,
    topPlatos: [...platos.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
    porFecha: [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    alertasStock: (await alertasDeStock()).length,
  };
}
