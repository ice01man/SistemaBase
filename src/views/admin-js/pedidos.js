// Pestaña "Pedidos": todos los pedidos, con filtros, cambio de estado, pago y cancelación.
let filtrosPedidos = { estado: "", fecha: "" };

async function cargarPedidos() {
  const q = new URLSearchParams();
  if (filtrosPedidos.estado) q.set("estado", filtrosPedidos.estado);
  if (filtrosPedidos.fecha) q.set("fecha", filtrosPedidos.fecha);
  const lista = await apiGet(`/orders?${q}`);
  document.getElementById("tab-pedidos").innerHTML = `
    <div class="barra-herramientas">
      <h2 class="seccion-titulo">Pedidos</h2>
      <form onsubmit="filtrarPedidos(event)" style="display:flex; gap:.5rem; align-items:end; flex-wrap:wrap;">
        <div><label class="label">Estado</label>
          <select class="input" name="estado"><option value="">Todos</option>
            ${Object.entries(ESTADO_LABEL).map(([k, v]) => `<option value="${k}" ${k === filtrosPedidos.estado ? "selected" : ""}>${v}</option>`).join("")}
          </select></div>
        <div><label class="label">Fecha de entrega</label><input class="input" type="date" name="fecha" value="${filtrosPedidos.fecha}" /></div>
        <button class="btn-primary" type="submit">Filtrar</button>
        <button class="btn-ghost" type="button" onclick="filtrosPedidos={estado:'',fecha:''}; cargarPedidos()">Limpiar</button>
      </form>
    </div>
    <div class="card tabla-scroll" style="margin-top:1rem;"><table>
      <thead><tr><th>#</th><th>Entrega</th><th>Cliente</th><th>Detalle</th><th>Total</th><th>Pago</th><th>Estado</th><th></th></tr></thead>
      <tbody>${lista.map((p) => `
        <tr>
          <td><b>${p.numero ?? p._id.slice(-6)}</b></td>
          <td>${fmtFechaEntrega(p.fechaEntrega)}</td>
          <td>${esc(p.cliente?.nombre ?? "")}<br><span style="font-size:.75rem; opacity:.7;">${esc(p.direccion)}</span></td>
          <td style="font-size:.8rem;">${p.items.map((i) => `${i.qty}× ${esc(i.name)}`).join("<br>")}</td>
          <td><b>${fmtPrecio(p.totalAmount)}</b></td>
          <td>${esc(p.medioPago)}<br>${p.pagado ? `<span class="badge" style="background:#dcfce7;color:#166534;">Pagado</span>` : `<button class="btn-ghost" style="font-size:.7rem;" onclick="marcarPagado('${p._id}')">Marcar pagado</button>`}</td>
          <td>${badgeEstado(p.estado)}</td>
          <td style="white-space:nowrap;">
            ${["entregado", "cancelado"].includes(p.estado) ? "" : `<button class="btn-danger" style="font-size:.7rem;" onclick="cancelarPedidoAdmin('${p._id}')">Cancelar</button>`}
          </td>
        </tr>`).join("") || `<tr><td colspan="8" style="opacity:.6; text-align:center;">No hay pedidos con ese filtro.</td></tr>`}
      </tbody></table></div>`;
}

function filtrarPedidos(e) {
  e.preventDefault();
  filtrosPedidos = Object.fromEntries(new FormData(e.target));
  cargarPedidos().catch((err) => toast(err.message, "error"));
}

async function marcarPagado(id) {
  try { await apiPatch(`/orders/${id}/pago`, { pagado: true }); toast("Pago registrado"); await cargarPedidos(); }
  catch (err) { toast(err.message, "error"); }
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
