// Punto único de acceso a datos. `db` se llena al iniciar (iniciarStore) con repos de
// Mongo o de memoria según PERSISTENCIA; el resto del código solo conoce `db`.
import bcrypt from 'bcryptjs';
import { MODO, HORA_CORTE_DEFECTO } from '../config/env.js';
import { conectarDB } from '../config/db.js';
import { repoMemoria, siguienteNumeroMemoria } from './memory.js';
import { repoMongo, siguienteNumeroMongo } from './mongo.js';
import { MARGEN_DEFECTO } from '../services/precios.js';
import { USUARIOS_DEMO, INSUMOS_DEMO, PRODUCTOS_DEMO } from './datos-demo.js';

export const db = {};

export async function iniciarStore() {
  if (MODO === 'mongo') {
    await conectarDB();
    const [User, Product, Order, Insumo, Mov, Config] = await Promise.all([
      import('../models/User.js'), import('../models/Product.js'), import('../models/Order.js'),
      import('../models/Insumo.js'), import('../models/MovimientoStock.js'), import('../models/Config.js'),
    ]);
    Object.assign(db, {
      users: repoMongo(User.default), products: repoMongo(Product.default), orders: repoMongo(Order.default),
      insumos: repoMongo(Insumo.default), movimientos: repoMongo(Mov.default), config: repoMongo(Config.default),
      siguienteNumero: siguienteNumeroMongo,
    });
    // Índices únicos (email, nombre de insumo...) antes de recibir tráfico.
    await Promise.all([User.default, Insumo.default, Config.default].map((m) => m.init()));
  } else {
    Object.assign(db, {
      users: repoMemoria({ unique: ['email'] }),
      products: repoMemoria({ defaults: { activo: true, tags: [], receta: [], ingredients: [], destacado: null, rating: { promedio: 0, cantidad: 0 } } }),
      orders: repoMemoria(),
      insumos: repoMemoria({ unique: ['nombre'], defaults: { activo: true } }),
      movimientos: repoMemoria(),
      config: repoMemoria({ unique: ['clave'] }),
      siguienteNumero: siguienteNumeroMemoria,
    });
    await cargarDemo();
    console.log('⚠️  Modo MEMORIA: datos de prueba en RAM, se pierden al reiniciar.');
    console.log('   Usuarios demo: ' + USUARIOS_DEMO.map((u) => `${u.email} / ${u.password}`).join('  |  '));
  }
}

/** Carga usuarios, insumos y platos de demostración (solo si las colecciones están vacías). */
export async function cargarDemo() {
  // Crea cada usuario demo que FALTE (por email). Los que ya existen no se tocan.
  for (const u of USUARIOS_DEMO) {
    if (await db.users.findOne({ email: u.email })) continue;
    const { password, ...resto } = u;
    await db.users.create({ direccion: '', telefono: '', activo: true, ...resto, passwordHash: await bcrypt.hash(password, 10) });
  }
  const porNombre = new Map();
  if (!(await db.insumos.count())) {
    for (const [nombre, unidad, stock_actual, stock_minimo, costo_unitario, categoria] of INSUMOS_DEMO) {
      await db.insumos.create({ nombre, unidad, stock_actual, stock_minimo, costo_unitario, categoria: categoria || 'Otros', activo: true });
    }
  }
  for (const i of await db.insumos.list()) porNombre.set(i.nombre, i._id);
  if (!(await db.products.count())) {
    for (const { receta = [], ...p } of PRODUCTOS_DEMO) {
      await db.products.create({
        ...p, activo: true,
        receta: receta.filter(([n]) => porNombre.has(n)).map(([n, cantidad]) => ({ insumo: porNombre.get(n), cantidad })),
      });
    }
  }
  if (!(await db.config.count())) await db.config.create({ clave: 'sitio', tema: 'violeta', horaCorte: HORA_CORTE_DEFECTO, soloPedidoDelDia: true, ultimoCorte: '' });
}

export async function obtenerConfig() {
  let cfg = await db.config.findOne({ clave: 'sitio' });
  if (!cfg) cfg = await db.config.create({ clave: 'sitio', tema: 'violeta', horaCorte: HORA_CORTE_DEFECTO, soloPedidoDelDia: true, ultimoCorte: '' });
  if (typeof cfg.horaCorte !== 'number') cfg.horaCorte = HORA_CORTE_DEFECTO;
  if (typeof cfg.soloPedidoDelDia !== 'boolean') cfg.soloPedidoDelDia = true;
  if (typeof cfg.margenObjetivo !== 'number') cfg.margenObjetivo = MARGEN_DEFECTO;
  if (typeof cfg.umbralStockPct !== 'number') cfg.umbralStockPct = 25;
  if (!Array.isArray(cfg.zonas)) cfg.zonas = [];
  return cfg;
}
