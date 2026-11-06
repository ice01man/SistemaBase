// Costos, margen y descuentos. Son funciones puras (sin base de datos) para poder probarlas con números.
//
//  COSTO            = Σ (cantidad de cada insumo por porción × costo unitario del insumo)
//  PRECIO SUGERIDO  = COSTO / (1 − margen)      ← margen REAL sobre el precio de venta, no costo × 1,30
//  MARGEN REAL      = (precio − costo) / precio
//
//  Ejemplo con margen 30 %: costo $1.000 → sugerido $1.428,57 (no $1.300).
//  Chequeo: (1.428,57 − 1.000) / 1.428,57 = 30 %.   Con $1.300 el margen real sería solo 23,08 %.

export const MARGEN_DEFECTO = 30;
const REDONDEO = 10; // el sugerido se redondea HACIA ARRIBA a múltiplos de $10 (así el margen nunca queda por debajo del objetivo)

const r2 = (n) => Math.round(n * 100) / 100;

/** Costo de UNA porción según su receta. `insumos` es un Map(id → insumo). */
export function costoDeReceta(receta = [], insumos) {
  let costo = 0;
  const detalle = [];
  let sinCosto = false;
  for (const r of receta) {
    const i = insumos.get(String(r.insumo));
    if (!i) continue;
    const subtotal = r.cantidad * (i.costo_unitario || 0);
    if (!i.costo_unitario) sinCosto = true; // insumo sin costo cargado: el costo del plato queda subestimado
    costo += subtotal;
    detalle.push({ insumo: String(i._id), nombre: i.nombre, unidad: i.unidad, cantidad: r.cantidad, costo_unitario: i.costo_unitario || 0, subtotal: r2(subtotal) });
  }
  return { costo: r2(costo), detalle, sinCosto };
}

/** Precio de venta para lograr un margen REAL `margenPct` sobre el precio de venta. */
export function precioSugerido(costo, margenPct = MARGEN_DEFECTO) {
  if (!(costo > 0)) return 0;
  const m = margenPct / 100;
  if (!(m >= 0 && m < 1)) throw new Error('El margen debe estar entre 0 y 99 %.');
  const exacto = costo / (1 - m);
  return Math.ceil(exacto / REDONDEO - 1e-9) * REDONDEO;
}

/** Margen real (%) que deja un precio de venta sobre su costo. null si no hay precio. */
export function margenReal(precio, costo) {
  if (!(precio > 0)) return null;
  return r2(((precio - costo) / precio) * 100);
}

// ── Tipos de cliente y lista de precios ──────────────────────────────────────────────────────
// Cada plato tiene TRES precios de venta y cada cliente pertenece a UN tipo, que decide cuál se le cobra:
//   final     → precio público
//   empresa   → precio empresa
//   descuento → precio con descuento
export const TIPOS_CLIENTE = ['final', 'empresa', 'descuento'];
export const ETIQUETA_TIPO = { final: 'Cliente final', empresa: 'Empresa', descuento: 'Con descuento' };

/** Precio que le toca a un tipo de cliente. Si el plato no tiene cargado ese precio, se usa el público. */
export function precioPara(plato, tipo = 'final') {
  const v = tipo === 'empresa' ? plato.precioEmpresa : tipo === 'descuento' ? plato.precioDescuento : plato.price;
  return v > 0 ? v : plato.price;
}

/**
 * Cotización de un carrito. items = [{ precioPublico, price (el que le toca), qty }].
 * subtotal = a precio público; total = a su precio; la diferencia es el ahorro del cliente.
 */
export function cotizar(items, tipo = 'final') {
  const porciones = items.reduce((a, i) => a + i.qty, 0);
  const subtotal = items.reduce((a, i) => a + i.precioPublico * i.qty, 0);
  const total = items.reduce((a, i) => a + i.price * i.qty, 0);
  const descuentoMonto = subtotal - total;
  return {
    porciones, subtotal, total, tipoCliente: tipo, descuentoMonto,
    descuentoPct: subtotal > 0 ? Math.round((descuentoMonto / subtotal) * 1000) / 10 : 0,
    descuentoMotivo: descuentoMonto > 0 ? `Precio ${ETIQUETA_TIPO[tipo].toLowerCase()}` : '',
  };
}

const NO_INGREDIENTE = /envase|bolsa|descartable|servilleta|cubierto|film|etiqueta/i;

/** Lo que ve el cliente como "ingredientes": los nombres de los insumos de la receta (sin envases ni descartables). */
export function ingredientesDeReceta(receta = [], insumos) {
  const out = [];
  for (const r of receta) {
    const i = insumos.get(String(r.insumo));
    if (i && !NO_INGREDIENTE.test(i.nombre) && !out.includes(i.nombre)) out.push(i.nombre);
  }
  return out;
}
