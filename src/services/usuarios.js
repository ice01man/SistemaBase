import bcrypt from 'bcryptjs';
import { db } from '../store/index.js';
import { ROLES } from '../models/User.js';
import { TIPOS_CLIENTE } from './precios.js';
import { normalizarZona, normalizarZonasReparto, sincronizarPedidosAbiertos } from './zonas.js';
import { badRequest, conflicto, esEmail, noEncontrado, texto } from '../utils/errores.js';

export const hashear = (password) => bcrypt.hash(password, 10);
export const comparar = (password, hash) => bcrypt.compare(password, hash);

/** Lo que se le puede mostrar al front: nunca el hash. */
export function publico(u) {
  if (!u) return null;
  const { passwordHash, ...resto } = u;
  return { ...resto, zona: u.zona || '', zonasReparto: u.zonasReparto || [], id: u._id, name: u.nombre, role: u.rol };
}

export function validarPassword(p) {
  if (typeof p !== 'string' || p.length < 8) throw badRequest('La contraseña debe tener al menos 8 caracteres.');
  if (p.length > 100) throw badRequest('La contraseña es demasiado larga.');
}

export async function crearUsuario({ nombre, email, password, rol = 'cliente', direccion = '', telefono = '', empresa = '', tipoCliente = 'final', zona = '', zonasReparto = [] }, { esAdmin = false } = {}) {
  nombre = texto(nombre, 'El nombre', { max: 80 });
  if (!esEmail(email)) throw badRequest('Email inválido.');
  email = email.trim().toLowerCase();
  validarPassword(password);
  if (!ROLES.includes(rol)) throw badRequest('Rol inválido.');
  direccion = texto(direccion, 'La dirección', { max: 200, requerido: false });
  telefono = texto(telefono, 'El teléfono', { max: 30, requerido: false });
  // Un cliente necesita un celular de contacto (coordinar la entrega, pedir el comprobante por WhatsApp).
  if (rol === 'cliente' && telefono.replace(/\D/g, '').length < 8) throw badRequest('El celular es obligatorio (con código de área, mínimo 8 dígitos).');
  // empresa y tipo de cliente (lista de precios) los fija SOLO un admin (el registro público los ignora).
  const extra = { empresa: '', tipoCliente: 'final', zona: '', zonasReparto: [] };
  if (esAdmin) {
    extra.empresa = texto(empresa, 'La empresa', { max: 80, requerido: false });
    if (!TIPOS_CLIENTE.includes(tipoCliente)) throw badRequest('Tipo de cliente inválido (final, empresa o descuento).');
    extra.tipoCliente = tipoCliente;
    extra.zona = await normalizarZona(zona);
    extra.zonasReparto = await normalizarZonasReparto(zonasReparto);
  }
  try {
    const u = await db.users.create({ nombre, email, passwordHash: await hashear(password), rol, direccion, telefono, activo: true, ...extra });
    return publico(u);
  } catch (e) {
    if (e.code === 11000) throw conflicto('Ya existe una cuenta con ese email.');
    throw e;
  }
}

export async function actualizarUsuario(id, datos, { esAdmin = false, actorId = null } = {}) {
  const actual = await db.users.get(id);
  if (!actual) throw noEncontrado('Usuario no encontrado');
  const patch = {};
  if (datos.nombre !== undefined) patch.nombre = texto(datos.nombre, 'El nombre', { max: 80 });
  if (datos.direccion !== undefined) patch.direccion = texto(datos.direccion, 'La dirección', { max: 200, requerido: false });
  if (datos.telefono !== undefined) patch.telefono = texto(datos.telefono, 'El teléfono', { max: 30, requerido: false });
  if (datos.password) { validarPassword(datos.password); patch.passwordHash = await hashear(datos.password); }
  if (esAdmin) {
    if (datos.email !== undefined) {
      if (!esEmail(datos.email)) throw badRequest('Email inválido.');
      patch.email = datos.email.trim().toLowerCase();
    }
    if (datos.rol !== undefined) {
      if (!ROLES.includes(datos.rol)) throw badRequest('Rol inválido.');
      if (String(actorId) === String(id) && datos.rol !== actual.rol) throw badRequest('No podés cambiar tu propio rol.');
      patch.rol = datos.rol;
    }
    if (datos.empresa !== undefined) patch.empresa = texto(datos.empresa, 'La empresa', { max: 80, requerido: false });
    if (datos.tipoCliente !== undefined) {
      if (!TIPOS_CLIENTE.includes(datos.tipoCliente)) throw badRequest('Tipo de cliente inválido (final, empresa o descuento).');
      patch.tipoCliente = datos.tipoCliente;
    }
    if (datos.zona !== undefined) patch.zona = await normalizarZona(datos.zona);
    if (datos.zonasReparto !== undefined) patch.zonasReparto = await normalizarZonasReparto(datos.zonasReparto);
    if (datos.activo !== undefined) {
      if (String(actorId) === String(id) && datos.activo === false) throw badRequest('No podés desactivarte a vos mismo.');
      patch.activo = !!datos.activo;
    }
  }
  try {
    const u = await db.users.update(id, patch);
    // Si cambió la zona del cliente, sus pedidos que todavía no salieron pasan a la zona nueva.
    if (patch.zona !== undefined && patch.zona !== (actual.zona || '')) await sincronizarPedidosAbiertos(id, patch.zona);
    return publico(u);
  } catch (e) {
    if (e.code === 11000) throw conflicto('Ya existe una cuenta con ese email.');
    throw e;
  }
}

export async function borrarUsuario(id, actorId) {
  if (String(actorId) === String(id)) throw badRequest('No podés borrarte a vos mismo.');
  const u = await db.users.get(id);
  if (!u) throw noEncontrado('Usuario no encontrado');
  if (u.rol === 'admin' && (await db.users.count({ rol: 'admin', activo: true })) <= 1) {
    throw badRequest('Tiene que quedar al menos un administrador activo.');
  }
  // Si ya hizo pedidos, se desactiva en vez de borrar (el historial no queda huérfano).
  if (await db.orders.count({ userId: id })) {
    await db.users.update(id, { activo: false });
    return { message: 'El usuario tiene pedidos: se desactivó en lugar de borrarse.', desactivado: true };
  }
  await db.users.remove(id);
  return { message: 'Usuario eliminado' };
}
