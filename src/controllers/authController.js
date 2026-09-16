import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { getModo } from '../config/modo.js';
import * as memoria from '../config/memoria.js';

const SECRET = process.env.JWT_SECRET || 'dev_secret';

const firmarToken = (u) =>
  jwt.sign({ id: u.id || u._id, rol: u.role, email: u.email }, SECRET, { expiresIn: '8h' });

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
    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    return res.json({
      token: firmarToken(u),
      user: { id: u._id, name: u.name, email: u.email, role: u.role },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};