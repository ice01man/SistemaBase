// Error "esperado" con código HTTP. Los controllers/servicios lo lanzan y el
// manejador global de app.js lo convierte en { error } con ese status.
export class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

export const badRequest = (m) => new ErrorHttp(400, m);
export const noAutorizado = (m = 'No autenticado') => new ErrorHttp(401, m);
export const prohibido = (m = 'No tenés permisos para esta acción') => new ErrorHttp(403, m);
export const noEncontrado = (m = 'No encontrado') => new ErrorHttp(404, m);
export const conflicto = (m) => new ErrorHttp(409, m);

// ---- Validadores chicos (evitan que lleguen objetos {$ne:..} donde va un string) ----
export function texto(valor, campo, { min = 1, max = 200, requerido = true } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (requerido) throw badRequest(`Falta ${campo}.`);
    return '';
  }
  if (typeof valor !== 'string') throw badRequest(`${campo} inválido.`);
  const v = valor.trim();
  if (requerido && v.length < min) throw badRequest(`${campo} es demasiado corto.`);
  if (v.length > max) throw badRequest(`${campo} es demasiado largo (máx. ${max}).`);
  return v;
}

export function numero(valor, campo, { min = 0, max = 1e9, entero = false } = {}) {
  const n = Number(valor);
  if (valor === '' || valor === null || valor === undefined || !Number.isFinite(n)) {
    throw badRequest(`${campo} debe ser un número.`);
  }
  if (entero && !Number.isInteger(n)) throw badRequest(`${campo} debe ser un número entero.`);
  if (n < min || n > max) throw badRequest(`${campo} debe estar entre ${min} y ${max}.`);
  return n;
}

export const esEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 120;
