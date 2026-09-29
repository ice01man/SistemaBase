import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { getModo } from '../config/modo.js';
import * as memoria from '../config/memoria.js';

const SECRET = process.env.JWT_SECRET || 'dev_secret';

const firmarToken = (u) =>
  jwt.sign({ id: u.id || u._id, rol: u.rol, email: u.email }, SECRET, { expiresIn: '8h' });

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Faltan credenciales' });

    // --- MODO LOCAL (valida contra el seed) ---
    if (getModo() !== 'mongo') {
      const u = memoria.findUserByEmail(email);
      if (!u || u.password !== password) return res.status(401).json({ error: 'Credenciales inválidas' });
      const { password: _, ...safe } = u;
      return res.json({ token: firmarToken(u), user: safe });
    }

    // --- MODO MONGO ---
    const u = await User.findOne({ email });
    if (!u) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    return res.json({
      token: firmarToken(u),
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
      return res.status(201).json({ token: firmarToken({ id: u.id, rol: u.rol, email: u.email }), user: u });
    }

    if (await User.findOne({ email })) return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    const saved = await new User({ nombre, email, passwordHash: password, rol: 'cliente', direccion }).save();
    return res.status(201).json({
      token: firmarToken(saved),
      user: { id: saved._id, name: saved.nombre, email: saved.email, role: saved.rol },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};