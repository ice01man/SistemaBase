// Pestaña "Ajustes": apariencia del sitio y hora de corte de producción.
const TEMAS = [
  { id: "violeta", nombre: "Violeta (original)", color: "#7a68b5" },
  { id: "trueno", nombre: "Trueno (celeste)", color: "#0891b2" },
  { id: "bosque", nombre: "Bosque (verde)", color: "#15803d" },
];

async function cargarAjustes() {
  const cfg = await apiGet("/config");
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
    </div>`;
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
