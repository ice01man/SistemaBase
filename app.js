import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { conectarDB } from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import configRoutes from './src/routes/configRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(helmet({ contentSecurityPolicy: false })); // CSP off en dev para CDN de fuentes/íconos
app.use(cors());
//app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(join(__dirname, 'public'))); // sirve el front en /

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/config', configRoutes);

if (process.env.PERSISTENCIA === 'mongo') {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await conectarDB(process.env.MONGODB_URI);
} else {
  console.log('⚠️  Modo MEMORIA: corriendo sin MongoDB (datos de prueba en RAM)');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stock escuchando en http://localhost:${PORT}`));
