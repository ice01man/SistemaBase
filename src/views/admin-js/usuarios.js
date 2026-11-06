// Pestaña "Usuarios": alta, edición, cambio de rol, activar/desactivar y baja.
let usuariosCache = [];
const TIPO_LABEL = { final: "Cliente final", empresa: "Empresa", descuento: "Con descuento" };
const TIPO_ESTILO = { final: "background:#e0f2fe;color:#075985", empresa: "background:#ede9fe;color:#5b21b6", descuento: "background:#fef3c7;color:#92400e" };

let zonasCfg = [];           // zonas de reparto creadas en Ajustes
let filtroUsuarios = "";     // "" = todos, "sinzona" = clientes sin zona
const esCliente = (u) => u.rol === "cliente";
const esNuevo = (u) => u.createdAt && Date.now() - new Date(u.createdAt).getTime() < 7 * 86400000; // creado en la última semana
const sinZona = (u) => esCliente(u) && u.activo !== false && !u.zona;
const reparte = (u) => u.rol === "reparto" || u.rol === "user";

// Celda "Zona": el cliente tiene un selector directo (asignar sin abrir el formulario); el repartidor muestra las zonas que cubre.
function celdaZona(u) {
  if (esCliente(u)) {
    const aviso = sinZona(u) ? `<span class="badge" style="background:#ffedd5;color:#c2410c;">${esNuevo(u) ? "🆕 Nuevo · asignar zona" : "⚠️ Sin zona"}</span><br>` : "";
    // Solo informativo: la zona se cambia desde ✏️ Editar (el aviso abre directamente el formulario).
    if (aviso) return aviso.replace("<span ", `<span style="cursor:pointer;" title="Clic para asignar la zona" onclick="abrirFormUsuario('${u._id}')" `).replace("</span><br>", "</span>");
    return u.zona ? `🗺️ ${esc(u.zona)}` : "—";
  }
  if (reparte(u)) {
    if (!zonasCfg.length) return "—";
    return (u.zonasReparto || []).length ? `🛵 ${u.zonasReparto.map(esc).join(", ")}` : `<span class="badge" style="background:#ffedd5;color:#c2410c;">⚠️ Sin zonas</span>`;
  }
  return "—";
}

async function cargarUsuarios() {
  const [usuarios, cfg] = await Promise.all([apiGet("/users"), apiGet("/config/admin")]);
  zonasCfg = cfg.zonas || [];
  usuariosCache = usuarios;
  const pendientes = usuariosCache.filter(sinZona).length;
  let lista = filtroUsuarios === "sinzona" ? usuariosCache.filter(sinZona) : [...usuariosCache];
  // Los clientes sin zona van primero (hay que atenderlos); después, por nombre.
  lista.sort((a, b) => (zonasCfg.length ? sinZona(b) - sinZona(a) : 0) || a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  document.getElementById("tab-usuarios").innerHTML = `
    <div class="barra-herramientas">
      <h2 class="seccion-titulo">Usuarios</h2>
      <button class="btn-orange" onclick="abrirFormUsuario()">+ Nuevo usuario</button>
    </div>
    ${pendientes ? `<div class="aviso-zona" style="margin-top:1rem;">
      ${zonasCfg.length
        ? `<b>🆕 ${pendientes} cliente${pendientes === 1 ? "" : "s"} sin zona de entrega.</b> Asignale una zona a cada uno: sin zona, su pedido no le llega a ningún repartidor.`
        : `<b>⚠️ Hay ${pendientes} cliente${pendientes === 1 ? "" : "s"} sin zona, pero todavía no creaste ninguna zona.</b> Creá las zonas en <u style="cursor:pointer;" onclick="irATab('ajustes')">Ajustes → Zonas de reparto</u>.`}
      <div style="margin-top:.4rem;">
        <button class="chip ${filtroUsuarios === "" ? "activo" : ""}" onclick="filtroUsuarios=''; cargarUsuarios()">Todos (${usuariosCache.length})</button>
        <button class="chip ${filtroUsuarios === "sinzona" ? "activo" : ""}" onclick="filtroUsuarios='sinzona'; cargarUsuarios()">⚠️ Sin zona (${pendientes})</button>
      </div></div>` : ""}
    <div class="card tabla-scroll" style="margin-top:1rem;"><table>
      <thead><tr><th>Nombre</th><th>Rol</th><th>Zona</th><th>Tipo · Teléfono</th><th>Estado</th><th></th></tr></thead>
      <tbody>${lista.map((u) => `
        <tr class="${zonasCfg.length && sinZona(u) ? "fila-aviso" : ""}">
          <td>${esc(u.nombre)}<br><small style="opacity:.7;">${esc(u.email)}</small></td>
          <td>${esc(ROL_LABEL[u.rol] ?? u.rol)}</td>
          <td>${celdaZona(u)}</td>
          <td>${u.rol === "cliente" || u.rol === "admin" ? `<span class="badge" style="${TIPO_ESTILO[u.tipoCliente || "final"]}">${TIPO_LABEL[u.tipoCliente || "final"]}</span>${u.empresa ? `<br><small>${esc(u.empresa)}</small>` : ""}` : "—"}${u.telefono ? `<br><small>${esc(u.telefono)}</small>` : ""}</td>
          <td><span class="badge" style="${u.activo === false ? "background:#fee2e2;color:#b91c1c" : "background:#dcfce7;color:#166534"}">${u.activo === false ? "Inactivo" : "Activo"}</span></td>
          <td style="white-space:nowrap;">
            <button class="btn-icono" title="Editar" onclick="abrirFormUsuario('${u._id}')">✏️</button>
            ${u._id === usuarioActual.id ? "" : `
              <button class="btn-icono" title="${u.activo === false ? "Activar usuario" : "Desactivar usuario (no podrá ingresar)"}" onclick="activarUsuario('${u._id}', ${u.activo === false})">${u.activo === false ? "▶️" : "⏸️"}</button>
              <button class="btn-icono peligro" title="Borrar" onclick="borrarUsuario('${u._id}')">🗑️</button>`}
          </td>
        </tr>`).join("") || `<tr><td colspan="6" style="opacity:.6; text-align:center;">No hay usuarios con ese filtro.</td></tr>`}
      </tbody></table></div>`;
}

async function asignarZona(id, zona) {
  try { await apiPut(`/users/${id}`, { zona }); toast(zona ? `Zona asignada: ${zona}` : "Zona quitada"); await cargarUsuarios(); }
  catch (err) { toast(err.message, "error"); await cargarUsuarios(); }
}

// Muestra el campo de zona (cliente) o las zonas que cubre (repartidor) según el rol elegido.
function alternarCamposRol(rol) {
  const z = document.getElementById("campo-zona"), zr = document.getElementById("campo-zonas-reparto");
  if (z) z.style.display = rol === "cliente" ? "" : "none";
  if (zr) zr.style.display = rol === "reparto" || rol === "user" ? "" : "none";
  // Al crear un usuario nuevo, el celular es obligatorio solo para clientes.
  const tel = document.querySelector("#modal-fondo input[name=telefono]"), nuevo = !document.querySelector("#modal-fondo input[name=_id]")?.value;
  if (tel) tel.required = nuevo && rol === "cliente";
  const mark = document.getElementById("tel-obligatorio"); if (mark) mark.textContent = nuevo && rol === "cliente" ? "*" : "";
}

function abrirFormUsuario(id) {
  const u = id ? usuariosCache.find((x) => x._id === id) : null;
  const esYo = u && u._id === usuarioActual.id;
  abrirModal(u ? `Editar usuario · ${esc(u.nombre)}` : "Nuevo usuario", `
    <form class="card form-grid" onsubmit="guardarUsuario(event)">
      <input type="hidden" name="_id" value="${u?._id ?? ""}" />
      <div><label class="label">Nombre</label><input class="input" name="nombre" value="${esc(u?.nombre ?? "")}" required maxlength="80" /></div>
      <div><label class="label">Email</label><input class="input" name="email" type="email" value="${esc(u?.email ?? "")}" required /></div>
      <div><label class="label">Rol</label>
        <select class="input" name="rol" ${esYo ? "disabled" : ""} onchange="alternarCamposRol(this.value)">
          ${Object.entries(ROL_LABEL).map(([k, v]) => `<option value="${k}" ${u?.rol === k ? "selected" : ""}>${v}${k === "user" ? " (cocina + reparto)" : ""}</option>`).join("")}
        </select>
        ${esYo ? `<p style="font-size:.75rem; opacity:.7; margin:.25rem 0 0;">No podés cambiar tu propio rol: pedile a otro administrador.</p>` : ""}</div>
      <div><label class="label">${u ? "Nueva contraseña (vacío = no cambia)" : "Contraseña (mín. 8)"}</label><input class="input" name="password" type="password" minlength="8" ${u ? "" : "required"} autocomplete="new-password" /></div>
      <div><label class="label">Celular <span id="tel-obligatorio">${!u && (u?.rol ?? "cliente") === "cliente" ? "*" : ""}</span></label><input class="input" name="telefono" type="tel" value="${esc(u?.telefono ?? "")}" maxlength="30" placeholder="Ej.: 11 2345 6789" ${!u ? "required" : ""} />
        <p style="font-size:.75rem; opacity:.7; margin:.25rem 0 0;">Con código de área: se usa para contactar al cliente por WhatsApp.</p></div>
      <div><label class="label">Dirección</label><input class="input" name="direccion" value="${esc(u?.direccion ?? "")}" maxlength="200" /></div>
      <div><label class="label">Tipo de cliente (lista de precios)</label>
        <select class="input" name="tipoCliente">
          ${[["final", "Cliente final → precio público"], ["empresa", "Empresa → precio empresa"], ["descuento", "Con descuento → precio con descuento"]].map(([k, v]) => `<option value="${k}" ${(u?.tipoCliente || "final") === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>
        <p style="font-size:.75rem; opacity:.7; margin:.25rem 0 0;">Decide qué precio de cada plato se le cobra en sus pedidos.</p></div>
      <div><label class="label">Empresa (si corresponde)</label><input class="input" name="empresa" value="${esc(u?.empresa ?? "")}" maxlength="80" placeholder="Nombre de la empresa" /></div>
      <div id="campo-zona" style="${(u?.rol ?? "cliente") === "cliente" ? "" : "display:none;"}"><label class="label">Zona de entrega</label>
        <select class="input" name="zona"><option value="">— Sin zona —</option>${zonasCfg.map((z) => `<option ${u?.zona === z ? "selected" : ""}>${esc(z)}</option>`).join("")}</select>
        <p style="font-size:.75rem; opacity:.7; margin:.25rem 0 0;">${zonasCfg.length ? "Decide a qué repartidor le llegan sus pedidos." : "Todavía no hay zonas: creálas en Ajustes."}</p></div>
      <div id="campo-zonas-reparto" class="ancho" style="${["reparto", "user"].includes(u?.rol) ? "" : "display:none;"}"><label class="label">Zonas que reparte</label>
        ${zonasCfg.length ? zonasCfg.map((z) => `<label style="display:inline-flex; align-items:center; gap:.35rem; margin-right:1rem; font-weight:600;"><input type="checkbox" name="zonasReparto" value="${esc(z)}" ${(u?.zonasReparto || []).includes(z) ? "checked" : ""} style="width:auto;" /> ${esc(z)}</label>`).join("") : `<p style="font-size:.75rem; opacity:.7; margin:.25rem 0 0;">Todavía no hay zonas: creálas en Ajustes.</p>`}</div>
      <div id="form-usuario-error" class="ancho"></div>
      <div class="ancho" style="display:flex; gap:.5rem;">
        <button class="btn-primary" type="submit">${u ? "Guardar cambios" : "Crear usuario"}</button>
        <button class="btn-ghost" type="button" onclick="cerrarModal()">Cancelar</button>
      </div>
    </form>`);
}

async function guardarUsuario(e) {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  const body = { nombre: fd.nombre, email: fd.email, telefono: fd.telefono, direccion: fd.direccion,
    empresa: fd.empresa ?? "", tipoCliente: fd.tipoCliente || "final",
    zona: fd.zona || "", zonasReparto: new FormData(e.target).getAll("zonasReparto") };
  if (fd.rol) body.rol = fd.rol;
  if (fd.password) body.password = fd.password;
  try {
    if (fd._id) await apiPut(`/users/${fd._id}`, body); else await apiPost("/users", body);
    cerrarModal();
    toast("Usuario guardado");
    await cargarUsuarios();
  } catch (err) { document.getElementById("form-usuario-error").innerHTML = `<p class="msg-error">${esc(err.message)}</p>`; }
}

async function activarUsuario(id, activo) {
  try { await apiPut(`/users/${id}`, { activo }); await cargarUsuarios(); }
  catch (err) { toast(err.message, "error"); }
}

async function borrarUsuario(id) {
  if (!confirm("¿Borrar este usuario? Si tiene pedidos se desactiva en lugar de borrarse.")) return;
  try { const r = await apiDelete(`/users/${id}`); toast(r.message); await cargarUsuarios(); }
  catch (err) { toast(err.message, "error"); }
}
