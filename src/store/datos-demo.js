// Datos de demostración. Se cargan solos en modo memoria y, con `npm run seed -- --demo`, en MongoDB.
// Las contraseñas de abajo SOLO existen en modo memoria / demo. En producción no se usan.

export const USUARIOS_DEMO = [
  { nombre: 'Admin Demo',      email: 'admin@demo.com',      password: 'admin123',      rol: 'admin' },
  { nombre: 'Cocina Demo',     email: 'produccion@demo.com', password: 'produccion123', rol: 'produccion' },
  { nombre: 'Reparto Demo',    email: 'reparto@demo.com',    password: 'reparto123',    rol: 'reparto' },
  { nombre: 'Empleado Demo',   email: 'user@demo.com',       password: 'user123',       rol: 'user' },
  { nombre: 'Cliente Demo',    email: 'cliente@demo.com',    password: 'cliente123',    rol: 'cliente',
    direccion: 'Av. Libertador 1234, Merlo', telefono: '1155550000' },
];

// [nombre, unidad, stock_actual, stock_minimo, costo_unitario, categoria]
export const INSUMOS_DEMO = [
  ['Lomo', 'kg', 20, 5, 14000, 'Carnes'],
  ['Papas', 'kg', 80, 15, 900, 'Verduras'],
  ['Vino tinto', 'l', 10, 2, 3500, 'Almacén'],
  ['Carne para milanesa', 'kg', 30, 8, 9000, 'Carnes'],
  ['Pan rallado', 'kg', 10, 2, 1200, 'Almacén'],
  ['Huevos', 'u', 120, 30, 180, 'Almacén'],
  ['Berenjenas', 'kg', 25, 6, 1500, 'Verduras'],
  ['Salsa pomodoro', 'l', 15, 4, 2200, 'Almacén'],
  ['Queso vegetal', 'kg', 8, 2, 7000, 'Lácteos'],
  ['Pollo', 'kg', 30, 8, 5200, 'Carnes'],
  ['Palta', 'kg', 10, 3, 4500, 'Frutas'],
  ['Pan artesanal', 'u', 150, 40, 450, 'Almacén'],
  ['Arroz arborio', 'kg', 15, 4, 3800, 'Almacén'],
  ['Hongos', 'kg', 8, 2, 6500, 'Verduras'],
  ['Lentejas', 'kg', 12, 3, 2400, 'Almacén'],
  ['Verduras de estación', 'kg', 40, 10, 1300, 'Verduras'],
  ['Roast beef', 'kg', 12, 3, 12000, 'Carnes'],
  ['Envases', 'u', 400, 100, 120, 'Envases'],
];

const IMG = 'https://cuidateplus.marca.com/sites/default/files/styles/natural/public/cms/2022-09/plato-unico.jpg.webp?itok=nKZXAkku';

// receta: [nombre de insumo, cantidad por UNA porción]
export const PRODUCTOS_DEMO = [
  { name: 'Lomo con Papas Rústicas', category: 'Gourmet', day: 'lunes', price: 4800, description: 'Medallón de lomo reducido al vino tinto con papas al horno.', ingredients: ['Medallón de lomo', 'Reducción de vino tinto', 'Papas rústicas'], image: 'https://bodegagarzon.com/wp-content/uploads/2018/08/lomo-al-vino-tinto-800x585-750x450.jpg', receta: [['Lomo', 0.22], ['Papas', 0.3], ['Vino tinto', 0.05], ['Envases', 1]] },
  { name: 'Milanesa con Puré', category: 'Del Día', day: 'lunes', price: 3500, description: 'Clásica milanesa de carne con puré casero.', ingredients: ['Carne seleccionada', 'Puré de papa casero', 'Limón fresco'], image: 'https://www.indega.com.py/primicia/wp-content/uploads/2022/04/pure-de-papa-con-pollo-broaster-large-qlJiPE4lyS.jpeg', receta: [['Carne para milanesa', 0.2], ['Pan rallado', 0.05], ['Huevos', 1], ['Papas', 0.25], ['Envases', 1]] },
  { name: 'Lasaña de Berenjenas', category: 'Vegano', day: 'lunes', price: 3900, description: 'Capas de berenjena con salsa natural y queso vegetal.', ingredients: ['Berenjenas asadas', 'Salsa pomodoro', 'Queso vegetal'], image: 'https://imag.bonviveur.com/lasana-de-berenjena.webp', tags: ['100% Vegano'], receta: [['Berenjenas', 0.3], ['Salsa pomodoro', 0.1], ['Queso vegetal', 0.08], ['Envases', 1]] },
  { name: 'Pollo, Palta y Tomate', category: 'Sandwich', day: 'lunes', price: 3200, description: 'Pechuga desmenuzada, palta fresca y aderezo especial.', ingredients: ['Pan artesanal', 'Pollo desmenuzado', 'Palta fresca', 'Tomate'], image: 'https://www.infobae.com/resizer/v2/3MGVI2LNONGW5HSVRXIOSOTGG4.png?auth=204e569bd17ab15d1ea18c7d489135f743ae62fcb664a3cb23d9bb8d17dab8b1&smart=true&width=992&height=541&quality=85', receta: [['Pan artesanal', 1], ['Pollo', 0.15], ['Palta', 0.08], ['Envases', 1]] },
  { name: 'Risotto de Hongos', category: 'Gourmet', day: 'martes', price: 4600, description: 'Arroz cremoso con hongos y parmesano.', ingredients: ['Arroz arborio', 'Hongos', 'Parmesano'], image: IMG, receta: [['Arroz arborio', 0.12], ['Hongos', 0.1], ['Envases', 1]] },
  { name: 'Guiso de Lentejas', category: 'Del Día', day: 'martes', price: 3400, description: 'Guiso casero con verduras de estación.', ingredients: ['Lentejas', 'Chorizo colorado', 'Verduras'], image: IMG, receta: [['Lentejas', 0.12], ['Verduras de estación', 0.15], ['Envases', 1]] },
  { name: 'Ensalada Mediterránea', category: 'Vegano', day: 'martes', price: 3100, description: 'Ensalada fresca con aceitunas y aderezo de limón.', ingredients: ['Lechuga', 'Tomate', 'Aceitunas', 'Aderezo de limón'], image: IMG, tags: ['100% Vegano'], receta: [['Verduras de estación', 0.3], ['Envases', 1]] },
  { name: 'Sándwich de Roast Beef', category: 'Sandwich', day: 'martes', price: 3300, description: 'Roast beef con rúcula y mostaza Dijon.', ingredients: ['Pan artesanal', 'Roast beef', 'Rúcula', 'Mostaza Dijon'], image: IMG, receta: [['Pan artesanal', 1], ['Roast beef', 0.12], ['Envases', 1]] },
  { name: 'Pollo al Verdeo con Papas', category: 'Del Día', day: 'miercoles', price: 3600, description: 'Pata y muslo al verdeo con papas rústicas.', ingredients: ['Pollo', 'Verdeo', 'Papas'], image: IMG, receta: [['Pollo', 0.3], ['Papas', 0.3], ['Envases', 1]] },
  { name: 'Lomo al Malbec', category: 'Gourmet', day: 'miercoles', price: 4900, description: 'Lomo con reducción de Malbec y vegetales salteados.', ingredients: ['Lomo', 'Malbec', 'Vegetales'], image: IMG, receta: [['Lomo', 0.22], ['Vino tinto', 0.05], ['Verduras de estación', 0.15], ['Envases', 1]] },
  { name: 'Wok de Verduras', category: 'Vegano', day: 'jueves', price: 3300, description: 'Verduras salteadas al wok con salsa de soja.', ingredients: ['Verduras', 'Soja', 'Jengibre'], image: IMG, tags: ['100% Vegano'], receta: [['Verduras de estación', 0.35], ['Envases', 1]] },
  { name: 'Milanesa Napolitana', category: 'Del Día', day: 'jueves', price: 3900, description: 'Milanesa con salsa, jamón y queso gratinado.', ingredients: ['Milanesa', 'Salsa', 'Jamón', 'Queso'], image: IMG, receta: [['Carne para milanesa', 0.2], ['Pan rallado', 0.05], ['Huevos', 1], ['Salsa pomodoro', 0.06], ['Envases', 1]] },
  { name: 'Sándwich de Pollo Crispy', category: 'Sandwich', day: 'viernes', price: 3300, description: 'Pollo crocante, lechuga y mayonesa casera.', ingredients: ['Pan artesanal', 'Pollo', 'Lechuga'], image: IMG, receta: [['Pan artesanal', 1], ['Pollo', 0.15], ['Envases', 1]] },
  { name: 'Risotto de Hongos Viernes', category: 'Gourmet', day: 'viernes', price: 4600, description: 'Arroz cremoso con hongos de estación.', ingredients: ['Arroz arborio', 'Hongos'], image: IMG, receta: [['Arroz arborio', 0.12], ['Hongos', 0.1], ['Envases', 1]] },
];
