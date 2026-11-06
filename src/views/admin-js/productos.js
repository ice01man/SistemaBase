// Pestaña "Platos y recetas": alta/edición de platos del menú y de la receta de cada uno
// (qué insumos y cuánto consume UNA porción: con eso el corte de producción descuenta el stock).
let productosCache = [];
let insumosParaReceta = [];
let margenObjetivo = 30;

// Mismo cálculo que el servidor (src/services/precios.js): SOLO para la vista previa mientras se edita.
// Lo que vale es lo que devuelve el servidor al guardar.
//   Precio sugerido = Costo / (1 − margen)   (margen REAL sobre el precio de venta, NO costo × 1,30)
const sugeridoDe = (costo, m = margenObjetivo) => (costo > 0 ? Math.ceil(costo / (1 - m / 100) / 10 - 1e-9) * 10 : 0);
const margenDe = (precio, costo) => (precio > 0 ? ((precio - costo) / precio) * 100 : null);
const pct1 = (n) => (n === null || n === undefined ? "—" : `${n.toFixed(1).replace(".", ",")} %`);
const colorMargen = (m) => (m === null ? "" : m >= margenObjetivo ? "color:#166534" : m >= 0 ? "color:#b45309" : "color:#b91c1c");

async function cargarProductos() {
  let cfg;
  [productosCache, insumosParaReceta, cfg] = await Promise.all([apiGet("/products/admin"), apiGet("/insumos"), apiGet("/config/admin")]);
  insumosParaReceta.sort((x, y) => x.nombre.localeCompare(y.nombre, "es", { sensitivity: "base" }));
  margenObjetivo = cfg.margenObjetivo ?? 30;
  renderProductos();
}

// Celda de precio con su margen real debajo. Precio vacío (0) = "se cobra el público".
function celdaPrecio(precio, margen) {
  if (!(precio > 0)) return `<td style="opacity:.5;" title="Sin precio cargado: se cobra el público">=</td>`;
  return `<td><strong>${fmtPrecio(precio)}</strong>${margen === null ? "" : `<br><small style="font-weight:800; ${colorMargen(margen)}">${pct1(margen)}</small>`}</td>`;
}

function renderProductos() {
  document.getElementById("tab-productos").innerHTML = `
    <div class="barra-herramientas">
      <h2 class="seccion-titulo">Platos y recetas</h2>
      <button class="btn-orange" onclick="abrirFormProducto()">+ Nuevo plato</button>
    </div>
    <div class="card tabla-scroll" style="margin-top:1rem;"><table>
      <thead><tr><th>Nombre</th><th>Costo</th><th>Sugerido <small>(${margenObjetivo} %)</small></th><th>Público</th><th>Empresa</th><th>Con desc.</th><th>Estado</th><th></th></tr></thead>
      <tbody>${productosCache.map((p) => `
        <tr>
          <td><strong>${esc(p.name)}</strong>${p.soloEmpresas ? ` <span class="badge" style="background:#ede9fe;color:#5b21b6;">🏢 Solo empresas</span>` : ""}<br><small style="opacity:.7; text-transform:capitalize;">${esc(DIA_LABEL[p.day] ?? p.day)} · ${esc(p.category)}${(p.receta || []).length ? "" : ` · <span style="color:#92400e;">⚠ sin receta</span>`}</small></td>
          <td>${p.costo > 0 ? fmtPrecio(p.costo) : "—"}${p.costoIncompleto && p.costo > 0 ? ` <span title="Hay insumos sin costo cargado: el costo real es mayor">⚠</span>` : ""}</td>
          <td>${p.precioSugerido ? fmtPrecio(p.precioSugerido) : "—"}</td>
          ${celdaPrecio(p.price, p.costo > 0 ? p.margenReal : null)}
          ${celdaPrecio(p.precioEmpresa, p.costo > 0 ? p.margenEmpresa : null)}
          ${celdaPrecio(p.precioDescuento, p.costo > 0 ? p.margenDescuento : null)}
          <td><span class="badge" style="${p.activo === false ? "background:#fee2e2;color:#b91c1c" : "background:#dcfce7;color:#166534"}">${p.activo === false ? "Inactivo" : "Activo"}</span></td>
          <td style="white-space:nowrap;">
            <button class="btn-icono" title="Editar" onclick="abrirFormProducto('${p._id}')">✏️</button>
            <button class="btn-icono" title="${p.activo === false ? "Activar (mostrar en el menú)" : "Desactivar (ocultar del menú)"}" onclick="toggleActivo('${p._id}', ${p.activo === false})">${p.activo === false ? "▶️" : "⏸️"}</button>
            <button class="btn-icono peligro" title="Borrar" onclick="borrarProducto('${p._id}')">🗑️</button>
          </td>
        </tr>`).join("")}
      </tbody></table></div>`;
}

function filaReceta(r = {}) {
  const opciones = insumosParaReceta.filter((i) => i.activo !== false || i._id === r.insumo)
    .map((i) => `<option value="${i._id}" ${i._id === r.insumo ? "selected" : ""}>${esc(i.nombre)} · ${fmtPrecio(i.costo_unitario || 0)}/${i.unidad}</option>`).join("");
  return `<div class="receta-fila">
    <select class="input r-insumo" onchange="recalcularReceta()"><option value="">— elegí un insumo —</option>${opciones}</select>
    <input class="input r-cant" type="number" min="0" step="0.001" placeholder="cantidad por porción" value="${r.cantidad ?? ""}" oninput="recalcularReceta()" />
    <span class="r-info" style="font-size:.8rem; min-width:9rem; opacity:.85;"></span>
    <button type="button" class="btn-icono peligro" title="Quitar insumo" onclick="this.parentElement.remove(); recalcularReceta()">🗑️</button>
  </div>`;
}

function agregarFilaReceta() {
  document.getElementById("receta-filas").insertAdjacentHTML("beforeend", filaReceta());
  recalcularReceta();
}

// Insumos que no son "ingredientes" para el cliente (no tiene sentido mostrarle "Envases"). Igual que en el servidor.
const NO_INGREDIENTE = /envase|bolsa|descartable|servilleta|cubierto|film|etiqueta/i;

function filasDeReceta() {
  return [...document.querySelectorAll("#receta-filas .receta-fila")].map((f) => {
    const i = insumosParaReceta.find((x) => x._id === f.querySelector(".r-insumo").value);
    return { fila: f, insumo: i, cantidad: Number(f.querySelector(".r-cant").value) || 0 };
  });
}

// Recalcula costo, sugerido y márgenes al instante, mientras se arma la receta.
function recalcularReceta() {
  let costo = 0, sinCosto = false;
  const nombres = [];
  for (const { fila, insumo, cantidad } of filasDeReceta()) {
    const info = fila.querySelector(".r-info");
    if (!insumo) { info.textContent = ""; continue; }
    const sub = cantidad * (insumo.costo_unitario || 0);
    costo += sub;
    if (!insumo.costo_unitario) sinCosto = true;
    info.innerHTML = `${cantidad || 0} ${esc(insumo.unidad)} → <strong>${fmtPrecio(Math.round(sub * 100) / 100)}</strong>`;
    if (!NO_INGREDIENTE.test(insumo.nombre) && !nombres.includes(insumo.nombre)) nombres.push(insumo.nombre);
  }
  costo = Math.round(costo * 100) / 100;
  const form = document.getElementById("form-producto");
  if (!form) return;
  const sug = sugeridoDe(costo);
  document.getElementById("receta-resumen").innerHTML = costo > 0 ? `
    <div class="precio-cajas">
      <div><small>Costo por porción</small><strong>${fmtPrecio(costo)}</strong></div>
      <div><small>Precio sugerido (${margenObjetivo} % real)</small><strong>${fmtPrecio(sug)}</strong></div>
    </div>
    <p style="font-size:.75rem; opacity:.75; margin:.4rem 0 0;">Es solo una referencia: sugerido = costo ÷ (1 − ${margenObjetivo} %) = costo ÷ ${(1 - margenObjetivo / 100).toFixed(2).replace(".", ",")}, redondeado a $10. El margen se calcula sobre el precio de venta, no sobre el costo.
      ${sinCosto ? `<br><span class="msg-error">⚠ Hay insumos sin costo cargado: el costo real es mayor. Cargalo en la pestaña Insumos.</span>` : ""}</p>`
    : `<p style="font-size:.8rem; opacity:.7; margin:0;">Elegí insumos y cantidades para calcular el costo.</p>`;
  // Margen real de cada precio de venta (sobre el precio, no sobre el costo)
  for (const [campo, id] of [["price", "m-price"], ["precioEmpresa", "m-empresa"], ["precioDescuento", "m-descuento"]]) {
    const v = Number(form.elements[campo].value) || 0;
    const m = v > 0 && costo > 0 ? margenDe(v, costo) : null;
    document.getElementById(id).innerHTML = v > 0 && costo > 0 ? `Margen real: <strong style="${colorMargen(m)}">${pct1(m)}</strong>` : v > 0 ? "" : (campo === "price" ? "" : "Vacío = se cobra el público");
  }
  // "Ingredientes que ve el cliente": salen SIEMPRE de los insumos de la receta (no se escriben a mano).
  const campo = form.elements.ingredientsCsv;
  if (nombres.length) { campo.value = nombres.join(", "); campo.readOnly = true; }
  else { campo.readOnly = false; }
}

function abrirFormProducto(id) {
  const p = id ? productosCache.find((x) => x._id === id) : null;
  abrirModal(p ? `Editar plato · ${esc(p.name)}` : "Nuevo plato", `
    <form id="form-producto" class="card form-grid" onsubmit="guardarProducto(event)">
      <input type="hidden" name="_id" value="${p?._id ?? ""}" />
      <div><label class="label">Nombre</label><input class="input" name="name" value="${esc(p?.name ?? "")}" required maxlength="100" /></div>
      <div><label class="label">Categoría</label>
        <select class="input" name="category">${["Gourmet", "Vegano", "Sandwich", "Del Día"].map((c) => `<option ${p?.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div><label class="label">Día</label>
        <select class="input" name="day">${DIAS.map((d) => `<option value="${d}" ${p?.day === d ? "selected" : ""}>${DIA_LABEL[d]}</option>`).join("")}</select></div>
            <div class="ancho"><label class="label">Descripción</label><input class="input" name="description" value="${esc(p?.description ?? "")}" required maxlength="400" /></div>
      <div class="ancho"><label class="label">Ingredientes que ve el cliente</label><input class="input" name="ingredientsCsv" value="${esc((p?.ingredients || []).join(", "))}" /><p style="font-size:.75rem; opacity:.7; margin:.25rem 0 0;">Se completan solos con los insumos de la receta. Solo se escriben a mano si el plato no tiene receta.</p></div>
      <div class="ancho"><label class="label">URL de imagen</label><input class="input" name="image" value="${esc(p?.image ?? "")}" required /></div>
      <div class="ancho"><label class="label">Tags / dieta (coma, ej: Sin Gluten, 100% Vegano)</label><input class="input" name="tagsCsv" value="${esc((p?.tags || []).join(", "))}" /></div>
      <div><label class="label">Badge destacado (opcional)</label><input class="input" name="destacado" value="${esc(p?.destacado ?? "")}" /></div>
      <label style="display:flex; align-items:center; gap:.5rem; font-weight:700;"><input type="checkbox" name="soloEmpresas" ${p?.soloEmpresas ? "checked" : ""} style="width:auto;" /> 🏢 Solo para empresas (menú de empresas)</label>
      <label style="display:flex; align-items:center; gap:.5rem; font-weight:700;"><input type="checkbox" name="activo" ${p?.activo === false ? "" : "checked"} style="width:auto;" /> Activo (visible en el menú)</label>

      <div class="ancho"><label class="label">Receta · insumos que consume UNA porción</label>
        <div id="receta-filas">${(p?.receta || []).map(filaReceta).join("")}</div>
        <button type="button" class="btn-outline" style="font-size:.8rem;" onclick="agregarFilaReceta()">➕ Agregar insumo</button>
        <p style="font-size:.75rem; opacity:.7; margin:.4rem 0 0;">Los insumos y sus costos salen de la pestaña Insumos. Sin receta, el plato no descuenta stock ni calcula costo.</p>
        <div id="receta-resumen" class="card" style="margin-top:.6rem;"></div>
      </div>

      <div class="ancho"><label class="label">Precios de venta</label>
        <div class="precio-cajas">
          <div><label class="label">Precio público (cliente final) *</label><input class="input" name="price" type="number" min="0" value="${p?.price ?? ""}" required oninput="recalcularReceta()" /><small id="m-price"></small></div>
          <div><label class="label">Precio empresa</label><input class="input" name="precioEmpresa" type="number" min="0" value="${p?.precioEmpresa || ""}" oninput="recalcularReceta()" /><small id="m-empresa"></small></div>
          <div><label class="label">Precio con descuento</label><input class="input" name="precioDescuento" type="number" min="0" value="${p?.precioDescuento || ""}" oninput="recalcularReceta()" /><small id="m-descuento"></small></div>
        </div>
        <p style="font-size:.75rem; opacity:.7; margin:.4rem 0 0;">Cada cliente toma el precio de su tipo (se asigna en Usuarios). Si dejás vacío empresa o con descuento, se le cobra el público.</p>
      </div>

      <div id="form-producto-error" class="ancho"></div>
      <div class="ancho" style="display:flex; gap:.5rem;">
        <button class="btn-primary" type="submit">${p ? "Guardar cambios" : "Crear plato"}</button>
        <button class="btn-ghost" type="button" onclick="cerrarModal()">Cancelar</button>
      </div>
    </form>`, { ancho: "62rem" });
  recalcularReceta();
}

async function guardarProducto(e) {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  const receta = [...document.querySelectorAll("#receta-filas .receta-fila")]
    .map((f) => ({ insumo: f.querySelector(".r-insumo").value, cantidad: Number(f.querySelector(".r-cant").value) }))
    .filter((r) => r.insumo || r.cantidad);
  const body = {
    name: fd.name, category: fd.category, day: fd.day, description: fd.description, image: fd.image,
    price: Number(fd.price),
    precioEmpresa: Number(fd.precioEmpresa) || 0,
    precioDescuento: Number(fd.precioDescuento) || 0,
    ingredients: fd.ingredientsCsv.split(",").map((s) => s.trim()).filter(Boolean),
    tags: fd.tagsCsv.split(",").map((s) => s.trim()).filter(Boolean),
    destacado: fd.destacado || null,
    activo: fd.activo === "on",
    soloEmpresas: fd.soloEmpresas === "on",
    receta,
  };
  try {
    if (fd._id) await apiPut(`/products/${fd._id}`, body);
    else await apiPost("/products", body);
    cerrarModal();
    toast("Plato guardado");
    await cargarProductos();
  } catch (err) {
    document.getElementById("form-producto-error").innerHTML = `<p class="msg-error">${esc(err.message)}</p>`;
  }
}

async function toggleActivo(id, nuevoValor) {
  try { await apiPut(`/products/${id}`, { activo: nuevoValor }); await cargarProductos(); }
  catch (err) { toast(err.message, "error"); }
}

async function borrarProducto(id) {
  if (!confirm("¿Borrar este plato? (Los pedidos viejos conservan su nombre y precio.)")) return;
  try { await apiDelete(`/products/${id}`); await cargarProductos(); }
  catch (err) { toast(err.message, "error"); }
}
