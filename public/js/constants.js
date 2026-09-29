const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes"];
const DIA_LABEL = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo" };

const CATEGORIA_ICONO = { Gourmet: "🍲", Vegano: "🌱", Sandwich: "🥪", "Del Dia": "🍽️", "Del Día": "🍽️" };

const ESTADO_LABEL = { confirmado: "Confirmado", tomado: "En preparación", despachado: "Despachado" };
const ESTADO_COLOR = {
  confirmado: "background:#dbeafe;color:#1e40af",
  tomado: "background:#fef3c7;color:#92400e",
  despachado: "background:#dcfce7;color:#166534",
};

const ROL_LABEL = { admin: "Administrador", user: "Empleado", cliente: "Cliente" };

function fmtPrecio(n) {
  return "$" + Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function fmtFechaHora(iso) {
  return new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Hoy en español: "lunes", "martes", ... (para preseleccionar el día del menú). */
function diaDeHoy() {
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return dias[new Date().getDay()];
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
