// Pruebas de la fórmula de precios con números a mano (sin servidor ni base).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costoDeReceta, precioSugerido, margenReal, descuentoPorCantidad, calcularDescuento, cotizar, validarTramos } from '../src/services/precios.js';

test('precio sugerido = costo / (1 − margen), NO costo × 1,30', () => {
  assert.equal(precioSugerido(1000, 30), 1430);          // exacto 1428,57 → redondeo hacia arriba a $10
  assert.notEqual(precioSugerido(1000, 30), 1300);       // el error típico
  assert.equal(precioSugerido(700, 30), 1000);           // 700 / 0,70 = 1000 justo
  assert.equal(precioSugerido(0, 30), 0);
  assert.equal(precioSugerido(500, 50), 1000);           // otro margen
  assert.throws(() => precioSugerido(100, 100));
});

test('el margen real del precio sugerido siempre es ≥ al objetivo', () => {
  for (const costo of [137.5, 999, 1234.56, 3300, 4821.9, 7000]) {
    const pv = precioSugerido(costo, 30);
    assert.ok(margenReal(pv, costo) >= 30, `costo ${costo} → pv ${pv} → margen ${margenReal(pv, costo)}`);
    assert.ok(pv - costo / 0.7 < 10, 'y el redondeo suma menos de $10');
  }
  assert.equal(margenReal(1300, 1000), 23.08);           // lo que daría el "costo + 30 %"
  assert.equal(margenReal(1000, 700), 30);
  assert.equal(margenReal(0, 100), null);
});

test('costo de receta = Σ cantidad × costo unitario del insumo', () => {
  const insumos = new Map([
    ['a', { _id: 'a', nombre: 'Salmón', unidad: 'kg', costo_unitario: 18000 }],
    ['b', { _id: 'b', nombre: 'Morrón', unidad: 'kg', costo_unitario: 2500 }],
    ['c', { _id: 'c', nombre: 'Envase', unidad: 'u', costo_unitario: 120 }],
    ['d', { _id: 'd', nombre: 'Sin costo', unidad: 'kg', costo_unitario: 0 }],
  ]);
  const r = costoDeReceta([{ insumo: 'a', cantidad: 0.25 }, { insumo: 'b', cantidad: 0.2 }, { insumo: 'c', cantidad: 1 }], insumos);
  assert.equal(r.costo, 4500 + 500 + 120);
  assert.equal(r.sinCosto, false);
  assert.equal(r.detalle.length, 3);
  assert.equal(costoDeReceta([{ insumo: 'd', cantidad: 1 }], insumos).sinCosto, true); // avisa que falta cargar el costo
  assert.equal(costoDeReceta([{ insumo: 'zzz', cantidad: 1 }], insumos).costo, 0);      // insumo inexistente: se ignora
});

test('descuento por cantidad: tramos y próximo tramo', () => {
  const t = [{ desde: 10, pct: 5 }, { desde: 20, pct: 10 }];
  assert.equal(descuentoPorCantidad(9, t).pct, 0);
  assert.equal(descuentoPorCantidad(10, t).pct, 5);
  assert.equal(descuentoPorCantidad(19, t).pct, 5);
  assert.equal(descuentoPorCantidad(20, t).pct, 10);
  assert.equal(descuentoPorCantidad(500, t).pct, 10);
  assert.equal(descuentoPorCantidad(9, t).proximo.desde, 10);
  assert.equal(descuentoPorCantidad(20, t).proximo, null);
});

test('contrato y cantidad NO se suman: rige el mayor', () => {
  const t = [{ desde: 10, pct: 5 }, { desde: 20, pct: 10 }];
  assert.equal(calcularDescuento({ porciones: 5, contratoPct: 8, tramos: t }).pct, 8);    // solo contrato
  assert.equal(calcularDescuento({ porciones: 20, contratoPct: 8, tramos: t }).pct, 10);  // gana cantidad
  assert.equal(calcularDescuento({ porciones: 20, contratoPct: 12, tramos: t }).pct, 12); // gana contrato (NO 22)
  assert.match(calcularDescuento({ porciones: 20, contratoPct: 12, tramos: t }).motivo, /Contrato/);
  assert.equal(calcularDescuento({ porciones: 1, contratoPct: 0, tramos: t }).pct, 0);
});

test('cotización: subtotal, descuento y total en pesos enteros', () => {
  const c = cotizar([{ price: 3500, qty: 6 }, { price: 4800, qty: 4 }], { tramos: [{ desde: 10, pct: 5 }] });
  assert.equal(c.porciones, 10);
  assert.equal(c.subtotal, 21000 + 19200);
  assert.equal(c.descuentoPct, 5);
  assert.equal(c.descuentoMonto, 2010);
  assert.equal(c.total, 40200 - 2010);
  const sin = cotizar([{ price: 3500, qty: 8 }], { tramos: [{ desde: 10, pct: 5 }] });
  assert.equal(sin.descuentoMonto, 0);
  assert.deepEqual(sin.proximo, { desde: 10, pct: 5, faltan: 2 }); // "sumá 2 más y tenés 5 %"
});

test('validación de tramos', () => {
  assert.deepEqual(validarTramos([{ desde: 20, pct: 10 }, { desde: 10, pct: 5 }]), [{ desde: 10, pct: 5 }, { desde: 20, pct: 10 }]);
  assert.deepEqual(validarTramos([]), []);
  for (const mal of [[{ desde: 1, pct: 5 }], [{ desde: 10, pct: 0 }], [{ desde: 10, pct: 60 }], [{ desde: 10, pct: 5 }, { desde: 10, pct: 6 }],
    [{ desde: 10, pct: 8 }, { desde: 20, pct: 5 }], 'x', [{ desde: 'a', pct: 5 }], Array(7).fill({ desde: 10, pct: 5 })]) {
    assert.throws(() => validarTramos(mal));
  }
});
