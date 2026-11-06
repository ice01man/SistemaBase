// Precios, margen y descuentos contra un servidor real (memoria). Reloj fijo: lunes 9/11/2026 08:00 AR.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
let srv, BASE;
const tk = {};

async function levantar(puerto) {
  srv = spawn('node', ['app.js'], { cwd: RAIZ, env: { ...process.env, PERSISTENCIA: 'memoria', PORT: String(puerto), BRIE_FAKE_NOW: '2026-11-09T08:00:00-03:00' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, mal) => {
    const t = setTimeout(() => mal(new Error('El servidor no arrancó')), 15000);
    srv.stdout.on('data', (d) => { if (String(d).includes('escuchando')) { clearTimeout(t); ok(); } });
    srv.on('exit', (c) => { clearTimeout(t); mal(new Error('salió ' + c)); });
  });
  return `http://localhost:${puerto}`;
}
const api = async (m, ruta, { token, body } = {}) => {
  const r = await fetch(`${BASE}/api${ruta}`, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, data };
};
const login = async (email, password) => (await api('POST', '/auth/login', { body: { email, password } })).data.token;

before(async () => {
  BASE = await levantar(3205);
  tk.admin = await login('admin@demo.com', 'admin123');
  tk.cliente = await login('cliente@demo.com', 'cliente123');
  tk.cocina = await login('produccion@demo.com', 'produccion123');
});
after(() => srv?.kill());

const milanesa = async () => (await api('GET', '/products/by-day?day=lunes')).data.find((p) => p.name === 'Milanesa con Puré');
const pedir = (token, id, qty, extra = {}) => api('POST', '/orders', { token, body: { dia: 'lunes', items: [{ productId: id, qty }], direccion: 'Calle 123', ...extra } });

test('el admin ve el costo de cada plato = Σ cantidad × costo del insumo, y el sugerido deja ≥ 30 % de margen real', async () => {
  const insumos = (await api('GET', '/insumos', { token: tk.admin })).data;
  const costoDe = new Map(insumos.map((i) => [String(i._id), i.costo_unitario]));
  const platos = (await api('GET', '/products/admin', { token: tk.admin })).data;
  const p = platos.find((x) => x.name === 'Milanesa con Puré');
  const esperado = Math.round(p.receta.reduce((a, r) => a + r.cantidad * costoDe.get(String(r.insumo)), 0) * 100) / 100;
  assert.ok(esperado > 0);
  assert.equal(p.costo, esperado);
  assert.equal(p.precioSugerido % 10, 0);
  assert.ok(p.precioSugerido >= esperado / 0.7, 'sugerido = costo / 0,70 (redondeado hacia arriba)');
  assert.ok(p.precioSugerido < esperado / 0.7 + 10);
  assert.ok(((p.precioSugerido - esperado) / p.precioSugerido) * 100 >= 30);
  assert.equal(p.margenReal, Math.round(((p.price - esperado) / p.price) * 10000) / 100);
});

test('el costo y el margen NO se filtran: ni al menú público ni al cliente ni a cocina', async () => {
  const pub = (await api('GET', '/products/by-day?day=lunes')).data[0];
  for (const k of ['costo', 'precioSugerido', 'margenReal', 'receta']) assert.equal(k in pub, false, `público no debe ver ${k}`);
  assert.equal((await api('GET', '/products/admin', { token: tk.cliente })).status, 403);
  assert.equal((await api('GET', '/config')).data.margenObjetivo, undefined);
  assert.equal((await api('GET', '/config/admin', { token: tk.cliente })).status, 403);
  assert.equal((await api('GET', '/config/admin', { token: tk.cocina })).status, 403);
  assert.equal((await api('GET', '/config/admin', { token: tk.admin })).data.margenObjetivo, 30);

  const p = await milanesa();
  const ped = (await pedir(tk.cliente, p._id, 1)).data;
  assert.equal(ped.costoTotal, undefined, 'el cliente no ve el costo total');
  assert.equal(ped.items[0].costo, undefined, 'ni el costo por ítem');
  assert.equal((await api('GET', '/orders/mis-pedidos', { token: tk.cliente })).data[0].costoTotal, undefined);
  const coc = (await api('GET', '/orders/cocina', { token: tk.cocina })).data;
  assert.ok(coc.length > 0);
  assert.equal(coc.some((o) => o.costoTotal !== undefined || o.items.some((i) => i.costo !== undefined)), false);
  const adm = (await api('GET', '/orders', { token: tk.admin })).data.find((o) => o.numero === ped.numero);
  assert.ok(adm.costoTotal > 0, 'el admin sí lo ve');
  assert.ok(adm.items[0].costo > 0);
});

test('descuento por cantidad: 9 → 0 %, 10 → 5 %, 20 → 10 %, y la cotización coincide con lo que se cobra', async () => {
  const p = await milanesa();
  for (const [qty, pct] of [[9, 0], [10, 5], [19, 5], [20, 10]]) {
    const cot = (await api('POST', '/orders/cotizar', { token: tk.cliente, body: { dia: 'lunes', items: [{ productId: p._id, qty }] } })).data;
    assert.equal(cot.descuentoPct, pct, `qty ${qty}`);
    assert.equal(cot.subtotal, p.price * qty);
    assert.equal(cot.total, cot.subtotal - Math.round((cot.subtotal * pct) / 100));
    const ped = (await pedir(tk.cliente, p._id, qty)).data;
    assert.equal(ped.totalAmount, cot.total, 'se cobra exactamente lo cotizado');
    assert.equal(ped.subtotal, cot.subtotal);
    assert.equal(ped.descuentoPct, pct);
    assert.equal(ped.descuentoMonto, cot.descuentoMonto);
  }
  const c = (await api('POST', '/orders/cotizar', { token: tk.cliente, body: { dia: 'lunes', items: [{ productId: p._id, qty: 7 }] } })).data;
  assert.deepEqual(c.proximo, { desde: 10, pct: 5, faltan: 3 });
  assert.match((await api('POST', '/orders', { token: tk.cliente, body: { dia: 'lunes', items: [{ productId: p._id, qty: 10 }], direccion: 'x' } })).data.descuentoMotivo, /cantidad/i);
});

test('lo que manda el navegador (total, descuento, precio) se ignora', async () => {
  const p = await milanesa();
  const r = (await api('POST', '/orders', { token: tk.cliente, body: { dia: 'lunes', direccion: 'x', totalAmount: 1, total: 1, descuentoPct: 50, descuentoMonto: 99999, subtotal: 1,
    items: [{ productId: p._id, qty: 2, price: 1, costo: 0, descuentoPct: 50 }] } })).data;
  assert.equal(r.totalAmount, p.price * 2);
  assert.equal(r.descuentoPct, 0);
  assert.equal(r.subtotal, p.price * 2);
});

test('contrato de empresa: lo fija solo el admin, aplica desde 1 porción y NO se suma al de cantidad (rige el mayor)', async () => {
  const p = await milanesa();
  const yo = (await api('GET', '/auth/me', { token: tk.cliente })).data;
  const id = yo.id || yo._id || yo.user?.id;
  // el cliente no puede asignarse descuento
  await api('PATCH', '/auth/me', { token: tk.cliente, body: { descuentoContrato: 40, empresa: 'Yo SA' } });
  assert.equal((await api('GET', '/auth/me', { token: tk.cliente })).data.descuentoContrato || 0, 0);
  // ni registrándose
  const reg = await api('POST', '/auth/register', { body: { nombre: 'Pícaro', email: 'picaro@x.com', password: 'clave12345', descuentoContrato: 50, empresa: 'X' } });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.user.descuentoContrato || 0, 0);

  // validación del admin
  for (const mal of [-1, 51, 'abc']) assert.equal((await api('PUT', `/users/${id}`, { token: tk.admin, body: { descuentoContrato: mal } })).status, 400);
  const ok = await api('PUT', `/users/${id}`, { token: tk.admin, body: { descuentoContrato: 12, empresa: 'ACME SA' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.descuentoContrato, 12);

  const uno = (await pedir(tk.cliente, p._id, 1)).data;
  assert.equal(uno.descuentoPct, 12);
  assert.match(uno.descuentoMotivo, /Contrato/);
  assert.equal(uno.totalAmount, p.price - Math.round(p.price * 0.12));
  const veinte = (await pedir(tk.cliente, p._id, 20)).data;
  assert.equal(veinte.descuentoPct, 12, 'contrato 12 % > cantidad 10 %: rige 12, NO 22');
  const dos = (await pedir(tk.cliente, p._id, 10)).data;
  assert.equal(dos.descuentoPct, 12, 'contrato 12 % > cantidad 5 %');
  await api('PUT', `/users/${id}`, { token: tk.admin, body: { descuentoContrato: 3 } });
  assert.equal((await pedir(tk.cliente, p._id, 20)).data.descuentoPct, 10, 'ahora gana la cantidad (10 % > 3 %)');
  await api('PUT', `/users/${id}`, { token: tk.admin, body: { descuentoContrato: 0 } });
});

test('config: margen objetivo y tramos con validación; el sugerido se recalcula', async () => {
  for (const mal of [0, 95, 'x', null]) assert.equal((await api('PATCH', '/config', { token: tk.admin, body: { margenObjetivo: mal } })).status, 400, `margen ${mal}`);
  for (const mal of [[{ desde: 1, pct: 5 }], [{ desde: 10, pct: 60 }], [{ desde: 10, pct: 8 }, { desde: 20, pct: 5 }], 'x']) {
    assert.equal((await api('PATCH', '/config', { token: tk.admin, body: { descuentosCantidad: mal } })).status, 400);
  }
  assert.equal((await api('PATCH', '/config', { token: tk.cliente, body: { margenObjetivo: 5 } })).status, 403);

  const antes = (await api('GET', '/products/admin', { token: tk.admin })).data.find((x) => x.name === 'Milanesa con Puré');
  assert.equal((await api('PATCH', '/config', { token: tk.admin, body: { margenObjetivo: 45 } })).data.margenObjetivo, 45);
  const despues = (await api('GET', '/products/admin', { token: tk.admin })).data.find((x) => x.name === 'Milanesa con Puré');
  assert.ok(despues.precioSugerido > antes.precioSugerido);
  assert.ok(((despues.precioSugerido - despues.costo) / despues.precioSugerido) * 100 >= 45);
  await api('PATCH', '/config', { token: tk.admin, body: { margenObjetivo: 30 } });

  // tramos propios; lista vacía = sin descuentos por cantidad
  const p = await milanesa();
  await api('PATCH', '/config', { token: tk.admin, body: { descuentosCantidad: [{ desde: 5, pct: 7 }] } });
  assert.deepEqual((await api('GET', '/config')).data.descuentosCantidad, [{ desde: 5, pct: 7 }]);
  assert.equal((await pedir(tk.cliente, p._id, 5)).data.descuentoPct, 7);
  await api('PATCH', '/config', { token: tk.admin, body: { descuentosCantidad: [] } });
  assert.equal((await pedir(tk.cliente, p._id, 30)).data.descuentoPct, 0);
  await api('PATCH', '/config', { token: tk.admin, body: { descuentosCantidad: [{ desde: 10, pct: 5 }, { desde: 20, pct: 10 }] } });
});

test('reporte: costo, descuentos y margen real sobre lo efectivamente cobrado', async () => {
  const r = (await api('GET', '/produccion/reportes?desde=2000-01-01&hasta=2099-12-31', { token: tk.admin })).data;
  assert.ok(r.costo > 0);
  assert.ok(r.descuentos > 0);
  assert.ok(r.margenReal > 0 && r.margenReal < 100);
});
