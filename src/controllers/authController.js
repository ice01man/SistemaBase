import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Usuario from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// 1. Configuración Central de Permisos (Fuente de la Verdad)
const ROLES_PERMISOS = {
    'admin': ['reportes', 'cocina','menu', 'pedidos', 'stock','compras' ,'reparto', 'clientes'],
    'duenas': ['reportes', 'cocina', 'menu','pedidos','stock', 'compras', 'reparto', 'clientes'],
    'cocina': ['reportes', 'cocina'],
    'reparto': ['reportes', 'reparto'],
    'cliente': ['dashboard', 'pedidos', 'clientes'] 
};

// Helper para limpiar
function limpiarInput(str) { return str.replace(/[<>'"]/g, ''); }
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/login
export const login = async (req, res) => {

  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email y password son obligatorios' });
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Formato de email inválido' });

    const emailLimpio = limpiarInput(email).toLowerCase().trim();
    const user = await Usuario.findOne({ email: emailLimpio, activo: true });
    
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const payload = { id: user._id, email: user.email, rol: user.rol, nombre: user.nombre };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // 2. Obtener permisos según el rol del usuario
    const permisosUsuario = ROLES_PERMISOS[user.rol] || [];
    console.log(`Usuario ${user.email} con rol ${user.rol} tiene permisos:`, permisosUsuario);

    res.json({ 
        token, 
        usuario: {  id: user._id , email: user.email, rol: user.rol, nombre: user.nombre },
        permisos: permisosUsuario 
    });
  } catch (e) { 
      console.error(e); 
      res.status(500).json({ error: 'Error interno' }); 
  }
};

// 2. NUEVA FUNCIÓN: Registro de Cliente
export const register = async (req, res) => {
  try {
    const { nombre, email, password, telefono, direccion } = req.body;

    // Validaciones básicas
    if (!email || !password || !nombre || !direccion) {
      return res.status(400).json({ error: 'Nombre, Email, Dirección y Contraseña son obligatorios' });
    }

    // Verificar si el email ya existe
    const existe = await Usuario.findOne({ email: email.toLowerCase() });
    if (existe) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Hash de contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear usuario
    const nuevoUsuario = await Usuario.create({
      nombre,
      email: email.toLowerCase(),
      passwordHash,
      telefono: telefono || '', // Importante para el repartidor
      direccion: direccion || '', // Importante para el repartidor
      rol: 'cliente', // Rol fijo para registros web
      activo: true
    });

    // Generar respuesta automática
    const payload = { id: nuevoUsuario._id, email: nuevoUsuario.email, rol: nuevoUsuario.rol, nombre: nuevoUsuario.nombre };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // Enviar datos iniciales
    res.status(201).json({ 
        token, 
        usuario: { email: nuevoUsuario.email, rol: nuevoUsuario.rol, nombre: nuevoUsuario.nombre },
        permisos: ROLES_PERMISOS['cliente'] 
    });

  } catch (e) { 
      console.error(e); 
      res.status(500).json({ error: 'Error al registrar usuario' }); 
  }
}; 

export const yo = (req, res) => res.json({ usuario: req.usuario });