// Repositorio sobre MongoDB/Mongoose. Misma API que store/memory.js.
// Siempre devuelve objetos planos con _id y referencias como STRING.
import mongoose from 'mongoose';
import Counter from '../models/Counter.js';

const esOid = (v) => v instanceof mongoose.Types.ObjectId || v?._bsontype === 'ObjectId';

export function plano(v) {
  if (v === null || v === undefined) return v;
  if (esOid(v)) return String(v);
  if (v instanceof Date) return v;
  if (Array.isArray(v)) return v.map(plano);
  if (typeof v === 'object') {
    const o = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === '__v') continue;
      o[k] = plano(val);
    }
    return o;
  }
  return v;
}

const idValido = (id) => mongoose.isValidObjectId(id) && String(id).length === 24;

export function repoMongo(Model) {
  return {
    async list(filtro = {}, { sort, limit } = {}) {
      let q = Model.find(filtro);
      if (sort) q = q.sort(sort);
      if (limit) q = q.limit(limit);
      return (await q.lean()).map(plano);
    },
    async get(id) { return idValido(id) ? plano(await Model.findById(id).lean()) : null; },
    async findOne(filtro) { return plano(await Model.findOne(filtro).lean()); },
    async count(filtro = {}) { return Model.countDocuments(filtro); },
    async create(data) { return plano((await Model.create(data)).toObject()); },
    async update(id, patch) {
      if (!idValido(id)) return null;
      return plano(await Model.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean());
    },
    async updateOne(filtro, patch) {
      return plano(await Model.findOneAndUpdate(filtro, { $set: patch }, { new: true, runValidators: true }).lean());
    },
    async inc(id, campo, n) {
      if (!idValido(id)) return null;
      return plano(await Model.findByIdAndUpdate(id, { $inc: { [campo]: n } }, { new: true }).lean());
    },
    async remove(id) { return idValido(id) ? !!(await Model.findByIdAndDelete(id)) : false; },
  };
}

export async function siguienteNumeroMongo(nombre) {
  const c = await Counter.findByIdAndUpdate(nombre, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
}
