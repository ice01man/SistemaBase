// Arma la carpeta "brie-lite/": el sistema SIN la parte administrativa (ni panel, ni sus JS, ni el front viejo).
// Uso:  npm run armar:lite      → crea ./brie-lite  (copiá esa carpeta al servidor "público")
import { cpSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'brie-lite');
const EXCLUIDOS = [
  join('src', 'views', 'admin.html'), join('src', 'views', 'admin-js'),
  join('public', '_legacy-spa'), join('public', 'js', 'script.js'),
];

rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(SALIDA);
const filtro = (origen) => {
  const rel = origen.slice(RAIZ.length + 1);
  return !EXCLUIDOS.some((x) => rel === x || rel.startsWith(x + sep));
};
for (const item of ['app.js', 'package.json', 'src', 'public']) cpSync(join(RAIZ, item), join(SALIDA, item), { recursive: true, filter: filtro });

// Sin scripts de administración en el paquete lite.
const pkg = JSON.parse(readFileSync(join(SALIDA, 'package.json'), 'utf8'));
for (const s of ['seed', 'rol', 'armar:lite', 'test']) delete pkg.scripts[s];
writeFileSync(join(SALIDA, 'package.json'), JSON.stringify(pkg, null, 2));

writeFileSync(join(SALIDA, 'LEEME-LITE.md'), `# Sistema BRIE · versión LITE

Clientes (menú, pedidos), cocina y reparto. NO incluye el panel de administración.

1. \`npm install --omit=dev\`
2. Variables de entorno (en el servidor, nunca en el repo):
   - MONGODB_URI y MONGODB_DB (idealmente con un usuario de Mongo propio para lite)
   - JWT_SECRET: un secreto DISTINTO al del sistema completo (así un token de lite no vale en el admin)
   - NODE_ENV=production
3. \`npm start\`

Las cuentas admin no pueden ingresar por acá. El corte diario automático corre solo en el sistema completo.
`);
console.log('✅ Versión lite armada en', SALIDA);
