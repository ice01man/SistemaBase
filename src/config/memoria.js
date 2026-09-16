// Datos semilla para cuando no hay Mongo.
// ⚠️ Ajustá los campos para que coincidan con tus modelos reales (Product / User).

let products = [
  // LUNES
  { id: 1, name: 'Lomo con Papas Rústicas', category: 'Gourmet',  day: 'lunes',  description: 'Medallón de lomo reducido al vino tinto con papas al horno.', ingredients: ['Medallón de lomo','Reducción de vino tinto','Papas rústicas'], image: 'https://bodegagarzon.com/wp-content/uploads/2018/08/lomo-al-vino-tinto-800x585-750x450.jpg',  price: 4800 },
  { id: 2, name: 'Milanesa con Puré',               category: 'Del Día',  day: 'lunes',  description: 'Clásica milanesa de carne con puré casero.',                 ingredients: ['Carne seleccionada','Puré de papa casero','Limón fresco'],       image: 'https://www.indega.com.py/primicia/wp-content/uploads/2022/04/pure-de-papa-con-pollo-broaster-large-qlJiPE4lyS.jpeg',   price: 3500 },
  { id: 3, name: 'Lasaña de Berenjenas',            category: 'Vegano',   day: 'lunes',  description: 'Capas de berenjena con salsa natural y queso vegetal.',       ingredients: ['Berenjenas asadas','Salsa pomodoro','Queso vegetal'],            image: 'https://imag.bonviveur.com/lasana-de-berenjena.webp',   price: 3900 },
  { id: 4, name: 'Pollo, Palta y Tomate',           category: 'Sandwich', day: 'lunes',  description: 'Pechuga desmenuzada, palta fresca y aderezo especial.',       ingredients: ['Pan artesanal','Pollo desmenuzado','Palta fresca','Tomate'],     image: 'https://www.infobae.com/resizer/v2/3MGVI2LNONGW5HSVRXIOSOTGG4.png?auth=204e569bd17ab15d1ea18c7d489135f743ae62fcb664a3cb23d9bb8d17dab8b1&smart=true&width=992&height=541&quality=85', price: 3200 },
  // MARTES
  { id: 5, name: 'Risotto de Hongos',               category: 'Gourmet',  day: 'martes', description: 'Arroz cremoso con hongos y parmesano.',                       ingredients: ['Arroz arborio','Hongos','Parmesano'],                            image: 'https://cuidateplus.marca.com/sites/default/files/styles/natural/public/cms/2022-09/plato-unico.jpg.webp?itok=nKZXAkku', price: 4600 },
  { id: 6, name: 'Guiso de Lentejas',               category: 'Del Día',  day: 'martes', description: 'Guiso casero con verduras de estación.',                      ingredients: ['Lentejas','Chorizo colorado','Verduras'],                        image: 'https://cuidateplus.marca.com/sites/default/files/styles/natural/public/cms/2022-09/plato-unico.jpg.webp?itok=nKZXAkku',  price: 3400 },
  { id: 7, name: 'Ensalada Mediterránea',            category: 'Vegano',   day: 'martes', description: 'Ensalada fresca con aceitunas y aderezo de limón.',           ingredients: ['Lechuga','Tomate','Aceitunas','Aderezo de limón'],              image: 'https://cuidateplus.marca.com/sites/default/files/styles/natural/public/cms/2022-09/plato-unico.jpg.webp?itok=nKZXAkku', price: 3100 },
  { id: 8, name: 'Sándwich de Roast Beef',          category: 'Sandwich', day: 'martes', description: 'Roast beef con rúcula y mostaza Dijon.',                      ingredients: ['Pan artesanal','Roast beef','Rúcula','Mostaza Dijon'],           image: 'https://cuidateplus.marca.com/sites/default/files/styles/natural/public/cms/2022-09/plato-unico.jpg.webp?itok=nKZXAkku', price: 3300 },
];
let users = [
  { id: 1, name: 'Admin Demo',   email: 'admin@demo.com',   password: 'admin123',   role: 'admin' },
  { id: 2, name: 'User Demo',    email: 'user@demo.com',    password: 'user123',    role: 'user' },
  { id: 3, name: 'Cliente Demo', email: 'cliente@demo.com', password: 'cliente123', role: 'cliente' },
];

const nextId = (arr) => (arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1);

let orders = [];

export const getOrders          = () => orders;
export const getOrdersByUser    = (userId) => orders.filter(o => String(o.userId) === String(userId));
export const getOrdersByEstado  = (estado) => orders.filter(o => o.estado === estado);
export const createOrder = (data) => {
  const o = { id: nextId(orders), ...data, estado: 'confirmado', createdAt: new Date().toISOString() };
  orders.push(o);
  return o;
};
export const updateOrderEstado = (id, estado, extra = {}) => {
  const o = orders.find(x => x.id == id);
  if (!o) return null;
  o.estado = estado;
  Object.assign(o, extra);
  return o;
};
export const updateProduct = (id, data) => {
  const p = products.find(x => x.id == id);
  if (!p) return null;
  Object.assign(p, data); return p;
};
export const updateUser = (id, data) => {
  const u = users.find(x => x.id == id);
  if (!u) return null;
  Object.assign(u, data); return u;
};

// Productos
export const getProducts    = () => products;
export const createProduct  = (data) => { const p = { id: nextId(products), ...data }; products.push(p); return p; };
export const deleteProduct  = (id) => { const before = products.length; products = products.filter(p => p.id != id); return products.length < before; };

// Usuarios (listos para el próximo paso)
export const getUsers   = () => users;
export const findUserByEmail = (email) => users.find(u => u.email === email);
export const createUser = (data) => { const u = { id: nextId(users), ...data }; users.push(u); return u; };
export const deleteUser = (id) => { const before = users.length; users = users.filter(u => u.id != id); return users.length < before; };