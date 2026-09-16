let modo = 'memoria';

export const getModo = () => modo;
export const setModo = (m) => {
  modo = m;
  console.log(`🔧 Modo persistencia: ${m.toUpperCase()}`);
};