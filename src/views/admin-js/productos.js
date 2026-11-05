// Pestaña "Platos y recetas": alta/edición de platos del menú y de la receta de cada uno
// (qué insumos y cuánto consume UNA porción: con eso el corte de producción descuenta el stock).
let productosCache = [];
let insumosParaReceta = [];

async function cargarProductos() {
  [productosCache, insumosParaReceta] = await Promise.all([apiGet("/products/admin"), apiGet("/insumos")]);
  renderProductos();
}

function renderProductos() {
  document.getElementById("tab-productos").innerHTML = `
    <div class="barra-herramientas">
      <h2 class="seccion-titulo">Platos y recetas</h2>
      <button class="btn-orange" onclick="abrirFormProducto()">+ Nuevo plato</button>
    </div>
    <div id="form-producto-cont" style="margin-top:1rem;"></div>
    <div class="card tabla-scroll" style="margin-top:1rem;"><table>
      <thead><tr><th>Nombre</th><th>Categoría</th><th>Día</th><th>Precio</th><th>Receta</th><th>Estado</th><th></th></tr></thead>
      <tbody>${productosCache.map((p) => `
        <tr>
          <td>${esc(p.name)}</td>
          <td>${esc(p.category)}</td>
          <td style="text-transform:capitalize;">${esc(DIA_LABEL[p.day] ?? p.day)}</td>
          <td>${fmtPrecio(p.price)}</td>
          <td>${(p.receta || []).length ? `${p.receta.length} insumos` : `<span class="badge" style="background:#fef3c7;color:#92400e;">Sin receta</span>`}</td>
          <td><span class="badge" style="${p.activo === false ? "background:#fee2e2;color:#b91c1c" : "background:#dcfce7;color:#166534"}">${p.activo === false ? "Inactivo" : "Activo"}</span></td>
          <td style="white-space:nowrap;">
            <button class="btn-ghost" style="font-size:.75rem;" onclick="abrirFormProducto('${p._id}')">Editar</button>
            <button class="btn-outline" style="font-size:.75rem;" onclick="toggleActivo('${p._id}', ${p.activo === false})">${p.activo === false ? "Activar" : "Desactivar"}</button>
            <button class="btn-danger" style="font-size:.75rem;" onclick="borrarProducto('${p._id}')">Borrar</button>
          </td>
        </tr>`).join("")}
      </tbody></table></div>`;
}

function filaReceta(r = {}) {
  const opciones = insumosParaReceta.filter((i) => i.activo !== false || i._id === r.insumo)
    .map((i) => `<option value="${i._id}" ${i._id === r.insumo ? "selected" : ""}>${esc(i.nombre)} (${i.unidad})</option>`).join("");
  return `<div class="receta-fila">
    <select class="input r-insumo"><option value="">— insumo —</option>${opciones}</select>
    <input class="input r-cant" type="number" min="0" step="0.001" placeholder="por porción" value="${r.cantidad ?? ""}" />
    <button type="button" class="btn-ghost" onclick="this.parentElement.remove()">✕</button>
  </div>`;
}

function agregarFilaReceta() {
  document.getElementById("receta-filas").insertAdjacentHTML("beforeend", filaReceta());
}

function abrirFormProducto(id) {
  const p = id ? productosCache.find((x) => x._id === id) : null;
  document.getElementById("form-producto-cont").innerHTML = `
    <form id="form-producto" class="card form-grid" onsubmit="guardarProducto(event)">
      <input type="hidden" name="_id" value="${p?._id ?? ""}" />
      <div><label class="label">Nombre</label><input class="input" name="name" value="${esc(p?.name ?? "")}" required maxlength="100" /></div>
      <div><label class="label">Categoría</label>
        <select class="input" name="category">${["Gourmet", "Vegano", "Sandwich", "Del Día"].map((c) => `<option ${p?.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div><label class="label">Día</label>
        <select class="input" name="day">${DIAS.map((d) => `<option value="${d}" ${p?.day === d ? "selected" : ""}>${DIA_LABEL[d]}</option>`).join("")}</select></div>
      <div><label class="label">Precio</label><input class="input" name="price" type="number" min="0" value="${p?.price ?? ""}" required /></div>
      <div class="ancho"><label class="label">Descripción</label><input class="input" name="description" value="${esc(p?.description ?? "")}" required maxlength="400" /></div>
      <div class="ancho"><label class="label">Ingredientes que ve el cliente (separados por coma)</label><input class="input" name="ingredientsCsv" value="${esc((p?.ingredients || []).join(", "))}" /></div>
      <div class="ancho"><label class="label">URL de imagen</label><input class="input" name="image" value="${esc(p?.image ?? "")}" required /></div>
      <div class="ancho"><label class="label">Tags / dieta (coma, ej: Sin Gluten, 100% Vegano)</label><input class="input" name="tagsCsv" value="${esc((p?.tags || []).join(", "))}" /></div>
      <div><label class="label">Badge destacado (opcional)</label><input class="input" name="destacado" value="${esc(p?.destacado ?? "")}" /></div>
      <label style="display:flex; align-items:center; gap:.5rem; font-weight:700;"><input type="checkbox" name="activo" ${p?.activo === false ? "" : "checked"} style="width:auto;" /> Activo (visible en el menú)</label>

      <div class="ancho"><label class="label">Receta · insumos que consume UNA porción</label>
        <div id="receta-filas">${(p?.receta || []).map(filaReceta).join("")}</div>
        <button type="button" class="btn-outline" style="font-size:.8rem;" onclick="agregarFilaReceta()">+ Agregar insumo</button>
        <p style="font-size:.75rem; opacity:.7; margin:.4rem 0 0;">Sin receta, el plato no descuenta stock en el corte de producción.</p>
      </div>

      <div id="form-producto-error" class="ancho"></div>
      <div class="ancho" style="display:flex; gap:.5rem;">
        <button class="btn-primary" type="submit">${p ? "Guardar cambios" : "Crear plato"}</button>
        <button class="btn-ghost" type="button" onclick="document.getElementById('form-producto-cont').innerHTML=''">Cancelar</button>
      </div>
    </form>`;
  document.getElementById("form-producto").scrollIntoView({ behavior: "smooth" });
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
    ingredients: fd.ingredientsCsv.split(",").map((s) => s.trim()).filter(Boolean),
    tags: fd.tagsCsv.split(",").map((s) => s.trim()).filter(Boolean),
    destacado: fd.destacado || null,
    activo: fd.activo === "on",
    receta,
  };
  try {
    if (fd._id) await apiPut(`/products/${fd._id}`, body);
    else await apiPost("/products", body);
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
