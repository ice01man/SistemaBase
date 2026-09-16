import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { getModo } from '../config/modo.js';
import * as memoria from '../config/memoria.js';

export const getUsers = async (req, res) => {
  try {
    if (getModo() !== 'mongo') return res.json(memoria.getUsers());
    const users = await User.find().select('-password');
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const createUser = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (getModo() !== 'mongo') return res.status(201).json(memoria.createUser({ nombre, email, password, rol }));
    const saved = await new User({ nombre, email, passwordHash: password, rol }).save();
    const { passwordHash: _, ...safe } = saved.toObject();   // ← ocultar el hash, campo correcto
    res.status(201).json(safe);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const updateUser = async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body;
    if (getModo() !== 'mongo') {
      const upd = memoria.updateUser(req.params.id, { nombre, email, rol, ...(password ? { password } : {}) });
      return upd ? res.json(upd) : res.status(404).json({ message: 'No encontrado' });
    }
    const data = { nombre, email, rol  };
    if (password) data.password = await bcrypt.hash(password, 10);
    const upd = await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password');
    if (!upd) return res.status(404).json({ message: 'No encontrado' });
    res.json(upd);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const deleteUser = async (req, res) => {
  try {
    if (getModo() !== 'mongo') {
      const ok = memoria.deleteUser(req.params.id);
      return ok ? res.json({ message: 'Usuario eliminado' }) : res.status(404).json({ message: 'No encontrado' });
    }
    const del = await User.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: 'No encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};