import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { PORT, CORS_ORIGIN, MODO } from './src/config/env.js';
import { iniciarStore } from './src/store/index.js';
import { ErrorHttp } from './src/utils/errores.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import configRoutes from './src/routes/configRoutes.js';
import insumoRoutes from './src/routes/insumoRoutes.js';
import produccionRoutes from './src/routes/produccionRoutes.js';
import { paginaRequiereRol } from './src/middleware/paginaAuth.js';
import { ROLES_COCINA, ROLES_REPARTO } from './src/middleware/auth.js';
import { programarCorteDiario } from './src/services/produccion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1) Primero la base. Si Mongo no conecta o el entorno es inseguro, el proceso termina:
//    nunca se sirve tráfico "sin base" (antes caía a modo memoria con todo abierto).
await iniciarStore();

const app = express();
app.set('trust proxy', 1); // detrás de Render/Nginx, req.ip es la IP real (limitador de login)
app.use(helmet({ contentSecurityPolicy: false })); // CSP off: las páginas usan scripts inline y CDN de fuentes
// Mismo origen por defecto. Para permitir otro front, definí CORS_ORIGIN=https://mi-front.com en .env
app.use(cors({ origin: CORS_ORIGIN.length ? CORS_ORIGIN : false }));
app.use(express.json({ limit: '100kb' }));

// Páginas privadas: NO son estáticos de /public. Se verifica el rol contra la cookie de sesión
// ANTES de mandar el HTML. Van antes de express.static para tener prioridad.
const vista = (archivo) => (_req, res) => res.sendFile(join(__dirname, 'src/views', archivo));
app.get('/admin', paginaRequiereRol('admin'), vista('admin.html'));
app.use('/admin/js', paginaRequiereRol('admin'), express.static(join(__dirname, 'src/views/admin-js')));
app.get('/cocina', paginaRequiereRol(...ROLES_COCINA), vista('cocina.html'));
app.get('/reparto', paginaRequiereRol(...ROLES_REPARTO), vista('reparto.html'));
app.get('/panel', (_req, res) => res.redirect('/cocina')); // compatibilidad con el panel anterior

app.use(express.static(join(__dirname, 'public'))); // front público

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/config', configRoutes);
app.use('/api/insumos', insumoRoutes);
app.use('/api/produccion', produccionRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejador de errores: los esperados salen con su código; los demás se loguean y NO filtran detalles.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof ErrorHttp) return res.status(err.status).json({ error: err.message });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Pedido demasiado grande' });
  if (err?.name === 'ValidationError' || err?.name === 'CastError') return res.status(400).json({ error: 'Datos inválidos' });
  if (err?.code === 11000) return res.status(409).json({ error: 'Ya existe un registro con ese valor' });
  console.error('❌', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

programarCorteDiario();
const server = app.listen(PORT, () => console.log(`SistemaBRIE escuchando en http://localhost:${PORT}  (persistencia: ${MODO})`));
export { app, server };
