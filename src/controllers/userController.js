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
    const { name, email, password, role } = req.body;
    if (getModo() !== 'mongo') return res.status(201).json(memoria.createUser({ name, email, password, role }));
    const hash = await bcrypt.hash(password || '123456', 10);
    const saved = await new User({ name, email, password: hash, role }).save();
    const { password: _, ...safe } = saved.toObject();
    res.status(201).json(safe);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    if (getModo() !== 'mongo') {
      const upd = memoria.updateUser(req.params.id, { name, email, role, ...(password ? { password } : {}) });
      return upd ? res.json(upd) : res.status(404).json({ message: 'No encontrado' });
    }
    const data = { name, email, role };
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