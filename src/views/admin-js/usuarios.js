// Pestaña "Usuarios": alta, edición, cambio de rol, activar/desactivar y baja.
let usuariosCache = [];

async function cargarUsuarios() {
  usuariosCache = await apiGet("/users");
  document.getElementById("tab-usuarios").innerHTML = `
    <div class="barra-herramientas">
      <h2 class="seccion-titulo">Usuarios</h2>
      <button class="btn-orange" onclick="abrirFormUsuario()">+ Nuevo usuario</button>
    </div>
    <div id="form-usuario-cont" style="margin-top:1rem;"></div>
    <div class="card tabla-scroll" style="margin-top:1rem;"><table>
      <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead>
      <tbody>${usuariosCache.map((u) => `
        <tr>
          <td>${esc(u.nombre)}</td><td>${esc(u.email)}</td>
          <td>${esc(ROL_LABEL[u.rol] ?? u.rol)}</td>
          <td>${esc(u.telefono ?? "")}</td>
          <td><span class="badge" style="${u.activo === false ? "background:#fee2e2;color:#b91c1c" : "background:#dcfce7;color:#166534"}">${u.activo === false ? "Inactivo" : "Activo"}</span></td>
          <td style="white-space:nowrap;">
            <button class="btn-ghost" style="font-size:.75rem;" onclick="abrirFormUsuario('${u._id}')">Editar</button>
            ${u._id === usuarioActual.id ? "" : `
              <button class="btn-outline" style="font-size:.75rem;" onclick="activarUsuario('${u._id}', ${u.activo === false})">${u.activo === false ? "Activar" : "Desactivar"}</button>
              <button class="btn-danger" style="font-size:.75rem;" onclick="borrarUsuario('${u._id}')">Borrar</button>`}
          </td>
        </tr>`).join("")}
      </tbody></table></div>`;
}

function abrirFormUsuario(id) {
  const u = id ? usuariosCache.find((x) => x._id === id) : null;
  const esYo = u && u._id === usuarioActual.id;
  document.getElementById("form-usuario-cont").innerHTML = `
    <form class="card form-grid" onsubmit="guardarUsuario(event)">
      <input type="hidden" name="_id" value="${u?._id ?? ""}" />
      <div><label class="label">Nombre</label><input class="input" name="nombre" value="${esc(u?.nombre ?? "")}" required maxlength="80" /></div>
      <div><label class="label">Email</label><input class="input" name="email" type="email" value="${esc(u?.email ?? "")}" required /></div>
      <div><label class="label">Rol</label>
        <select class="input" name="rol" ${esYo ? "disabled" : ""}>
          ${Object.entries(ROL_LABEL).map(([k, v]) => `<option value="${k}" ${u?.rol === k ? "selected" : ""}>${v}${k === "user" ? " (cocina + reparto)" : ""}</option>`).join("")}
        </select>
        ${esYo ? `<p style="font-size:.75rem; opacity:.7; margin:.25rem 0 0;">No podés cambiar tu propio rol: pedile a otro administrador.</p>` : ""}</div>
      <div><label class="label">${u ? "Nueva contraseña (vacío = no cambia)" : "Contraseña (mín. 8)"}</label><input class="input" name="password" type="password" minlength="8" ${u ? "" : "required"} autocomplete="new-password" /></div>
      <div><label class="label">Teléfono</label><input class="input" name="telefono" value="${esc(u?.telefono ?? "")}" maxlength="30" /></div>
      <div><label class="label">Dirección</label><input class="input" name="direccion" value="${esc(u?.direccion ?? "")}" maxlength="200" /></div>
      <div id="form-usuario-error" class="ancho"></div>
      <div class="ancho" style="display:flex; gap:.5rem;">
        <button class="btn-primary" type="submit">${u ? "Guardar cambios" : "Crear usuario"}</button>
        <button class="btn-ghost" type="button" onclick="document.getElementById('form-usuario-cont').innerHTML=''">Cancelar</button>
      </div>
    </form>`;
}

async function guardarUsuario(e) {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  const body = { nombre: fd.nombre, email: fd.email, telefono: fd.telefono, direccion: fd.direccion };
  if (fd.rol) body.rol = fd.rol;
  if (fd.password) body.password = fd.password;
  try {
    if (fd._id) await apiPut(`/users/${fd._id}`, body); else await apiPost("/users", body);
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
