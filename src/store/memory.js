// Repositorio EN MEMORIA (modo demo/tests). Expone la misma API que store/mongo.js,
// así los servicios y controllers se escriben una sola vez para los dos modos.
import crypto from 'node:crypto';

const nuevoId = () => crypto.randomBytes(12).toString('hex'); // mismo formato que un ObjectId
const OPS = ['$in', '$nin', '$ne', '$gt', '$gte', '$lt', '$lte'];

function esOperadores(v) {
  return v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) &&
    Object.keys(v).length > 0 && Object.keys(v).every((k) => OPS.includes(k));
}
const igual = (a, b) => a === b || (a != null && b != null && String(a) === String(b));

function coincide(doc, filtro) {
  return Object.entries(filtro).every(([campo, cond]) => {
    const val = doc[campo];
    if (!esOperadores(cond)) return igual(val, cond);
    return Object.entries(cond).every(([op, ref]) => {
      switch (op) {
        case '$in': return ref.some((r) => igual(val, r));
        case '$nin': return !ref.some((r) => igual(val, r));
        case '$ne': return !igual(val, ref);
        case '$gt': return val > ref;
        case '$gte': return val >= ref;
        case '$lt': return val < ref;
        case '$lte': return val <= ref;
        default: return false;
      }
    });
  });
}

const copia = (d) => (d ? structuredClone(d) : null);

export function repoMemoria({ unique = [], defaults = {} } = {}) {
  let docs = [];

  const comprobarUnico = (data, propioId = null) => {
    for (const campo of unique) {
      if (data[campo] === undefined) continue;
      const choca = docs.find((d) => d._id !== propioId && String(d[campo]).toLowerCase() === String(data[campo]).toLowerCase());
      if (choca) {
        const e = new Error(`Valor duplicado en "${campo}"`);
        e.code = 11000; // mismo código que MongoDB, así los controllers lo tratan igual
        throw e;
      }
    }
  };

  return {
    async list(filtro = {}, { sort, limit } = {}) {
      let r = docs.filter((d) => coincide(d, filtro));
      if (sort) {
        const [[campo, dir]] = Object.entries(sort);
        r = [...r].sort((a, b) => (a[campo] > b[campo] ? 1 : a[campo] < b[campo] ? -1 : 0) * (dir < 0 ? -1 : 1));
      }
      if (limit) r = r.slice(0, limit);
      return r.map(copia);
    },
    async get(id) { return copia(docs.find((d) => d._id === String(id))); },
    async findOne(filtro) { return copia(docs.find((d) => coincide(d, filtro))); },
    async count(filtro = {}) { return docs.filter((d) => coincide(d, filtro)).length; },
    async create(data) {
      comprobarUnico(data);
      const ahora = new Date();
      const doc = { ...structuredClone(defaults), ...structuredClone(data), _id: nuevoId(), createdAt: ahora, updatedAt: ahora };
      docs.push(doc);
      return copia(doc);
    },
    async update(id, patch) {
      const doc = docs.find((d) => d._id === String(id));
      if (!doc) return null;
      comprobarUnico(patch, doc._id);
      Object.assign(doc, structuredClone(patch), { updatedAt: new Date() });
      return copia(doc);
    },
    /** Actualiza SOLO si el documento cumple el filtro (lo usamos como "compare-and-set"). */
    async updateOne(filtro, patch) {
      const doc = docs.find((d) => coincide(d, filtro));
      if (!doc) return null;
      Object.assign(doc, structuredClone(patch), { updatedAt: new Date() });
      return copia(doc);
    },
    async inc(id, campo, n) {
      const doc = docs.find((d) => d._id === String(id));
      if (!doc) return null;
      doc[campo] = (doc[campo] || 0) + n;
      doc.updatedAt = new Date();
      return copia(doc);
    },
    async remove(id) {
      const antes = docs.length;
      docs = docs.filter((d) => d._id !== String(id));
      return docs.length < antes;
    },
  };
}

const contadores = new Map();
export const siguienteNumeroMemoria = async (nombre) => {
  const n = (contadores.get(nombre) || 0) + 1;
  contadores.set(nombre, n);
  return n;
};
