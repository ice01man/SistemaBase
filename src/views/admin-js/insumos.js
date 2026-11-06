// Pestaña "Insumos y stock": catálogo, alertas (bajo mínimo / llegando / vencimientos), movimientos e historial.
const CATEGORIAS_INSUMO = ["Verduras", "Frutas", "Lácteos", "Carnes", "Almacén", "Envases", "Otros"];
let insumosCache = [];
let filtroInsumos = "";          // texto del buscador
let filtroCategoria = "Todas";   // chip de categoría
let soloAlertas = false;         // mostrar solo lo que pide atención
// Se conservan al guardar/recargar la pestaña.

// Orden alfabético en castellano, sin distinguir mayúsculas ni tildes ("Ñoquis" y "avena" se ordenan bien).
const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
// Lo urgente arriba (bajo mínimo / vencido), después lo que se está por acabar o vencer, después el resto. Dentro de cada grupo, A→Z.
const RANGO = { critico: 0, aviso: 1, ok: 2 };
const porUrgencia = (a, b) => RANGO[a.nivel] - RANGO[b.nivel] || porNombre(a, b);
// Para buscar sin tildes ni mayúsculas: "limon" encuentra "Limón".
const normalizar = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const fmtVenc = (v) => (v ? v.split("-").reverse().join("/") : "—");

function insumosVisibles() {
  const q = normalizar(filtroInsumos);
  return insumosCache.filter((i) =>
    (!q || normalizar(i.nombre).includes(q)) &&
    (filtroCategoria === "Todas" || i.categoria === filtroCategoria) &&
    (!soloAlertas || i.nivel !== "ok"));
}

function badgesInsumo(i) {
  if (i.activo === false) return `<span class="badge" style="background:#e5e7eb;color:#374151;">Inactivo</span>`;
  const rojo = "background:#fee2e2;color:#b91c1c;", naranja = "background:#ffedd5;color:#c2410c;";
  const b = [];
  if (i.bajoMinimo) b.push(`<span class="badge" style="${rojo}">Bajo mínimo</span>`);
  else if (i.llegando) b.push(`<span class="badge" style="${naranja}">Llegando al mínimo</span>`);
  if (i.vencido) b.push(`<span class="badge" style="${rojo}">Vencido</span>`);
  else if (i.vencePronto) b.push(`<span class="badge" style="${naranja}">${i.diasParaVencer === 0 ? "Vence hoy" : `Vence en ${i.diasParaVencer} d`}</span>`);
  return b.length ? b.join(" ") : `<span class="badge" style="background:#dcfce7;color:#166534;">OK</span>`;
}

function filasInsumos() {
  const lista = insumosVisibles().sort(porUrgencia);
  if (!lista.length) return `<tr><td colspan="7" style="text-align:center; opacity:.6; padding:1.2rem;">${filtroInsumos || soloAlertas || filtroCategoria !== "Todas" ? "Ningún insumo coincide con los filtros." : "Todavía no hay insumos."}</td></tr>`;
  return lista.map((i) => `
        <tr class="${i.nivel === "critico" ? "fila-bajo" : i.nivel === "aviso" ? "fila-aviso" : ""}">
          <td><strong>${esc(i.nombre)}</strong><br><small style="opacity:.7;">${esc(i.categoria)}</small></td>
          <td><b>${fmtNum(i.stock_actual)}</b> ${i.unidad}</td>
          <td>${fmtNum(i.stock_minimo)} ${i.unidad}</td>
          <td>${fmtVenc(i.vencimiento)}</td>
          <td>${fmtPrecio(i.costo_unitario)}</td>
          <td>${badgesInsumo(i)}</td>
          <td style="white-space:nowrap;">
            <button class="btn-icono" title="Registrar movimiento (ingreso, egreso o ajuste)" onclick="abrirMovimiento('${i._id}')">📥</button>
            <button class="btn-icono" title="Ver historial de movimientos" onclick="verMovimientos('${i._id}')">📜</button>
            <button class="btn-icono" title="Editar" onclick="abrirFormInsumo('${i._id}')">✏️</button>
            <button class="btn-icono peligro" title="Borrar" onclick="borrarInsumo('${i._id}')">🗑️</button>
          </td>
        </tr>`).join("");
}

function filtrosInsumosHtml() {
  const cuenta = (c) => insumosCache.filter((i) => c === "Todas" || i.categoria === c).length;
  const nAlertas = insumosCache.filter((i) => i.nivel !== "ok").length;
  return `
    ${["Todas", ...CATEGORIAS_INSUMO].map((c) => `<button class="chip ${filtroCategoria === c ? "activo" : ""}" onclick="filtrarCategoria('${c}')">${c} <small>(${cuenta(c)})</small></button>`).join("")}
    <button class="chip ${soloAlertas ? "activo" : ""}" onclick="alternarAlertas()" title="Bajo mínimo, llegando al mínimo, vencidos o por vencer">⚠️ Solo alertas <small>(${nAlertas})</small></button>`;
}

// Redibuja solo la tabla y los filtros (no toda la pestaña), así el cursor del buscador no se pierde.
function refrescarInsumos() {
  document.getElementById("insumos-tbody").innerHTML = filasInsumos();
  document.getElementById("insumos-filtros").innerHTML = filtrosInsumosHtml();
  document.getElementById("insumos-cuenta").textContent = `${insumosVisibles().length} de ${insumosCache.length} insumos`;
}
function buscarInsumos(texto) { filtroInsumos = texto; refrescarInsumos(); }
function filtrarCategoria(c) { filtroCategoria = c; refrescarInsumos(); }
function alternarAlertas() { soloAlertas = !soloAlertas; refrescarInsumos(); }

async function cargarInsumos() {
  insumosCache = await apiGet("/insumos");
  const n = (f) => insumosCache.filter(f).length;
  const valor = insumosCache.reduce((a, i) => a + i.stock_actual * i.costo_unitario, 0);
  document.getElementById("tab-insumos").innerHTML = `
    <div class="barra-herramientas">
      <h2 class="seccion-titulo">Insumos y stock</h2>
      <button class="btn-orange" onclick="abrirFormInsumo()">+ Nuevo insumo</button>
    </div>
    <div class="stats" style="margin-top:1rem;">
      <div class="stat"><div class="valor">${insumosCache.length}</div><div class="rotulo">Insumos</div></div>
      <div class="stat ${n((i) => i.bajoMinimo) ? "alerta" : ""}"><div class="valor">${n((i) => i.bajoMinimo)}</div><div class="rotulo">Bajo mínimo</div></div>
      <div class="stat"><div class="valor">${n((i) => i.llegando)}</div><div class="rotulo">Llegando al mínimo</div></div>
      <div class="stat ${n((i) => i.vencido) ? "alerta" : ""}"><div class="valor">${n((i) => i.vencido)} · ${n((i) => i.vencePronto)}</div><div class="rotulo">Vencidos · vencen pronto</div></div>
      <div class="stat"><div class="valor">${fmtPrecio(valor)}</div><div class="rotulo">Valor del stock</div></div>
    </div>
    <div style="margin-top:1rem; display:flex; gap:.75rem; align-items:center; flex-wrap:wrap;">
      <input class="input" id="insumos-buscar" type="search" placeholder="🔍 Buscar insumo…" value="${esc(filtroInsumos)}" oninput="buscarInsumos(this.value)" style="max-width:22rem;" autocomplete="off" />
      <span id="insumos-cuenta" style="font-size:.85rem; opacity:.7;"></span>
    </div>
    <div id="insumos-filtros" style="margin-top:.6rem; display:flex; gap:.4rem; flex-wrap:wrap;"></div>
    <div class="card tabla-scroll" style="margin-top:.75rem;"><table>
      <thead><tr><th>Insumo</th><th>Stock</th><th>Mínimo</th><th>Vence</th><th>Costo unit.</th><th>Estado</th><th></th></tr></thead>
      <tbody id="insumos-tbody"></tbody></table></div>
    <p style="font-size:.78rem; opacity:.7; margin:.5rem 0 0;">Orden: primero lo urgente (bajo mínimo o vencido), después lo que está por acabarse o vencer, y al final el resto, siempre de la A a la Z. "Llegando al mínimo" y "vence pronto" son avisos anticipados.</p>
`;
  refrescarInsumos();
}

// Verduras: vencimiento ESTIMADO de 1 semana (se completa solo, pero se puede cambiar o borrar).
const DIAS_VENCIMIENTO_VERDURAS = 7;
const MSG_VERDURAS = "Estimado: 1 semana para verduras. Podés cambiarlo.";
function fechaEn(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Al elegir "Verduras" y no haber fecha, propone hoy + 7 días. Si después cambia de categoría y la fecha era la propuesta, la quita.
function sugerirVencimiento(sel) {
  const f = sel.form.elements.vencimiento, hint = document.getElementById("venc-hint");
  if (sel.value === "Verduras" && !f.value) { f.value = fechaEn(DIAS_VENCIMIENTO_VERDURAS); f.dataset.auto = "1"; hint.textContent = MSG_VERDURAS; }
  else if (sel.value !== "Verduras" && f.dataset.auto === "1") { f.value = ""; f.dataset.auto = ""; hint.textContent = ""; }
}
function vencimientoManual(input) { input.dataset.auto = ""; document.getElementById("venc-hint").textContent = ""; }

function abrirFormInsumo(id) {
  const i = id ? insumosCache.find((x) => x._id === id) : null;
  abrirModal(i ? `Editar insumo · ${esc(i.nombre)}` : "Nuevo insumo", `
    <form class="card form-grid" onsubmit="guardarInsumo(event)">
      <input type="hidden" name="_id" value="${i?._id ?? ""}" />
      <div><label class="label">Nombre</label><input class="input" name="nombre" value="${esc(i?.nombre ?? "")}" required maxlength="80" /></div>
      <div><label class="label">Unidad</label>
        <select class="input" name="unidad">${["kg", "g", "l", "ml", "u"].map((u) => `<option ${i?.unidad === u ? "selected" : ""}>${u}</option>`).join("")}</select></div>
      ${i ? "" : `<div><label class="label">Stock inicial</label><input class="input" name="stock_actual" type="number" min="0" step="0.001" value="0" /></div>`}
      <div><label class="label">Categoría</label>
        <select class="input" name="categoria" onchange="sugerirVencimiento(this)">${CATEGORIAS_INSUMO.map((c) => `<option ${(i?.categoria || "Otros") === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div><label class="label">Vencimiento (opcional)</label><input class="input" name="vencimiento" type="date" value="${esc(i?.vencimiento ?? "")}" oninput="vencimientoManual(this)" /><small id="venc-hint" style="opacity:.75;"></small></div>
      <div><label class="label">Stock mínimo (alerta)</label><input class="input" name="stock_minimo" type="number" min="0" step="0.001" value="${i?.stock_minimo ?? 0}" /></div>
      <div><label class="label">Costo por unidad</label><input class="input" name="costo_unitario" type="number" min="0" step="0.01" value="${i?.costo_unitario ?? 0}" /></div>
      <label style="display:flex; align-items:center; gap:.5rem; font-weight:700;"><input type="checkbox" name="activo" ${i?.activo === false ? "" : "checked"} style="width:auto;" /> Activo</label>
      ${i ? `<p class="ancho" style="font-size:.8rem; opacity:.7; margin:0;">El stock no se edita acá: usá "Movimiento" para que quede registrado quién y por qué.</p>` : ""}
      <div id="form-insumo-error" class="ancho"></div>
      <div class="ancho" style="display:flex; gap:.5rem;">
        <button class="btn-primary" type="submit">${i ? "Guardar" : "Crear insumo"}</button>
        <button class="btn-ghost" type="button" onclick="cerrarModal()">Cancelar</button>
      </div>
    </form>`);
  sugerirVencimiento(document.querySelector("#modal-fondo select[name=categoria]")); // existente de Verduras sin fecha: propone la estimada
}

async function guardarInsumo(e) {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  const body = { nombre: fd.nombre, unidad: fd.unidad, stock_minimo: Number(fd.stock_minimo), costo_unitario: Number(fd.costo_unitario), activo: fd.activo === "on", categoria: fd.categoria, vencimiento: fd.vencimiento || "" };
  if (!fd._id) body.stock_actual = Number(fd.stock_actual || 0);
  try {
    if (fd._id) await apiPut(`/insumos/${fd._id}`, body); else await apiPost("/insumos", body);
    cerrarModal();
    toast("Insumo guardado");
    await cargarInsumos();
  } catch (err) { document.getElementById("form-insumo-error").innerHTML = `<p class="msg-error">${esc(err.message)}</p>`; }
}

function abrirMovimiento(id) {
  const i = insumosCache.find((x) => x._id === id);
  abrirModal("Movimiento de stock", `
    <form class="card form-grid" onsubmit="guardarMovimiento(event,'${id}')">
      <div class="ancho" style="font-weight:800;">Movimiento de stock · ${esc(i.nombre)} (actual: ${fmtNum(i.stock_actual)} ${i.unidad})</div>
      <div><label class="label">Tipo</label>
        <select class="input" name="tipo"><option value="ingreso">Ingreso (compra / reposición)</option><option value="egreso">Egreso (merma / vencido)</option><option value="ajuste">Ajuste (stock real contado)</option></select></div>
      <div><label class="label">Cantidad (${i.unidad})</label><input class="input" name="cantidad" type="number" min="0" step="0.001" required /></div>
      <div><label class="label">Vencimiento del lote nuevo (solo ingresos, opcional)</label><input class="input" name="vencimiento" type="date" value="${i.categoria === "Verduras" ? fechaEn(DIAS_VENCIMIENTO_VERDURAS) : ""}" /><small style="opacity:.75;">${i.categoria === "Verduras" ? MSG_VERDURAS : ""}</small></div>
      <div class="ancho"><label class="label">Motivo</label><input class="input" name="motivo" maxlength="200" placeholder="Compra proveedor, vencido, conteo del viernes..." /></div>
      <div id="form-insumo-error" class="ancho"></div>
      <div class="ancho" style="display:flex; gap:.5rem;">
        <button class="btn-primary" type="submit">Registrar</button>
        <button class="btn-ghost" type="button" onclick="cerrarModal()">Cancelar</button>
      </div>
    </form>`);
}

async function guardarMovimiento(e, id) {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  try {
    await apiPost(`/insumos/${id}/movimiento`, { tipo: fd.tipo, cantidad: Number(fd.cantidad), motivo: fd.motivo, ...(fd.tipo === "ingreso" && fd.vencimiento ? { vencimiento: fd.vencimiento } : {}) });
    cerrarModal();
    toast("Movimiento registrado");
    await cargarInsumos();
  } catch (err) { document.getElementById("form-insumo-error").innerHTML = `<p class="msg-error">${esc(err.message)}</p>`; }
}

async function verMovimientos(id) {
  const i = insumosCache.find((x) => x._id === id);
  const movs = await apiGet(`/insumos/movimientos?insumo=${id}`);
  const SIGNO = { ingreso: "+", reposicion: "+", egreso: "−", consumo: "−", ajuste: "=" };
  abrirModal(`Historial · ${esc(i.nombre)}`, `
    <div class="tabla-scroll"><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Queda</th><th>Motivo</th><th>Quién</th></tr></thead>
      <tbody>${movs.map((m) => `<tr><td>${fmtFechaHora(m.createdAt)}</td><td>${esc(m.tipo)}</td><td>${SIGNO[m.tipo] ?? ""}${fmtNum(m.cantidad)}</td><td>${fmtNum(m.stock_resultante)}</td><td>${esc(m.motivo)}</td><td>${esc(m.por)}</td></tr>`).join("") || `<tr><td colspan="6" style="opacity:.6;">Sin movimientos.</td></tr>`}</tbody>
    </table></div>`, { ancho: "64rem" });
}

async function borrarInsumo(id) {
  if (!confirm("¿Borrar este insumo?")) return;
  try { await apiDelete(`/insumos/${id}`); toast("Insumo eliminado"); await cargarInsumos(); }
  catch (err) { toast(err.message, "error"); }
}
