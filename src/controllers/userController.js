import { db } from '../store/index.js';
import { crearUsuario, actualizarUsuario, borrarUsuario, publico } from '../services/usuarios.js';

export const getUsers = async (_req, res) => {
  res.json((await db.users.list({}, { sort: { nombre: 1 } })).map(publico));
};

export const createUser = async (req, res) => {
  res.status(201).json(await crearUsuario(req.body ?? {}));
};

export const updateUser = async (req, res) => {
  res.json(await actualizarUsuario(req.params.id, req.body ?? {}, { esAdmin: true, actorId: req.usuario.id }));
};

export const deleteUser = async (req, res) => {
  res.json(await borrarUsuario(req.params.id, req.usuario.id));
};
