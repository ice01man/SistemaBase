// Pestaña "Resumen": ventas, estados de pedidos, platos más pedidos y alertas de stock.
let rangoResumen = { desde: "", hasta: "" };

async function cargarResumen() {
  const q = new URLSearchParams();
  if (rangoResumen.desde) q.set("desde", rangoResumen.desde);
  if (rangoResumen.hasta) q.set("hasta", rangoResumen.hasta);
  const r = await apiGet(`/produccion/reportes?${q}`);
  const maxQty = Math.max(1, ...r.topPlatos.map((p) => p.qty));
  const maxDia = Math.max(1, ...r.porFecha.map((f) => f.monto));
  const cont = document.getElementById("tab-resumen");
  cont.innerHTML = `
    <div class="barra-herramientas">
      <h2 class="seccion-titulo">Resumen</h2>
      <form onsubmit="filtrarResumen(event)" style="display:flex; gap:.5rem; align-items:end; flex-wrap:wrap;">
        <div><label class="label">Entregas desde</label><input class="input" type="date" name="desde" value="${r.desde}" /></div>
        <div><label class="label">hasta</label><input class="input" type="date" name="hasta" value="${r.hasta}" /></div>
        <button class="btn-primary" type="submit">Aplicar</button>
      </form>
    </div>

    <div class="stats" style="margin-top:1rem;">
      <div class="stat"><div class="valor">${fmtPrecio(r.ventas)}</div><div class="rotulo">Ventas (sin cancelados)</div></div>
      <div class="stat"><div class="valor">${r.pedidosValidos}</div><div class="rotulo">Pedidos válidos</div></div>
      <div class="stat"><div class="valor">${fmtPrecio(r.ticketPromedio)}</div><div class="rotulo">Ticket promedio</div></div>
      <div class="stat ${r.alertasStock ? "alerta" : ""}"><div class="valor">${r.alertasStock}</div><div class="rotulo">Insumos bajo mínimo</div></div>
      <div class="stat"><div class="valor">${fmtPrecio(r.cobrado)}</div><div class="rotulo">Cobrado</div></div>
      <div class="stat"><div class="valor">${fmtPrecio(r.porCobrar)}</div><div class="rotulo">Por cobrar</div></div>
      <div class="stat"><div class="valor">${r.porEstado.cancelado ?? 0}</div><div class="rotulo">Cancelados</div></div>
      <div class="stat"><div class="valor">${r.porEstado.entregado ?? 0}</div><div class="rotulo">Entregados</div></div>
      <div class="stat ${r.clientesSinZona || r.pedidosSinZona ? "alerta" : ""}" style="cursor:pointer;" onclick="irATab('usuarios')" title="Ir a Usuarios para asignar zonas"><div class="valor">${r.clientesSinZona} · ${r.pedidosSinZona}</div><div class="rotulo">Clientes · pedidos sin zona</div></div>
      <div class="stat"><div class="valor">${fmtPrecio(r.costo)}</div><div class="rotulo">Costo de insumos</div></div>
      <div class="stat"><div class="valor">${fmtPrecio(r.descuentos)}</div><div class="rotulo">Descuentos otorgados</div></div>
      <div class="stat"><div class="valor">${fmtPrecio(r.ganancia)}</div><div class="rotulo">Ganancia bruta</div></div>
      <div class="stat"><div class="valor">${r.margenReal === null ? "—" : r.margenReal.toFixed(1).replace(".", ",") + " %"}</div><div class="rotulo">Margen real (con descuentos)</div></div>
    </div>

    <div class="grid-2" style="margin-top:1.25rem; align-items:start;">
      <div class="card"><h3 style="margin:0 0 .75rem;">Pedidos por estado</h3>
        ${Object.keys(ESTADO_LABEL).map((e) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:.25rem 0;">
            ${badgeEstado(e)}<b>${r.porEstado[e] ?? 0}</b>
          </div>`).join("")}
      </div>
      <div class="card"><h3 style="margin:0 0 .75rem;">Platos más pedidos</h3>
        ${r.topPlatos.map((p) => `
          <div style="margin-bottom:.6rem;">
            <div style="display:flex; justify-content:space-between; font-size:.85rem;"><span>${esc(p.name)}</span><b>${p.qty} · ${fmtPrecio(p.monto)}</b></div>
            <div class="barra"><span style="width:${Math.round((p.qty / maxQty) * 100)}%"></span></div>
          </div>`).join("") || `<p style="opacity:.6;">Sin pedidos en el período.</p>`}
      </div>
    </div>

    <div class="card" style="margin-top:1rem;"><h3 style="margin:0 0 .75rem;">Ventas por día de entrega</h3>
      ${r.porFecha.map((f) => `
        <div style="display:grid; grid-template-columns:6rem 1fr 9rem; gap:.5rem; align-items:center; margin-bottom:.4rem; font-size:.85rem;">
          <span>${fmtFechaEntrega(f.fecha)}</span>
          <div class="barra"><span style="width:${Math.round((f.monto / maxDia) * 100)}%"></span></div>
          <span style="text-align:right;"><b>${fmtPrecio(f.monto)}</b> · ${f.pedidos} ped.</span>
        </div>`).join("") || `<p style="opacity:.6;">Sin ventas en el período.</p>`}
    </div>`;
}

function filtrarResumen(e) {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  rangoResumen = { desde: fd.desde, hasta: fd.hasta };
  cargarResumen().catch((err) => toast(err.message, "error"));
}
