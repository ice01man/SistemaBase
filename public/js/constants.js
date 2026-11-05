const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes"];
const DIA_LABEL = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo" };

const CATEGORIA_ICONO = { Gourmet: "🍲", Vegano: "🌱", Sandwich: "🥪", "Del Dia": "🍽️", "Del Día": "🍽️" };

// Flujo del pedido: confirmado → en_preparacion → producido → en_camino → entregado (o cancelado)
const ESTADO_LABEL = {
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  producido: "Listo para entregar",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
const ESTADO_COLOR = {
  confirmado: "background:#dbeafe;color:#1e40af",
  en_preparacion: "background:#fef3c7;color:#92400e",
  producido: "background:#ede9fe;color:#5b21b6",
  en_camino: "background:#ffedd5;color:#9a3412",
  entregado: "background:#dcfce7;color:#166534",
  cancelado: "background:#fee2e2;color:#b91c1c",
};
const PASOS_SEGUIMIENTO = ["confirmado", "en_preparacion", "producido", "en_camino", "entregado"];

const ROL_LABEL = { admin: "Administrador", produccion: "Producción / Cocina", reparto: "Reparto", user: "Empleado", cliente: "Cliente" };
const MEDIO_PAGO_LABEL = { efectivo: "Efectivo (al recibir)", transferencia: "Transferencia" };

function fmtPrecio(n) {
  return "$" + Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function fmtNum(n) {
  return Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

function fmtFechaHora(iso) {
  return new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** '2026-11-09' → 'lun 09/11' (la fecha de entrega viene como texto AAAA-MM-DD). */
function fmtFechaEntrega(f) {
  if (!f) return "";
  const [y, m, d] = f.split("-").map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", { weekday: "short", timeZone: "UTC" });
  return `${dia} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

/** Hoy en español: "lunes", "martes", ... (para preseleccionar el día del menú). */
function diaDeHoy() {
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return dias[new Date().getDay()];
}

/** Hoy como AAAA-MM-DD en hora local del navegador. */
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function badgeEstado(estado) {
  return `<span class="badge" style="${ESTADO_COLOR[estado] ?? ""}">${esc(ESTADO_LABEL[estado] ?? estado)}</span>`;
}

/** Aviso temporal arriba a la derecha (reemplaza alert()). tipo: "ok" | "error" */
function toast(texto, tipo = "ok") {
  let cont = document.getElementById("toasts");
  if (!cont) {
    cont = document.createElement("div");
    cont.id = "toasts";
    document.body.appendChild(cont);
  }
  const t = document.createElement("div");
  t.className = `toast toast-${tipo}`;
  t.textContent = texto;
  cont.appendChild(t);
  setTimeout(() => t.remove(), tipo === "error" ? 6000 : 3500);
}
