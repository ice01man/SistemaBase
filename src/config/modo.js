// Compatibilidad: el modo ahora lo fija el entorno (PERSISTENCIA) y NO cambia en caliente.
import { MODO } from './env.js';

export const getModo = () => MODO;
