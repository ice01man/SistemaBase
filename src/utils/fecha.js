// Fechas de negocio. Todo se maneja en hora de Argentina y las fechas de entrega
// se guardan como texto 'YYYY-MM-DD' (así no hay problemas de zona horaria al comparar).
const TZ = 'America/Argentina/Buenos_Aires';
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** "Ahora" en Argentina. BRIE_FAKE_NOW (ISO) permite fijar el reloj en las pruebas. */
export function ahora(fecha = null) {
  const base = fecha ?? (process.env.BRIE_FAKE_NOW ? new Date(process.env.BRIE_FAKE_NOW) : new Date());
  const p = Object.fromEntries(fmt.formatToParts(base).map((x) => [x.type, x.value]));
  const fechaTxt = `${p.year}-${p.month}-${p.day}`;
  return {
    fecha: fechaTxt,
    hora: Number(p.hour),
    minuto: Number(p.minute),
    dow: new Date(`${fechaTxt}T12:00:00Z`).getUTCDay(),
    dia: DIAS_SEMANA[new Date(`${fechaTxt}T12:00:00Z`).getUTCDay()],
  };
}

export const esFecha = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));

export function sumarDias(fecha, n) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const diaDeFecha = (fecha) => DIAS_SEMANA[new Date(`${fecha}T12:00:00Z`).getUTCDay()];

/**
 * Próxima fecha de entrega para un día de menú.
 * Si el día pedido es hoy y ya pasó la hora de corte, se entrega la semana que viene.
 */
export function fechaDeEntrega(dia, horaCorte, ref = ahora()) {
  const objetivo = DIAS_SEMANA.indexOf(dia);
  if (objetivo < 0) return null;
  let delta = (objetivo - ref.dow + 7) % 7;
  if (delta === 0 && ref.hora >= horaCorte) delta = 7;
  return sumarDias(ref.fecha, delta);
}

/** ¿Todavía se puede modificar/cancelar un pedido con esa fecha de entrega? */
export function antesDelCorte(fechaEntrega, horaCorte, ref = ahora()) {
  if (fechaEntrega > ref.fecha) return true;
  if (fechaEntrega === ref.fecha) return ref.hora < horaCorte;
  return false;
}

export const hoy = () => ahora().fecha;
