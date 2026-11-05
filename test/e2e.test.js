// Pruebas de punta a punta. Por defecto levantan el servidor en MODO MEMORIA (no necesitan MongoDB).
//   npm test                         → servidor propio en memoria
//   BASE_URL=http://localhost:3000 npm test   → contra un servidor ya corriendo (p. ej. con MongoDB real;
//                                      necesita los usuarios demo: corré `npm run seed -- --demo` antes)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import jwt from 'jsonwebtoken';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXTERNO = process.env.BASE_URL;
// Lunes 9/11/2026 08:00 hora Argentina (antes del corte de las 10)
const RELOJ_ANTES = '2026-11-09T08:00:00-03:00';
const RELOJ_DESPUES = '2026-11-09T11:00:00-03:00';

let procs = [];
async function levantar(puerto, extraEnv = {}) {
  const p = spawn('node', ['app.js'], {
    cwd: RAIZ,
    env: { ...process.env, PERSISTENCIA: 'memoria', PORT: String(puerto), ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  procs.push(p);
  await new Promise((ok, mal) => {
    const t = setTimeout(() => mal(new Error('El servidor no arrancó')), 15000);
    p.stdout.on('data', (d) => { if (String(d).includes('escuchando')) { clearTimeout(t); ok(); } });
    p.on('exit', (c) => { clearTimeout(t); mal(new Error(`El servidor salió con código ${c}`)); });
  });
  return `http://localhost:${puerto}`;
}
const termina = (env) => new Promise((ok) => {
  const p = spawn('node', ['app.js'], { cwd: RAIZ, env: { ...process.env, ...env }, stdio: 'pipe' });
  let salida = '';
  p.stderr.on('data', (d) => (salida += d));
  p.stdout.on('data', (d) => (salida += d));
  const t = setTimeout(() => { p.kill(); ok({ codigo: 'sigue vivo', salida }); }, 16000);
  p.on('exit', (codigo) => { clearTimeout(t); ok({ codigo, salida }); });
});

let BASE, BASE_TARDE;
let FECHA_LUNES = '2026-11-09'; // se corrige con la fecha real del primer pedido (sirve contra un servidor externo)
const tokens = {};
const llamar = async (base, metodo, ruta, { token, body } = {}) => {
  const r = await fetch(`${base}/api${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, data };
};
const api = (m, ruta, o) => llamar(BASE, m, ruta, o);
const loginDe = async (base, email, password) => (await llamar(base, 'POST', '/auth/login', { body: { email, password } })).data.token;

before(async () => {
  BASE = EXTERNO || (await levantar(3201, { BRIE_FAKE_NOW: RELOJ_ANTES }));
  if (!EXTERNO) BASE_TARDE = await levantar(3202, { BRIE_FAKE_NOW: RELOJ_DESPUES });
  tokens.admin = await loginDe(BASE, 'admin@demo.com', 'admin123');
  tokens.produccion = await loginDe(BASE, 'produccion@demo.com', 'produccion123');
  tokens.reparto = await loginDe(BASE, 'reparto@demo.com', 'reparto123');
  tokens.user = await loginDe(BASE, 'user@demo.com', 'user123');
  tokens.cliente = await loginDe(BASE, 'cliente@demo.com', 'cliente123');
});
after(() => procs.forEach((p) => p.kill()));

const producto = async (dia, nombre) => (await api('GET', `/products/by-day?day=${dia}`)).data.find((p) => p.name === nombre);

// ───────────────────────── SEGURIDAD ─────────────────────────
test('sin token no se entra a nada privado (antes: modo memoria = admin)', async () => {
  for (const [m, r] of [['GET', '/orders/cocina'], ['GET', '/orders/reparto'], ['GET', '/orders'], ['GET', '/users'],
    ['GET', '/insumos'], ['GET', '/products/admin'], ['POST', '/produccion/corte'], ['GET', '/produccion/reportes'], ['POST', '/orders']]) {
    const x = await api(m, r);
    assert.equal(x.status, 401, `${m} ${r} debería ser 401 y fue ${x.status}`);
  }
});

test('token basura o firmado con el secreto viejo "dev_secret" se rechaza', async () => {
  assert.equal((await api('GET', '/users', { token: 'basura' })).status, 401);
  const forjado = jwt.sign({ id: '1', rol: 'admin', email: 'x@x.com' }, 'dev_secret');
  assert.equal((await api('GET', '/users', { token: forjado })).status, 401);
  const sinFirma = jwt.sign({ id: '1', rol: 'admin' }, '', { algorithm: 'none' });
  assert.equal((await api('GET', '/users', { token: sinFirma })).status, 401);
});

test('login no acepta objetos (inyección NoSQL) ni credenciales vacías', async () => {
  const a = await api('POST', '/auth/login', { body: { email: { $ne: '' }, password: { $ne: '' } } });
  assert.equal(a.status, 400);
  const b = await api('POST', '/auth/login', { body: { email: 'admin@demo.com', password: 'mala' } });
  assert.equal(b.status, 401);
});

test('roles: cada uno entra solo a lo suyo', async () => {
  assert.equal((await api('GET', '/users', { token: tokens.cliente })).status, 403);
  assert.equal((await api('GET', '/users', { token: tokens.produccion })).status, 403);
  assert.equal((await api('GET', '/orders/cocina', { token: tokens.cliente })).status, 403);
  assert.equal((await api('GET', '/orders/cocina', { token: tokens.reparto })).status, 403);
  assert.equal((await api('GET', '/orders/reparto', { token: tokens.produccion })).status, 403);
  assert.equal((await api('GET', '/insumos', { token: tokens.reparto })).status, 403);
  assert.equal((await api('POST', '/orders', { token: tokens.produccion, body: {} })).status, 403);
  assert.equal((await api('GET', '/orders/cocina', { token: tokens.produccion })).status, 200);
  assert.equal((await api('GET', '/orders/reparto', { token: tokens.reparto })).status, 200);
});

test('páginas privadas redirigen a login sin sesión y /admin.html público ya no existe', async () => {
  for (const ruta of ['/admin', '/cocina', '/reparto', '/admin/js/productos.js']) {
    const r = await fetch(`${BASE}${ruta}`, { redirect: 'manual' });
    assert.equal(r.status, 302, `${ruta} debería redirigir`);
    assert.match(r.headers.get('location'), /login/);
  }
  assert.equal((await fetch(`${BASE}/admin.html`)).status, 404);
  assert.equal((await fetch(`${BASE}/panel.html`)).status, 404);
});

test('el servidor NO arranca inseguro: sin Mongo, con secreto débil, o memoria en producción', { skip: !!EXTERNO }, async () => {
  const sinUri = await termina({ PERSISTENCIA: 'mongo', MONGODB_URI: '', JWT_SECRET: 'x'.repeat(40), PORT: '3290' });
  assert.notEqual(sinUri.codigo, 'sigue vivo');
  assert.notEqual(sinUri.codigo, 0);
  const debil = await termina({ PERSISTENCIA: 'mongo', MONGODB_URI: 'mongodb://127.0.0.1:1/x', JWT_SECRET: 'dev_secret', PORT: '3291' });
  assert.notEqual(debil.codigo, 'sigue vivo');
  assert.match(debil.salida, /JWT_SECRET/);
  const caido = await termina({ PERSISTENCIA: 'mongo', MONGODB_URI: 'mongodb://127.0.0.1:1/x', JWT_SECRET: 'y'.repeat(40), PORT: '3292' });
  assert.notEqual(caido.codigo, 'sigue vivo'); // Mongo caído → el proceso termina, no queda abierto
  const prod = await termina({ PERSISTENCIA: 'memoria', NODE_ENV: 'production', PORT: '3293' });
  assert.notEqual(prod.codigo, 'sigue vivo');
  assert.match(prod.salida, /production/);
});

// ───────────────────────── MENÚ Y CARRITO ─────────────────────────
test('menú público: lista platos activos y NO expone la receta', async () => {
  const r = await api('GET', '/products');
  assert.equal(r.status, 200);
  assert.ok(r.data.length >= 10);
  assert.ok(r.data.every((p) => !('receta' in p)));
  const lunes = await api('GET', '/products/by-day?day=lunes');
  assert.ok(lunes.data.every((p) => p.day === 'lunes'));
});

test('el precio y el total los calcula el servidor (se ignora lo que mande el navegador)', async () => {
  const lomo = await producto('lunes', 'Lomo con Papas Rústicas');
  const r = await api('POST', '/orders', { token: tokens.cliente, body: {
    dia: 'lunes', totalAmount: 1, items: [{ productId: lomo._id, qty: 2, price: 1, name: 'GRATIS' }],
  } });
  assert.equal(r.status, 201);
  assert.equal(r.data.totalAmount, lomo.price * 2);
  assert.equal(r.data.items[0].price, lomo.price);
  assert.equal(r.data.items[0].name, 'Lomo con Papas Rústicas');
  FECHA_LUNES = r.data.fechaEntrega;
  if (!EXTERNO) assert.equal(r.data.fechaEntrega, '2026-11-09'); // lunes, antes del corte → hoy
  assert.equal(r.data.estado, 'confirmado');
  const r2 = await api('POST', '/orders', { token: tokens.cliente, body: { dia: 'lunes', items: [{ productId: lomo._id, qty: 1 }] } });
  assert.equal(r2.data.numero, r.data.numero + 1); // número correlativo
});

test('carrito inválido se rechaza: vacío, cantidades raras, plato de otro día o inexistente', async () => {
  const lomo = await producto('lunes', 'Lomo con Papas Rústicas');
  const risotto = await producto('martes', 'Risotto de Hongos');
  const malos = [
    { dia: 'lunes', items: [] },
    { dia: 'lunes', items: [{ productId: lomo._id, qty: 0 }] },
    { dia: 'lunes', items: [{ productId: lomo._id, qty: -3 }] },
    { dia: 'lunes', items: [{ productId: lomo._id, qty: 1.5 }] },
    { dia: 'lunes', items: [{ productId: lomo._id, qty: 999 }] },
    { dia: 'lunes', items: [{ productId: risotto._id, qty: 1 }] },
    { dia: 'lunes', items: [{ productId: 'noexiste', qty: 1 }] },
    { dia: 'lunes', items: [{ productId: { $ne: null }, qty: 1 }] },
    { dia: 'sabado', items: [{ productId: lomo._id, qty: 1 }] },
    { items: [{ productId: lomo._id, qty: 1 }] },
    { dia: 'lunes', items: [{ productId: lomo._id, qty: 1 }], medioPago: 'bitcoin' },
  ];
  for (const body of malos) {
    const r = await api('POST', '/orders', { token: tokens.cliente, body });
    assert.equal(r.status, 400, `debería rechazar ${JSON.stringify(body).slice(0, 80)} y devolvió ${r.status}`);
  }
});

test('después del corte, pedir para hoy pasa a la semana siguiente', { skip: !!EXTERNO }, async () => {
  const t = await loginDe(BASE_TARDE, 'cliente@demo.com', 'cliente123');
  const prods = (await llamar(BASE_TARDE, 'GET', '/products/by-day?day=lunes')).data;
  const r = await llamar(BASE_TARDE, 'POST', '/orders', { token: t, body: { dia: 'lunes', items: [{ productId: prods[0]._id, qty: 1 }] } });
  assert.equal(r.status, 201);
  assert.equal(r.data.fechaEntrega, '2026-11-16');
  const f = await llamar(BASE_TARDE, 'GET', '/orders/fechas');
  assert.equal(f.data.entregas.lunes, '2026-11-16');
  assert.equal(f.data.entregas.martes, '2026-11-10');
});

// ───────────────────────── SEGUIMIENTO, COCINA Y REPARTO ─────────────────────────
test('flujo completo: confirmado → cocina → producido → reparto → entregado', async () => {
  const mil = await producto('lunes', 'Milanesa con Puré');
  const ped = (await api('POST', '/orders', { token: tokens.cliente, body: { dia: 'lunes', items: [{ productId: mil._id, qty: 1 }], medioPago: 'efectivo' } })).data;
  const id = ped._id;
  const estado = (token, e) => api('PATCH', `/orders/${id}/estado`, { token, body: { estado: e } });

  assert.equal((await estado(tokens.cliente, 'en_preparacion')).status, 403);   // el cliente no puede
  assert.equal((await estado(tokens.reparto, 'en_preparacion')).status, 403);   // reparto no cocina
  assert.equal((await estado(tokens.produccion, 'producido')).status, 409);     // no se saltan pasos
  assert.equal((await estado(tokens.produccion, 'entregado')).status, 403);     // cocina tampoco entrega
  assert.equal((await estado(tokens.produccion, 'inventado')).status, 400);

  const a = await estado(tokens.produccion, 'en_preparacion');
  assert.equal(a.status, 200);
  assert.equal(a.data.tomadoPor, 'Cocina Demo');
  assert.equal((await estado(tokens.produccion, 'en_preparacion')).status, 409); // ya está tomado (dos cocineros)
  assert.equal((await estado(tokens.reparto, 'en_camino')).status, 409);        // todavía no está listo
  assert.equal((await estado(tokens.produccion, 'producido')).status, 200);

  const rep = await api('GET', '/orders/reparto', { token: tokens.reparto });
  assert.ok(rep.data.some((p) => p._id === id), 'el pedido listo aparece en reparto');
  assert.equal((await estado(tokens.produccion, 'en_camino')).status, 403);     // cocina no reparte
  const camino = await estado(tokens.reparto, 'en_camino');
  assert.equal(camino.data.repartidor, 'Reparto Demo');
  const fin = await estado(tokens.reparto, 'entregado');
  assert.equal(fin.data.estado, 'entregado');
  assert.equal(fin.data.pagado, true); // efectivo: se cobra al entregar
  assert.deepEqual(fin.data.historial.map((h) => h.estado), ['confirmado', 'en_preparacion', 'producido', 'en_camino', 'entregado']);

  // el cliente ve el seguimiento
  const mis = await api('GET', '/orders/mis-pedidos', { token: tokens.cliente });
  assert.equal(mis.data.find((p) => p._id === id).estado, 'entregado');
  assert.equal((await api('GET', `/orders/${id}`, { token: tokens.cliente })).status, 200);
});

test('un cliente no ve ni cancela pedidos de otro cliente', async () => {
  const otro = await api('POST', '/auth/register', { body: { nombre: 'Otra Persona', email: 'otra@test.com', password: 'clave1234', direccion: 'Calle 1' } });
  assert.equal(otro.status, 201);
  assert.equal(otro.data.user.rol, 'cliente');
  const lomo = await producto('lunes', 'Lomo con Papas Rústicas');
  const mio = (await api('POST', '/orders', { token: tokens.cliente, body: { dia: 'lunes', items: [{ productId: lomo._id, qty: 1 }] } })).data;
  assert.equal((await api('GET', `/orders/${mio._id}`, { token: otro.data.token })).status, 403);
  assert.equal((await api('POST', `/orders/${mio._id}/cancelar`, { token: otro.data.token })).status, 403);
  assert.equal((await api('GET', '/orders/mis-pedidos', { token: otro.data.token })).data.length, 0);
});

test('el registro público no permite elegir rol ni contraseñas cortas', async () => {
  const r = await api('POST', '/auth/register', { body: { nombre: 'Hacker', email: 'h@test.com', password: 'clave1234', rol: 'admin' } });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.rol, 'cliente');
  assert.equal((await api('POST', '/auth/register', { body: { nombre: 'X', email: 'h2@test.com', password: '123' } })).status, 400);
  assert.equal((await api('POST', '/auth/register', { body: { nombre: 'X', email: 'h@test.com', password: 'clave1234' } })).status, 409);
});

// ───────────────────────── CORTE DE PRODUCCIÓN Y STOCK ─────────────────────────
test('corte P3: descuenta insumos según receta, una sola vez, y cancelar devuelve stock', async () => {
  const insumo = async (nombre) => (await api('GET', '/insumos', { token: tokens.admin })).data.find((i) => i.nombre === nombre);
  const antesLomo = (await insumo('Lomo')).stock_actual;
  const antesEnv = (await insumo('Envases')).stock_actual;

  const lista = await api('GET', `/produccion/lista?fecha=${FECHA_LUNES}`, { token: tokens.produccion });
  assert.equal(lista.status, 200);
  assert.ok(lista.data.pedidos >= 4);
  const lomoPlato = lista.data.platos.find((p) => p.name === 'Lomo con Papas Rústicas');
  assert.ok(lomoPlato.qty >= 3);
  const lomoInsumo = lista.data.insumos.find((i) => i.nombre === 'Lomo');
  assert.ok(lomoInsumo.a_descontar > 0);
  assert.equal(lista.data.corteEjecutado, false);

  assert.equal((await api('POST', '/produccion/corte', { token: tokens.reparto, body: { fecha: FECHA_LUNES } })).status, 403);
  const corte = await api('POST', '/produccion/corte', { token: tokens.produccion, body: { fecha: FECHA_LUNES } });
  assert.equal(corte.status, 200);
  assert.ok(corte.data.pedidosProcesados >= 4);
  const consumoLomo = corte.data.consumos.find((c) => c.nombre === 'Lomo').consumido;
  assert.ok(Math.abs(consumoLomo - lomoPlato.qty * 0.22) < 0.01, `consumo de lomo ${consumoLomo} vs esperado ${lomoPlato.qty * 0.22}`);
  const despuesLomo = (await insumo('Lomo')).stock_actual;
  assert.ok(Math.abs(antesLomo - despuesLomo - consumoLomo) < 0.01);
  assert.ok((await insumo('Envases')).stock_actual < antesEnv);

  const segundo = await api('POST', '/produccion/corte', { token: tokens.admin, body: { fecha: FECHA_LUNES } });
  assert.equal(segundo.data.pedidosProcesados, 0, 'repetir el corte no descuenta doble');
  assert.equal(Math.round(((await insumo('Lomo')).stock_actual - despuesLomo) * 1000), 0);

  // cancelar (admin) un pedido ya descontado devuelve el stock
  const lomo = await producto('lunes', 'Lomo con Papas Rústicas');
  const nuevo = (await api('POST', '/orders', { token: tokens.cliente, body: { dia: 'lunes', items: [{ productId: lomo._id, qty: 4 }] } })).data;
  await api('POST', '/produccion/corte', { token: tokens.admin, body: { fecha: FECHA_LUNES } });
  const trasCorte = (await insumo('Lomo')).stock_actual;
  assert.ok(Math.abs(despuesLomo - trasCorte - 4 * 0.22) < 0.01);
  const canc = await api('POST', `/orders/${nuevo._id}/cancelar`, { token: tokens.admin, body: { motivo: 'prueba' } });
  assert.equal(canc.data.estado, 'cancelado');
  assert.ok(Math.abs((await insumo('Lomo')).stock_actual - despuesLomo) < 0.01, 'el stock volvió');
});

test('cliente: cancela antes del corte; después de que cocina lo toma ya no', async () => {
  const lomo = await producto('martes', 'Risotto de Hongos');
  const ped = (await api('POST', '/orders', { token: tokens.cliente, body: { dia: 'martes', items: [{ productId: lomo._id, qty: 1 }] } })).data;
  assert.equal(ped.puedeCancelar, true);
  const ok = await api('POST', `/orders/${ped._id}/cancelar`, { token: tokens.cliente });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.estado, 'cancelado');
  assert.equal((await api('POST', `/orders/${ped._id}/cancelar`, { token: tokens.cliente })).status, 409);

  const ped2 = (await api('POST', '/orders', { token: tokens.cliente, body: { dia: 'martes', items: [{ productId: lomo._id, qty: 1 }] } })).data;
  await api('PATCH', `/orders/${ped2._id}/estado`, { token: tokens.produccion, body: { estado: 'en_preparacion' } });
  assert.equal((await api('POST', `/orders/${ped2._id}/cancelar`, { token: tokens.cliente })).status, 409);
});

test('pasada la hora de corte, el cliente ya no puede cancelar un pedido de hoy (el admin sí)', { skip: !!EXTERNO }, async () => {
  const lomo = await producto('lunes', 'Lomo con Papas Rústicas');
  const p = (await api('POST', '/orders', { token: tokens.cliente, body: { dia: 'lunes', items: [{ productId: lomo._id, qty: 1 }] } })).data;
  assert.equal(p.fechaEntrega, '2026-11-09');
  assert.equal(p.puedeCancelar, true);
  await api('PATCH', '/config', { token: tokens.admin, body: { horaCorte: 0 } }); // "ya pasó el corte"
  try {
    assert.equal((await api('POST', `/orders/${p._id}/cancelar`, { token: tokens.cliente })).status, 409);
    const mis = (await api('GET', '/orders/mis-pedidos', { token: tokens.cliente })).data.find((x) => x._id === p._id);
    assert.equal(mis.puedeCancelar, false);
  } finally {
    await api('PATCH', '/config', { token: tokens.admin, body: { horaCorte: 10 } });
  }
  assert.equal((await api('POST', `/orders/${p._id}/cancelar`, { token: tokens.admin, body: { motivo: 'limpieza' } })).status, 200);
});

// ───────────────────────── INSUMOS / STOCK ─────────────────────────
test('insumos: alta, ingreso, egreso, ajuste, alertas y movimientos', async () => {
  const c = await api('POST', '/insumos', { token: tokens.admin, body: { nombre: 'Sal fina', unidad: 'kg', stock_actual: 1, stock_minimo: 5, costo_unitario: 300 } });
  assert.equal(c.status, 201);
  assert.equal(c.data.bajoMinimo, true);
  const id = c.data._id;
  assert.equal((await api('POST', '/insumos', { token: tokens.admin, body: { nombre: 'Sal fina', unidad: 'kg' } })).status, 409);
  assert.equal((await api('POST', '/insumos', { token: tokens.produccion, body: { nombre: 'Otro', unidad: 'kg' } })).status, 403);

  const ing = await api('POST', `/insumos/${id}/movimiento`, { token: tokens.produccion, body: { tipo: 'ingreso', cantidad: 10, motivo: 'compra' } });
  assert.equal(ing.data.stock_actual, 11);
  assert.equal(ing.data.bajoMinimo, false);
  assert.equal((await api('POST', `/insumos/${id}/movimiento`, { token: tokens.produccion, body: { tipo: 'egreso', cantidad: 99, motivo: 'merma' } })).status, 400);
  assert.equal((await api('POST', `/insumos/${id}/movimiento`, { token: tokens.produccion, body: { tipo: 'egreso', cantidad: -1, motivo: 'x' } })).status, 400);
  assert.equal((await api('POST', `/insumos/${id}/movimiento`, { token: tokens.produccion, body: { tipo: 'egreso', cantidad: 2 } })).status, 400); // sin motivo
  const eg = await api('POST', `/insumos/${id}/movimiento`, { token: tokens.produccion, body: { tipo: 'egreso', cantidad: 8, motivo: 'vencido' } });
  assert.equal(eg.data.stock_actual, 3);
  assert.equal(eg.data.bajoMinimo, true);
  const aj = await api('POST', `/insumos/${id}/movimiento`, { token: tokens.admin, body: { tipo: 'ajuste', cantidad: 7, motivo: 'inventario' } });
  assert.equal(aj.data.stock_actual, 7);

  const alertas = await api('GET', '/insumos/alertas', { token: tokens.produccion });
  assert.ok(Array.isArray(alertas.data));
  const movs = await api('GET', `/insumos/movimientos?insumo=${id}`, { token: tokens.admin });
  assert.deepEqual(movs.data.map((m) => m.tipo).reverse(), ['ingreso', 'ingreso', 'egreso', 'ajuste']);
  assert.equal((await api('DELETE', `/insumos/${id}`, { token: tokens.admin })).status, 200);
});

test('productos: el admin carga receta y no puede borrar un insumo que está en una receta', async () => {
  const ins = (await api('GET', '/insumos', { token: tokens.admin })).data.find((i) => i.nombre === 'Papas');
  assert.equal((await api('DELETE', `/insumos/${ins._id}`, { token: tokens.admin })).status, 409);
  const nuevo = await api('POST', '/products', { token: tokens.admin, body: {
    name: 'Plato de prueba', category: 'Gourmet', day: 'viernes', description: 'x', image: 'http://x/y.jpg', price: 1000,
    receta: [{ insumo: ins._id, cantidad: 0.5 }],
  } });
  assert.equal(nuevo.status, 201);
  assert.equal(nuevo.data.receta[0].cantidad, 0.5);
  assert.equal((await api('POST', '/products', { token: tokens.admin, body: { name: 'Malo', category: 'x', day: 'viernes', description: 'x', image: 'x', price: -5 } })).status, 400);
  assert.equal((await api('POST', '/products', { token: tokens.admin, body: { name: 'Malo', category: 'x', day: 'viernes', description: 'x', image: 'x', price: 5, receta: [{ insumo: 'nada', cantidad: 1 }] } })).status, 400);
  const off = await api('PUT', `/products/${nuevo.data._id}`, { token: tokens.admin, body: { activo: false } });
  assert.equal(off.data.activo, false);
  assert.ok(!(await api('GET', '/products/by-day?day=viernes')).data.some((p) => p._id === nuevo.data._id), 'desactivado no sale en el menú');
  assert.equal((await api('DELETE', `/products/${nuevo.data._id}`, { token: tokens.admin })).status, 200);
});

// ───────────────────────── USUARIOS ─────────────────────────
test('usuarios: admin gestiona, pero no puede borrarse ni dejar el sistema sin admin', async () => {
  const lista = await api('GET', '/users', { token: tokens.admin });
  assert.ok(lista.data.every((u) => !('passwordHash' in u) && !('password' in u)));
  const yo = lista.data.find((u) => u.email === 'admin@demo.com');
  assert.equal((await api('DELETE', `/users/${yo._id}`, { token: tokens.admin })).status, 400);
  assert.equal((await api('PUT', `/users/${yo._id}`, { token: tokens.admin, body: { rol: 'cliente' } })).status, 400);
  assert.equal((await api('PUT', `/users/${yo._id}`, { token: tokens.admin, body: { activo: false } })).status, 400);

  const nu = await api('POST', '/users', { token: tokens.admin, body: { nombre: 'Nuevo Repartidor', email: 'nuevo@demo.com', password: 'clave12345', rol: 'reparto' } });
  assert.equal(nu.status, 201);
  assert.equal(nu.data.rol, 'reparto');
  assert.equal((await api('POST', '/users', { token: tokens.admin, body: { nombre: 'Dup', email: 'nuevo@demo.com', password: 'clave12345', rol: 'reparto' } })).status, 409);
  assert.equal((await api('POST', '/users', { token: tokens.admin, body: { nombre: 'Mal', email: 'mal@demo.com', password: 'clave12345', rol: 'superadmin' } })).status, 400);

  const tk = await loginDe(BASE, 'nuevo@demo.com', 'clave12345');
  assert.equal((await api('GET', '/orders/reparto', { token: tk })).status, 200);
  // lo desactivan → el token que ya tenía deja de servir al instante
  assert.equal((await api('PUT', `/users/${nu.data._id}`, { token: tokens.admin, body: { activo: false } })).status, 200);
  assert.equal((await api('GET', '/orders/reparto', { token: tk })).status, 401);
  assert.equal((await api('POST', '/auth/login', { body: { email: 'nuevo@demo.com', password: 'clave12345' } })).status, 401);
  assert.equal((await api('DELETE', `/users/${nu.data._id}`, { token: tokens.admin })).status, 200);
});

test('perfil: el cliente edita su dirección y teléfono, pero no su rol', async () => {
  const r = await api('PATCH', '/auth/me', { token: tokens.cliente, body: { direccion: 'Nueva 123', telefono: '1100000000', rol: 'admin' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.direccion, 'Nueva 123');
  assert.equal(r.data.rol, 'cliente');
});

// ───────────────────────── CONFIG Y REPORTES ─────────────────────────
test('config: solo admin cambia tema/hora de corte, con validación', async () => {
  assert.equal((await api('PATCH', '/config', { token: tokens.cliente, body: { tema: 'bosque' } })).status, 403);
  assert.equal((await api('PATCH', '/config', { token: tokens.admin, body: { tema: 'rojo' } })).status, 400);
  assert.equal((await api('PATCH', '/config', { token: tokens.admin, body: { horaCorte: 30 } })).status, 400);
  assert.equal((await api('PATCH', '/config', { token: tokens.admin, body: { tema: 'bosque', horaCorte: 10 } })).data.tema, 'bosque');
  assert.equal((await api('GET', '/config')).data.tema, 'bosque');
});

test('reportes del admin: ventas, estados y top de platos', async () => {
  const r = await api('GET', '/produccion/reportes?desde=2000-01-01&hasta=2099-12-31', { token: tokens.admin });
  assert.equal(r.status, 200);
  assert.ok(r.data.ventas > 0);
  assert.ok(r.data.porEstado.entregado >= 1);
  assert.ok(r.data.porEstado.cancelado >= 1);
  assert.ok(r.data.topPlatos.length > 0);
  assert.equal(r.data.ventas, r.data.cobrado + r.data.porCobrar);
  assert.equal((await api('GET', '/produccion/reportes', { token: tokens.cliente })).status, 403);
  assert.equal((await api('GET', '/produccion/reportes?desde=mal', { token: tokens.admin })).status, 400);
});
