// Verifica, SIN necesitar MongoDB, que los modelos de Mongoose aceptan los documentos que arman los
// servicios (detecta errores de esquema antes de conectar a una base real) y que plano() convierte bien.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';
import Insumo from '../src/models/Insumo.js';
import User from '../src/models/User.js';
import Movimiento from '../src/models/MovimientoStock.js';
import Config from '../src/models/Config.js';
import { plano } from '../src/store/mongo.js';

const oid = () => new mongoose.Types.ObjectId().toString();

test('los modelos validan documentos con la forma que generan los servicios', () => {
  const docs = [
    new Order({
      numero: 1, userId: oid(), cliente: { nombre: 'A', email: 'a@a.com', telefono: '1' },
      items: [{ productId: oid(), name: 'Plato', price: 100, qty: 2 }], totalAmount: 200, estado: 'confirmado',
      diaMenu: 'lunes', fechaEntrega: '2026-11-09', direccion: 'Calle 1', medioPago: 'efectivo',
      historial: [{ estado: 'confirmado', fecha: new Date(), por: 'A' }],
    }),
    new Product({ name: 'P', category: 'Gourmet', day: 'lunes', description: 'd', image: 'x', price: 10, receta: [{ insumo: oid(), cantidad: 0.2 }] }),
    new Insumo({ nombre: 'Sal', unidad: 'kg', stock_actual: 1, stock_minimo: 1, costo_unitario: 1 }),
    new User({ nombre: 'U', email: 'U@x.com', passwordHash: 'hash', rol: 'reparto' }),
    new Movimiento({ insumo: oid(), nombre: 'Sal', tipo: 'consumo', cantidad: 1, stock_resultante: 0 }),
    new Config({ clave: 'sitio', tema: 'bosque', horaCorte: 10 }),
  ];
  for (const d of docs) assert.equal(d.validateSync(), undefined, `${d.constructor.modelName}: ${d.validateSync()?.message}`);
  assert.equal(new User({ email: 'x@x.com', passwordHash: 'h', rol: 'superadmin' }).validateSync()?.errors?.rol?.kind, 'enum');
  assert.ok(new Order({ userId: oid(), totalAmount: 1, estado: 'tomado' }).validateSync()?.errors?.estado); // estados viejos ya no valen
  assert.equal(new User({ email: 'X@Y.COM', passwordHash: 'h' }).email, 'x@y.com'); // lowercase
});

test('plano() deja _id y referencias como string y quita __v', () => {
  const id = new mongoose.Types.ObjectId();
  const r = plano({ _id: id, __v: 0, insumo: id, receta: [{ insumo: id, cantidad: 1 }], creado: new Date(0) });
  assert.equal(r._id, String(id));
  assert.equal(r.receta[0].insumo, String(id));
  assert.ok(!('__v' in r));
  assert.ok(r.creado instanceof Date);
});
