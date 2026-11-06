// Pestaña "Pedidos": todos los pedidos, con filtros, cambio de estado, pago y cancelación.
let filtrosPedidos = { estado: "", fecha: "", pago: "", zona: "" };
let zonasPedidos = [];

async function cargarPedidos() {
  const q = new URLSearchParams();
  if (filtrosPedidos.estado) q.set("estado", filtrosPedidos.estado);
  if (filtrosPedidos.fecha) q.set("fecha", filtrosPedidos.fecha);
  let lista, cfg;
  [lista, cfg] = await Promise.all([apiGet(`/orders?${q}`), apiGet("/config/admin")]);
  zonasPedidos = cfg.zonas || [];
  // Filtro por cobro (se aplica acá): "pendiente" = todavía falta cobrar (efectivo a cobrar o transferencia sin confirmar). Los cancelados no cuentan.
  if (filtrosPedidos.pago === "pendiente") lista = lista.filter((p) => !p.pagado && p.estado !== "cancelado");
  if (filtrosPedidos.pago === "pagado") lista = lista.filter((p) => p.pagado);
  if (filtrosPedidos.zona === "__sin") lista = lista.filter((p) => !p.zona && !["entregado", "cancelado"].includes(p.estado));
  else if (filtrosPedidos.zona) lista = lista.filter((p) => p.zona === filtrosPedidos.zona);
  document.getElementById("tab-pedidos").innerHTML = `
    <div class="barra-herramientas">
      <h2 class="seccion-titulo">Pedidos</h2>
      <form onsubmit="filtrarPedidos(event)" style="display:flex; gap:.5rem; align-items:end; flex-wrap:wrap;">
        <div><label class="label">Estado</label>
          <select class="input" name="estado"><option value="">Todos</option>
            ${Object.entries(ESTADO_LABEL).map(([k, v]) => `<option value="${k}" ${k === filtrosPedidos.estado ? "selected" : ""}>${v}</option>`).join("")}
          </select></div>
        <div><label class="label">Cobro</label>
          <select class="input" name="pago">
            <option value="">Todos</option>
            <option value="pendiente" ${filtrosPedidos.pago === "pendiente" ? "selected" : ""}>Pendiente de cobro</option>
            <option value="pagado" ${filtrosPedidos.pago === "pagado" ? "selected" : ""}>Pagado</option>
          </select></div>
        <div><label class="label">Zona</label>
          <select class="input" name="zona">
            <option value="">Todas</option>
            <option value="__sin" ${filtrosPedidos.zona === "__sin" ? "selected" : ""}>⚠️ Sin zona</option>
            ${zonasPedidos.map((z) => `<option ${filtrosPedidos.zona === z ? "selected" : ""}>${esc(z)}</option>`).join("")}
          </select></div>
        <div><label class="label">Fecha de entrega</label><input class="input" type="date" name="fecha" value="${filtrosPedidos.fecha}" /></div>
        <button class="btn-primary" type="submit">Filtrar</button>
        <button class="btn-ghost" type="button" onclick="filtrosPedidos={estado:'',fecha:'',pago:'',zona:''}; cargarPedidos()">Limpiar</button>
      </form>
    </div>
    <div class="card tabla-scroll" style="margin-top:1rem;"><table>
      <thead><tr><th>#</th><th>Entrega</th><th>Cliente</th><th>Detalle</th><th>Total</th><th>Pago</th><th>Estado</th><th></th></tr></thead>
      <tbody>${lista.map((p) => `
        <tr>
          <td><b>${p.numero ?? p._id.slice(-6)}</b></td>
          <td>${fmtFechaEntrega(p.fechaEntrega)}</td>
          <td>${esc(p.cliente?.nombre ?? "")}${!p.zona && !["entregado", "cancelado"].includes(p.estado) ? ` <span title="Sin zona: asignala en Usuarios">⚠️</span>` : ""}</td>
          <td style="font-size:.8rem;">${p.items.map((i) => `${i.qty}× ${esc(i.name)}`).join("<br>")}</td>
          <td><b>${fmtPrecio(p.totalAmount)}</b>${p.descuentoPct > 0 ? `<br><small title="${esc(p.descuentoMotivo)}" style="color:#166534;">−${p.descuentoPct} % (${esc(p.descuentoMotivo.split(" (")[0])})</small>` : ""}</td>
          <td>${esc(MEDIO_PAGO_LABEL[p.medioPago] ?? p.medioPago)}<br>${badgePago(p)}</td>
          <td>${badgeEstado(p.estado)}</td>
          <td style="white-space:nowrap;">
            <button class="btn-icono" title="Ver cliente y pedido (celular, WhatsApp, comprobante)" onclick="verClientePedido('${p._id}')">👤</button>
            ${p.pagado || p.medioPago === "efectivo" ? "" : `<button class="btn-icono" title="Confirmar transferencia recibida" onclick="marcarPagado('${p._id}')">✅</button>`}
            ${["entregado", "cancelado"].includes(p.estado) ? "" : `<button class="btn-icono peligro" title="Cancelar pedido" onclick="cancelarPedidoAdmin('${p._id}')">✖️</button>`}
          </td>
        </tr>`).join("") || `<tr><td colspan="8" style="opacity:.6; text-align:center;">No hay pedidos con ese filtro.</td></tr>`}
      </tbody></table></div>`;
}

function filtrarPedidos(e) {
  e.preventDefault();
  filtrosPedidos = Object.fromEntries(new FormData(e.target));
  cargarPedidos().catch((err) => toast(err.message, "error"));
}

// Zona del pedido; si falta y el pedido sigue abierto, se marca (el admin tiene que asignarla desde Usuarios).
function badgeZona(p) {
  if (p.zona) return `<span class="badge" style="background:#e0f2fe;color:#075985;">🗺️ ${esc(p.zona)}</span>`;
  return ["entregado", "cancelado"].includes(p.estado) ? "" : `<span class="badge" style="background:#ffedd5;color:#c2410c;" title="Asignale una zona al cliente en Usuarios">⚠️ Sin zona</span>`;
}

async function marcarPagado(id, pagado = true) {
  try {
    await apiPatch(`/orders/${id}/pago`, { pagado });
    cerrarModal();
    toast(pagado ? "Pago registrado" : "Pago desmarcado");
    await cargarPedidos();
  } catch (err) { toast(err.message, "error"); }
}

// Arma el número para WhatsApp (formato internacional argentino: 54 9 + código de área + número, sin 0 ni 15).
// Devuelve "" si no se puede armar un número de 10 dígitos.
function numeroWhatsApp(tel) {
  let d = String(tel ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (d.startsWith("54")) d = d.slice(2);
  d = d.replace(/^0+/, "");
  if (d.startsWith("9") && d.length === 11) d = d.slice(1);               // ya traía el 9 de celular
  if (d.length === 12) for (const i of [2, 3, 4]) if (d.slice(i, i + 2) === "15") { d = d.slice(0, i) + d.slice(i + 2); break; } // quita el 15
  return d.length === 10 ? `549${d}` : "";
}

// Ficha del pedido y del cliente: para pedir el comprobante de una transferencia y confirmar el cobro.
async function verClientePedido(id) {
  let p;
  try {
    const [pedidos, usuarios] = await Promise.all([apiGet("/orders"), apiGet("/users")]);
    p = pedidos.find((x) => x._id === id);
    p.usuario = usuarios.find((u) => u._id === p.userId) ?? {};
  } catch (err) { return toast(err.message, "error"); }
  const u = p.usuario;
  const nombre = u.nombre || p.cliente?.nombre || "";
  const tel = u.telefono || p.cliente?.telefono || "";
  const email = u.email || p.cliente?.email || "";
  const wa = numeroWhatsApp(tel);
  const msg = `Hola ${nombre.split(" ")[0] || ""}! Te escribimos de Brie. Tu pedido #${p.numero} (${fmtPrecio(p.totalAmount)}) figura con pago por ${MEDIO_PAGO_LABEL[p.medioPago] ?? p.medioPago}. ¿Nos podés enviar el comprobante? ¡Gracias!`;
  const TIPOS = { final: "Cliente final", empresa: "Empresa", descuento: "Con descuento" };
  const fila = (k, v) => `<div style="display:flex; gap:.75rem; padding:.3rem 0; border-bottom:1px solid var(--brie-lavender-light,#eee);"><span style="min-width:8rem; opacity:.65; font-size:.85rem;">${k}</span><span style="flex:1;">${v}</span></div>`;
  abrirModal(`Pedido #${p.numero} · ${esc(nombre)}`, `
    <div style="display:grid; gap:1rem;">
      <div>
        <h4 style="margin:0 0 .4rem;">👤 Cliente</h4>
        ${fila("Nombre", esc(nombre))}
        ${fila("Celular", tel ? `<b>${esc(tel)}</b> · <a href="tel:${esc(tel)}">📞 Llamar</a>` : `<span style="color:#b45309;">No cargó celular. Completalo en Usuarios → ✏️ para poder contactarlo.</span>`)}
        ${fila("Email", email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : "—")}
        ${fila("Tipo de cliente", `${esc(TIPOS[u.tipoCliente || p.tipoCliente || "final"])}${u.empresa ? ` · ${esc(u.empresa)}` : ""}`)}
        ${fila("Dirección de entrega", esc(p.direccion))}
        ${fila("Zona", p.zona ? esc(p.zona) : `<span style="color:#b45309;">Sin zona: asignala en Usuarios para que le llegue a un repartidor.</span>`)}
        ${p.observaciones ? fila("Observaciones", esc(p.observaciones)) : ""}
      </div>
      <div>
        <h4 style="margin:0 0 .4rem;">🧾 Pedido</h4>
        ${fila("Detalle", p.items.map((i) => `${i.qty}× ${esc(i.name)}`).join("<br>"))}
        ${fila("Total", `<b>${fmtPrecio(p.totalAmount)}</b>${p.descuentoPct > 0 ? ` <small style="color:#166534;">(${esc(p.descuentoMotivo)}, ahorra ${fmtPrecio(p.descuentoMonto)})</small>` : ""}`)}
        ${fila("Entrega", fmtFechaEntrega(p.fechaEntrega))}
        ${fila("Estado", badgeEstado(p.estado))}
        ${fila("Pago", `${esc(MEDIO_PAGO_LABEL[p.medioPago] ?? p.medioPago)} · ${badgePago(p)}${p.pagado && p.pagoConfirmadoPor ? `<br><small>Registrado por ${esc(p.pagoConfirmadoPor)}${p.pagoConfirmadoEn ? " · " + fmtFechaHora(p.pagoConfirmadoEn) : ""}</small>` : ""}`)}
      </div>
      <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
        ${p.medioPago !== "transferencia" || p.pagado ? "" : wa ? `<a class="btn-primary" style="text-decoration:none;" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}">💬 Pedir comprobante por WhatsApp</a>`
             : tel ? `<span style="font-size:.85rem; color:#b45309;">No pude armar el link de WhatsApp con "${esc(tel)}": revisá que tenga código de área (ej. 11 2345 6789).</span>` : ""}
        ${p.pagado
          ? `<button class="btn-outline" type="button" onclick="marcarPagado('${p._id}', false)">↩️ Desmarcar pago</button>`
          : p.medioPago === "efectivo" ? `<span style="font-size:.85rem; opacity:.75; align-self:center;">💵 El cobro en efectivo lo registra el repartidor.</span>`
          : `<button class="btn-orange" type="button" onclick="marcarPagado('${p._id}')">✅ Confirmar que recibí la transferencia</button>`}
        <button class="btn-ghost" type="button" onclick="cerrarModal()">Cerrar</button>
      </div>
    </div>`, { ancho: "40rem" });
}

async function cancelarPedidoAdmin(id) {
  const motivo = prompt("Motivo de la cancelación (opcional):", "");
  if (motivo === null) return;
  try {
    await apiPost(`/orders/${id}/cancelar`, { motivo });
    toast("Pedido cancelado (si ya se había descontado stock, se devolvió)");
    await cargarPedidos();
  } catch (err) { toast(err.message, "error"); }
}
