// Pestaña "Ajustes": apariencia del sitio y hora de corte de producción.
const TEMAS = [
  { id: "violeta", nombre: "Violeta (original)", color: "#7a68b5" },
  { id: "trueno", nombre: "Trueno (celeste)", color: "#0891b2" },
  { id: "bosque", nombre: "Bosque (verde)", color: "#15803d" },
];

async function cargarAjustes() {
  const cfg = await apiGet("/config/admin");
  zonasActuales = cfg.zonas || [];
  document.getElementById("tab-ajustes").innerHTML = `
    <h2 class="seccion-titulo">Ajustes</h2>
    <div class="card" style="margin-top:1rem;">
      <h3 style="margin:0 0 .5rem;">🎨 Apariencia</h3>
      <div style="display:flex; gap:.75rem; flex-wrap:wrap;">
        ${TEMAS.map((t) => `
          <button class="chip ${cfg.tema === t.id ? "activo" : ""}" onclick="guardarAjuste({ tema: '${t.id}' })">
            <span style="display:inline-block; width:.8rem; height:.8rem; border-radius:9999px; background:${t.color}; margin-right:.4rem;"></span>${t.nombre}
          </button>`).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:1rem;">
      <h3 style="margin:0 0 .5rem;">📅 Qué días se pueden pedir</h3>
      <p style="font-size:.875rem; opacity:.8; margin:0 0 .75rem;">
        Activado: el cliente solo puede pedir el menú de <b>hoy</b> y antes de la hora de corte (los otros días quedan solo para ver).
        Desactivado: puede pedir cualquier día y se entrega en la próxima fecha que corresponda.
      </p>
      <label style="display:flex; align-items:center; gap:.5rem; font-weight:700;">
        <input type="checkbox" ${cfg.soloPedidoDelDia ? "checked" : ""} style="width:auto;" onchange="guardarAjuste({ soloPedidoDelDia: this.checked })" />
        Solo se puede pedir el menú del día
      </label>
    </div>
    <div class="card" style="margin-top:1rem;">
      <h3 style="margin:0 0 .5rem;">⏱ Corte de producción</h3>
      <p style="font-size:.875rem; opacity:.8; margin:0 0 .75rem;">
        A esta hora se cierran los pedidos del día: el cliente ya no puede pedir ni cancelar para hoy,
        y el sistema descuenta el stock de los insumos automáticamente (días hábiles).
      </p>
      <form onsubmit="guardarCorte(event)" style="display:flex; gap:.5rem; align-items:end;">
        <div><label class="label">Hora de corte (0–23)</label>
          <input class="input" name="horaCorte" type="number" min="0" max="23" value="${cfg.horaCorte}" style="width:7rem;" required /></div>
        <button class="btn-primary" type="submit">Guardar</button>
      </form>
    </div>
    <div class="card" style="margin-top:1rem;" id="card-zonas">
      <h3 style="margin:0 0 .5rem;">🗺️ Zonas de reparto</h3>
      <p style="font-size:.875rem; opacity:.8; margin:0 0 .75rem;">
        Cada cliente se asigna a una zona (en <b>Usuarios</b>) y cada repartidor a las zonas que cubre. El pedido le llega solo al repartidor de esa zona.
        Mientras no haya zonas creadas, todos los repartidores ven todos los pedidos.
      </p>
      <div style="display:flex; gap:.4rem; flex-wrap:wrap; margin-bottom:.75rem;">
        ${(cfg.zonas || []).map((z) => `<span class="chip activo" style="cursor:default;">🗺️ ${esc(z)} <button type="button" class="btn-icono peligro" style="width:1.6rem; height:1.6rem; margin-left:.35rem; font-size:.7rem;" title="Borrar zona (solo si no está en uso)" onclick="quitarZona('${esc(z).replace(/'/g, "\\'")}')">🗑️</button></span>`).join("") || `<span style="opacity:.6;">Todavía no hay zonas.</span>`}
      </div>
      <form onsubmit="agregarZona(event)" style="display:flex; gap:.5rem; align-items:end;">
        <div><label class="label">Nueva zona</label><input class="input" name="zona" maxlength="40" placeholder="Ej.: Merlo Centro" required /></div>
        <button class="btn-primary" type="submit">➕ Agregar</button>
      </form>
      <div id="zonas-error"></div>
    </div>
    <div class="card" style="margin-top:1rem;">
      <h3 style="margin:0 0 .5rem;">📦 Aviso de stock: "llegando al mínimo"</h3>
      <p style="font-size:.875rem; opacity:.8; margin:0 0 .75rem;">
        Un insumo pasa a "llegando al mínimo" cuando su stock está hasta este porcentaje <b>por encima</b> de su stock mínimo.
        Con 25 % y un mínimo de 10 kg, avisa desde 12,5 kg. (Los vencimientos avisan 7 días antes.)
      </p>
      <form onsubmit="guardarUmbral(event)" style="display:flex; gap:.5rem; align-items:end;">
        <div><label class="label">Porcentaje (0–200)</label>
          <input class="input" name="umbralStockPct" type="number" min="0" max="200" step="1" value="${cfg.umbralStockPct}" style="width:7rem;" required /></div>
        <button class="btn-primary" type="submit">Guardar</button>
      </form>
    </div>
    <div class="card" style="margin-top:1rem;">
      <h3 style="margin:0 0 .5rem;">💲 Margen objetivo</h3>
      <p style="font-size:.875rem; opacity:.8; margin:0 0 .75rem;">
        Es el margen <b>real sobre el precio de venta</b>. El precio sugerido de cada plato es <code>costo ÷ (1 − margen)</code>:
        con 30 %, un costo de $1.000 se sugiere a $1.430 (y no $1.300, que dejaría solo 23 % de margen real).
      </p>
      <form onsubmit="guardarMargen(event)" style="display:flex; gap:.5rem; align-items:end;">
        <div><label class="label">Margen objetivo (%)</label>
          <input class="input" name="margenObjetivo" type="number" min="1" max="90" step="0.5" value="${cfg.margenObjetivo}" style="width:7rem;" required /></div>
        <button class="btn-primary" type="submit">Guardar</button>
      </form>
    </div>`;
}

let zonasActuales = [];
async function guardarZonas(lista) {
  try { await apiPatch("/config", { zonas: lista }); await cargarAjustes(); }
  catch (err) { document.getElementById("zonas-error").innerHTML = `<p class="msg-error">${esc(err.message)}</p>`; }
}
function agregarZona(e) {
  e.preventDefault();
  const nombre = new FormData(e.target).get("zona").trim();
  guardarZonas([...zonasActuales, nombre]);
}
function quitarZona(nombre) { if (confirm(`¿Borrar la zona "${nombre}"?`)) guardarZonas(zonasActuales.filter((z) => z !== nombre)); }

function guardarUmbral(e) {
  e.preventDefault();
  guardarAjuste({ umbralStockPct: Number(new FormData(e.target).get("umbralStockPct")) });
}

function guardarMargen(e) {
  e.preventDefault();
  guardarAjuste({ margenObjetivo: Number(new FormData(e.target).get("margenObjetivo")) });
}

async function guardarAjuste(cambio) {
  try {
    const r = await apiPatch("/config", cambio);
    if (r.tema) document.documentElement.setAttribute("data-tema", r.tema === "violeta" ? "" : r.tema);
    toast("Ajuste guardado");
    await cargarAjustes();
  } catch (err) { toast(err.message, "error"); }
}

function guardarCorte(e) {
  e.preventDefault();
  guardarAjuste({ horaCorte: Number(new FormData(e.target).get("horaCorte")) });
}
