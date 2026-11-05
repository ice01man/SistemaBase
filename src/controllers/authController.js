import bcrypt from 'bcryptjs';
import { db } from '../store/index.js';
import { firmarToken } from '../middleware/auth.js';
import { PRODUCCION } from '../config/env.js';
import { badRequest, noAutorizado } from '../utils/errores.js';
import { comparar, crearUsuario, actualizarUsuario, publico } from '../services/usuarios.js';

const HASH_FALSO = bcrypt.hashSync('no-es-una-clave', 10); // para igualar tiempos cuando el email no existe

// Además del token en el body (el front lo guarda en localStorage para la API), se deja el mismo
// JWT en una cookie httpOnly: sirve para que las páginas privadas se verifiquen en el servidor.
const setCookieSesion = (res, token) => {
  res.cookie('sb_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000, secure: PRODUCCION });
};

export const login = async (req, res) => {
  const { email, password } = req.body ?? {};
  // Tienen que ser texto: si llega un objeto ({"$ne": ""}) se rechaza (inyección NoSQL).
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw badRequest('Faltan credenciales.');
  }
  const u = await db.users.findOne({ email: email.trim().toLowerCase() });
  const ok = await comparar(password, u?.passwordHash ?? HASH_FALSO);
  if (!u || !ok || u.activo === false) throw noAutorizado('Credenciales inválidas');
  const token = firmarToken(u);
  setCookieSesion(res, token);
  res.json({ token, user: publico(u) });
};

// Alta pública: crea SIEMPRE un cliente (el rol no se puede elegir desde acá).
export const register = async (req, res) => {
  const { nombre, email, password, direccion, telefono } = req.body ?? {};
  const u = await crearUsuario({ nombre, email, password, rol: 'cliente', direccion, telefono });
  const token = firmarToken({ _id: u._id, rol: u.rol, email: u.email });
  setCookieSesion(res, token);
  res.status(201).json({ token, user: u });
};

export const logout = (_req, res) => {
  res.clearCookie('sb_token');
  res.json({ ok: true });
};

export const me = async (req, res) => {
  res.json(publico(await db.users.get(req.usuario.id)));
};

// El propio usuario edita nombre/dirección/teléfono/contraseña (nunca su rol).
export const updateMe = async (req, res) => {
  const { nombre, direccion, telefono, password } = req.body ?? {};
  res.json(await actualizarUsuario(req.usuario.id, { nombre, direccion, telefono, password }, { esAdmin: false }));
};
