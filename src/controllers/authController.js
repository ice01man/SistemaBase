import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { getModo } from '../config/modo.js';
import * as memoria from '../config/memoria.js';

const SECRET = process.env.JWT_SECRET || 'dev_secret';

const firmarToken = (u) =>
  jwt.sign({ id: u.id || u._id, rol: u.rol, email: u.email }, SECRET, { expiresIn: '8h' });

// Además del token en el body (que el front guarda en localStorage para las llamadas a la API),
// dejamos el mismo JWT en una cookie httpOnly. Sirve para que las páginas privadas (admin, panel)
// se puedan verificar del lado del servidor ANTES de mandar el HTML, sin depender de JS del cliente.
const setCookieSesion = (res, token) => {
  res.cookie('sb_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
  });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Faltan credenciales' });

    // --- MODO LOCAL (valida contra el seed) ---
    if (getModo() !== 'mongo') {
      const u = memoria.findUserByEmail(email);
      if (!u || u.password !== password) return res.status(401).json({ error: 'Credenciales inválidas' });
      const { password: _, ...safe } = u;
      const token = firmarToken(u);
      setCookieSesion(res, token);
      return res.json({ token, user: safe });
    }

    // --- MODO MONGO ---
    const u = await User.findOne({ email });
    if (!u) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    const token = firmarToken(u);
    setCookieSesion(res, token);
    return res.json({
      token,
      user: { id: u._id, name: u.nombre, email: u.email, role: u.rol },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Alta pública: cualquiera puede crear su cuenta de cliente (a diferencia de
// POST /api/users, que crea usuarios de cualquier rol y exige estar logueado).
export const register = async (req, res) => {
  try {
    const { nombre, email, password, direccion } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Completá nombre, email y contraseña.' });
    if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

    if (getModo() !== 'mongo') {
      if (memoria.findUserByEmail(email)) return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
      const u = memoria.createUser({ nombre, email, password, rol: 'cliente', direccion });
      const token = firmarToken({ id: u.id, rol: u.rol, email: u.email });
      setCookieSesion(res, token);
      return res.status(201).json({ token, user: u });
    }

    if (await User.findOne({ email })) return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    const saved = await new User({ nombre, email, passwordHash: password, rol: 'cliente', direccion }).save();
    const token = firmarToken(saved);
    setCookieSesion(res, token);
    return res.status(201).json({
      token,
      user: { id: saved._id, name: saved.nombre, email: saved.email, role: saved.rol },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Limpia la cookie de sesión (el localStorage lo borra el propio front).
export const logout = (_req, res) => {
  res.clearCookie('sb_token');
  res.json({ ok: true });
};