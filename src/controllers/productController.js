import Product from '../models/Product.js';
import { getModo } from '../config/modo.js';
import * as memoria from '../config/memoria.js';

export const getProducts = async (req, res) => {
  try {
    if (getModo() !== 'mongo') return res.json(memoria.getProducts());
    const products = await Product.find();
    res.json(products);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getProductsByDay = async (req, res) => {
  try {
    if (getModo() !== 'mongo') return res.json(memoria.getProductsByDay(req.query.day));
    const products = await Product.find({ day: req.query.day });
    res.json(products);
  } catch (error) { res.status(500).json({ message: error.message }); }
}

export const createProduct = async (req, res) => {
  try {
    const { name, category, day, description, ingredients, image, price } = req.body;
    const data = { name, category, day, description, ingredients, image, price };
    if (getModo() !== 'mongo') return res.status(201).json(memoria.createProduct(data));
    const saved = await new Product(data).save();
    res.status(201).json(saved);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const updateProduct = async (req, res) => {
  try {
    const { name, category, day, description, ingredients, image, price } = req.body;
    const data = { name, category, day, description, ingredients, image, price };
    if (getModo() !== 'mongo') {
      const upd = memoria.updateProduct(req.params.id, data);
      return upd ? res.json(upd) : res.status(404).json({ message: 'No encontrado' });
    }
    const upd = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!upd) return res.status(404).json({ message: 'No encontrado' });
    res.json(upd);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

export const deleteProduct = async (req, res) => {
  try {
    if (getModo() !== 'mongo') {
      const ok = memoria.deleteProduct(req.params.id);
      return ok ? res.json({ message: 'Producto eliminado' }) : res.status(404).json({ message: 'Producto no encontrado' });
    }
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};