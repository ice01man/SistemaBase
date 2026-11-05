// Pestaña "Insumos y stock": catálogo de insumos, alertas, movimientos y su historial.
let insumosCache = [];

async function cargarInsumos() {
  insumosCache = await apiGet("/insumos");
  const bajos = insumosCache.filter((i) => i.bajoMinimo);
  const valor = insumosCache.reduce((a, i) => a + i.stock_actual * i.costo_unitario, 0);
  document.getElementById("tab-insumos").innerHTML = `
    <div class="barra-herramientas">
      <h2 class="seccion-titulo">Insumos y stock</h2>
      <button class="btn-orange" onclick="abrirFormInsumo()">+ Nuevo insumo</button>
    </div>
    <div class="stats" style="margin-top:1rem;">
      <div class="stat"><div class="valor">${insumosCache.length}</div><div class="rotulo">Insumos</div></div>
      <div class="stat ${bajos.length ? "alerta" : ""}"><div class="valor">${bajos.length}</div><div class="rotulo">Bajo mínimo</div></div>
      <div class="stat"><div class="valor">${fmtPrecio(valor)}</div><div class="rotulo">Valor del stock</div></div>
    </div>
    <div id="form-insumo-cont" style="margin-top:1rem;"></div>
    <div class="card tabla-scroll" style="margin-top:1rem;"><table>
      <thead><tr><th>Insumo</th><th>Stock</th><th>Mínimo</th><th>Costo unit.</th><th>Estado</th><th></th></tr></thead>
      <tbody>${insumosCache.map((i) => `
        <tr class="${i.bajoMinimo ? "fila-bajo" : ""}">
          <td>${esc(i.nombre)}</td>
          <td><b>${fmtNum(i.stock_actual)}</b> ${i.unidad}</td>
          <td>${fmtNum(i.stock_minimo)} ${i.unidad}</td>
          <td>${fmtPrecio(i.costo_unitario)}</td>
          <td>${i.activo === false ? "Inactivo" : i.bajoMinimo ? `<span class="badge" style="background:#fee2e2;color:#b91c1c;">Bajo mínimo</span>` : `<span class="badge" style="background:#dcfce7;color:#166534;">OK</span>`}</td>
          <td style="white-space:nowrap;">
            <button class="btn-ghost" style="font-size:.75rem;" onclick="abrirMovimiento('${i._id}')">Movimiento</button>
            <button class="btn-ghost" style="font-size:.75rem;" onclick="verMovimientos('${i._id}')">Historial</button>
            <button class="btn-ghost" style="font-size:.75rem;" onclick="abrirFormInsumo('${i._id}')">Editar</button>
            <button class="btn-danger" style="font-size:.75rem;" onclick="borrarInsumo('${i._id}')">Borrar</button>
          </td>
        </tr>`).join("")}
      </tbody></table></div>
    <div id="historial-insumo" style="margin-top:1rem;"></div>`;
}

function abrirFormInsumo(id) {
  const i = id ? insumosCache.find((x) => x._id === id) : null;
  document.getElementById("form-insumo-cont").innerHTML = `
    <form class="card form-grid" onsubmit="guardarInsumo(event)">
      <input type="hidden" name="_id" value="${i?._id ?? ""}" />
      <div><label class="label">Nombre</label><input class="input" name="nombre" value="${esc(i?.nombre ?? "")}" required maxlength="80" /></div>
      <div><label class="label">Unidad</label>
        <select class="input" name="unidad">${["kg", "g", "l", "ml", "u"].map((u) => `<option ${i?.unidad === u ? "selected" : ""}>${u}</option>`).join("")}</select></div>
      ${i ? "" : `<div><label class="label">Stock inicial</label><input class="input" name="stock_actual" type="number" min="0" step="0.001" value="0" /></div>`}
      <div><label class="label">Stock mínimo (alerta)</label><input class="input" name="stock_minimo" type="number" min="0" step="0.001" value="${i?.stock_minimo ?? 0}" /></div>
      <div><label class="label">Costo por unidad</label><input class="input" name="costo_unitario" type="number" min="0" step="0.01" value="${i?.costo_unitario ?? 0}" /></div>
      <label style="display:flex; align-items:center; gap:.5rem; font-weight:700;"><input type="checkbox" name="activo" ${i?.activo === false ? "" : "checked"} style="width:auto;" /> Activo</label>
      ${i ? `<p class="ancho" style="font-size:.8rem; opacity:.7; margin:0;">El stock no se edita acá: usá "Movimiento" para que quede registrado quién y por qué.</p>` : ""}
      <div id="form-insumo-error" class="ancho"></div>
      <div class="ancho" style="display:flex; gap:.5rem;">
        <button class="btn-primary" type="submit">${i ? "Guardar" : "Crear insumo"}</button>
        <button class="btn-ghost" type="button" onclick="document.getElementById('form-insumo-cont').innerHTML=''">Cancelar</button>
      </div>
    </form>`;
}

async function guardarInsumo(e) {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  const body = { nombre: fd.nombre, unidad: fd.unidad, stock_minimo: Number(fd.stock_minimo), costo_unitario: Number(fd.costo_unitario), activo: fd.activo === "on" };
  if (!fd._id) body.stock_actual = Number(fd.stock_actual || 0);
  try {
    if (fd._id) await apiPut(`/insumos/${fd._id}`, body); else await apiPost("/insumos", body);
    toast("Insumo guardado");
    await cargarInsumos();
  } catch (err) { document.getElementById("form-insumo-error").innerHTML = `<p class="msg-error">${esc(err.message)}</p>`; }
}

function abrirMovimiento(id) {
  const i = insumosCache.find((x) => x._id === id);
  document.getElementById("form-insumo-cont").innerHTML = `
    <form class="card form-grid" onsubmit="guardarMovimiento(event,'${id}')">
      <div class="ancho" style="font-weight:800;">Movimiento de stock · ${esc(i.nombre)} (actual: ${fmtNum(i.stock_actual)} ${i.unidad})</div>
      <div><label class="label">Tipo</label>
        <select class="input" name="tipo"><option value="ingreso">Ingreso (compra / reposición)</option><option value="egreso">Egreso (merma / vencido)</option><option value="ajuste">Ajuste (stock real contado)</option></select></div>
      <div><label class="label">Cantidad (${i.unidad})</label><input class="input" name="cantidad" type="number" min="0" step="0.001" required /></div>
      <div class="ancho"><label class="label">Motivo</label><input class="input" name="motivo" maxlength="200" placeholder="Compra proveedor, vencido, conteo del viernes..." /></div>
      <div id="form-insumo-error" class="ancho"></div>
      <div class="ancho" style="display:flex; gap:.5rem;">
        <button class="btn-primary" type="submit">Registrar</button>
        <button class="btn-ghost" type="button" onclick="document.getElementById('form-insumo-cont').innerHTML=''">Cancelar</button>
      </div>
    </form>`;
}

async function guardarMovimiento(e, id) {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  try {
    await apiPost(`/insumos/${id}/movimiento`, { tipo: fd.tipo, cantidad: Number(fd.cantidad), motivo: fd.motivo });
    toast("Movimiento registrado");
    await cargarInsumos();
  } catch (err) { document.getElementById("form-insumo-error").innerHTML = `<p class="msg-error">${esc(err.message)}</p>`; }
}

async function verMovimientos(id) {
  const i = insumosCache.find((x) => x._id === id);
  const movs = await apiGet(`/insumos/movimientos?insumo=${id}`);
  const SIGNO = { ingreso: "+", reposicion: "+", egreso: "−", consumo: "−", ajuste: "=" };
  document.getElementById("historial-insumo").innerHTML = `
    <div class="card tabla-scroll"><h3 style="margin:0 0 .5rem;">Historial · ${esc(i.nombre)}</h3><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Queda</th><th>Motivo</th><th>Quién</th></tr></thead>
      <tbody>${movs.map((m) => `<tr><td>${fmtFechaHora(m.createdAt)}</td><td>${esc(m.tipo)}</td><td>${SIGNO[m.tipo] ?? ""}${fmtNum(m.cantidad)}</td><td>${fmtNum(m.stock_resultante)}</td><td>${esc(m.motivo)}</td><td>${esc(m.por)}</td></tr>`).join("") || `<tr><td colspan="6" style="opacity:.6;">Sin movimientos.</td></tr>`}</tbody>
    </table></div>`;
  document.getElementById("historial-insumo").scrollIntoView({ behavior: "smooth" });
}

async function borrarInsumo(id) {
  if (!confirm("¿Borrar este insumo?")) return;
  try { await apiDelete(`/insumos/${id}`); toast("Insumo eliminado"); await cargarInsumos(); }
  catch (err) { toast(err.message, "error"); }
}
