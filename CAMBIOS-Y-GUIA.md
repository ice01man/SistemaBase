# SistemaBRIE · Brie — Cambios y guía de puesta en marcha

Versión: rama `seguridad-y-funcionalidad` sobre el commit `116eec4`.

## 1. Cómo ponerlo a andar (paso a paso)

1. Copiá los archivos del zip sobre tu repo (o aplicá `brie-cambios.patch` con `git apply`).
2. Instalá dependencias: `npm install` (no se agregó ninguna dependencia nueva).
3. Copiá `.env.example` a `.env` y completá:
   - `MONGODB_URI` y `MONGODB_DB`
   - `JWT_SECRET` de **32+ caracteres** (comando de generación en el mismo archivo)
4. Cargá el admin inicial: `npm run seed`
   - Imprime una contraseña al azar **una sola vez**. Anotala.
5. Opcional, solo para desarrollo: `npm run seed -- --demo` (insumos, platos con receta, usuarios de prueba).
6. Arrancá: `npm run dev` y abrí `http://localhost:3000`.

**Modo demo sin base:** `PERSISTENCIA=memoria npm run dev`. Imprime los usuarios de prueba en la consola.

> Si tu `.env` actual tiene `JWT_SECRET=dev_secret` o uno corto, el servidor **no arranca** (a propósito).

## 2. Correcciones de seguridad

| # | Antes | Ahora |
|---|-------|-------|
| 1 | Si Mongo fallaba, caía a modo memoria y **todo quedaba abierto como admin** | Si Mongo falla, el proceso **termina**. Sin atajos de "dev" |
| 2 | Secreto JWT por defecto `dev_secret` | Obligatorio, 32+ caracteres. En modo memoria se genera uno al azar |
| 3 | El navegador mandaba precios y total | El servidor lee nombre y precio de la base y calcula el total |
| 4 | `/admin.html` y `/panel.html` se servían sin sesión | Eliminados de `public/`. Solo `/admin`, `/cocina`, `/reparto` con sesión y rol |
| 5 | Login aceptaba objetos (`{"$ne":""}`) | Solo texto. Límite de 10 intentos / 15 min por IP |
| 6 | Un usuario desactivado conservaba su token | Cada request verifica que el usuario exista y esté activo |
| 7 | Errores 500 devolvían `e.message` | Mensaje genérico; el detalle va al log del servidor |
| 8 | Contraseña mínima de 6 | Mínimo 8. Admin no puede borrarse/degradarse ni dejar el sistema sin admin |
| 9 | CORS abierto a cualquier origen | Mismo origen por defecto (`CORS_ORIGIN` en `.env` si hace falta) |

## 3. Qué hace cada rol

| Rol | Entra a | Puede |
|-----|---------|-------|
| **cliente** | `/pedir.html`, `/mis-pedidos.html` | Ver menú, armar carrito (persiste al recargar), pedir, seguir el estado, cancelar antes del corte, editar su dirección |
| **produccion** | `/cocina` | Tomar pedidos, marcarlos listos, ver la lista de producción, **ejecutar el corte**, mover stock |
| **reparto** | `/reparto` | Ver listos, "salir a entregar", marcar entregado (en efectivo queda cobrado) |
| **user** (empleado) | `/cocina` y `/reparto` | Cocina y reparto; stock solo lectura |
| **admin** | `/admin` + todo lo anterior | Resumen de ventas, pedidos, platos y recetas, insumos y stock, usuarios, hora de corte y tema |

## 4. Flujo del pedido

`confirmado` → `en_preparacion` (cocina toma) → `producido` (listo) → `en_camino` (reparto) → `entregado`
y `cancelado` (cliente antes del corte, o admin).

- **Corte (P3):** a la hora configurada (10:00 por defecto, días hábiles) el sistema descuenta los insumos de cada pedido según la **receta** del plato.
- También se puede ejecutar a mano desde Cocina → "Lista de producción". Repetirlo no descuenta doble.
- Si un insumo no alcanza, se descuenta lo que hay, queda en 0 y se informa el **faltante**.
- Cancelar un pedido ya descontado **devuelve** el stock.
- Pedir "lunes" un lunes pasadas las 10:00 entrega el lunes siguiente (el carrito muestra la fecha).

## 5. Archivos nuevos y modificados

- `src/config/env.js` — validación de entorno (falla si es inseguro)
- `src/store/` — capa de datos única para Mongo y memoria (`memory.js`, `mongo.js`, `index.js`, `datos-demo.js`)
- `src/services/` — lógica de negocio: `pedidos`, `produccion`, `stock`, `productos`, `usuarios`, `reportes`
- `src/models/` — `Insumo`, `MovimientoStock`, `Counter` nuevos; `Order`, `Product`, `User`, `Config` ampliados
- `src/controllers/`, `src/routes/` — reescritos; nuevos `/api/insumos` y `/api/produccion`
- `src/views/` — `admin.html` (6 pestañas, JS en `admin-js/`), `cocina.html`, `reparto.html`
- `public/pedir.html`, `public/mis-pedidos.html`, `public/js/*` — carrito persistente y seguimiento
- `test/` — 24 pruebas (`npm test`)

Se eliminaron `src/config/memoria.js`, `public/admin.html`, `public/panel.html`, `src/views/panel.html`.

## 6. API (resumen)

- `POST /api/auth/login | register | logout`, `GET/PATCH /api/auth/me`
- `GET /api/products`, `/by-day`, `/by-category` (público, sin receta); `GET /admin` y `POST/PUT/DELETE` (admin)
- `POST /api/orders`, `GET /mis-pedidos`, `GET /fechas`, `GET /:id`, `POST /:id/cancelar`
- `GET /api/orders/cocina`, `GET /api/orders/reparto`, `GET /api/orders` (admin)
- `PATCH /api/orders/:id/estado` `{estado}`, `PATCH /api/orders/:id/pago`
- `GET/POST/PUT/DELETE /api/insumos`, `POST /:id/movimiento`, `GET /alertas`, `GET /movimientos`
- `GET /api/produccion/lista?fecha=`, `POST /api/produccion/corte`, `GET /api/produccion/reportes`
- `GET /api/config`, `GET /api/config/entregas`, `PATCH /api/config` (admin)

## 7. Pruebas

- `npm test` corre 24 pruebas en modo memoria: seguridad, roles, carrito, flujo completo, corte y stock, usuarios, reportes, modelos.
- Contra tu Mongo real: `npm run seed -- --demo`, levantá el server y corré `BASE_URL=http://localhost:3000 npm test`.
- Esa corrida contra Mongo es el paso que **todavía no se hizo**: probala antes de la entrega.

## 8. Pendientes y advertencias

- **No se probó contra un MongoDB real.** La lógica corre igual en memoria; el código de `src/store/mongo.js` es fino pero hay que verlo andar.
- Mercado Pago / pagos online: no está. Hoy es efectivo o transferencia, marcados a mano.
- Notificaciones por mail/WhatsApp: no están.
- `src/models/Menu.js` y `src/routes/menuRoutes.js` no se usan (apuntan a un controller que no existe). Quedaron sin tocar.
- `SistemaBRIE-actualizado.zip` está commiteado en el repo: conviene sacarlo del control de versiones.
- En producción: HTTPS, `NODE_ENV=production` y activar CSP (hoy está apagada por los scripts inline).
- Antes de salir a producción borrá los usuarios demo (`admin123`, etc.) si cargaste `--demo`.
