// ══════════════════════════════════════════════════════════════════
//  js/reportes.js  —  Módulo de Reportes de Brie
//  Lee las ventas reales desde  GET /api/reportes/resumen
//  Fórmulas (Apunte N°1):  CV = p·q   IT = Pv·q   CT = CF + CV   U = IT − CT
//  Los costos fijos (CF) NO vienen de los pedidos: se cargan en el front.
// ══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const API = '/api';

  // CF vive en el front y se guarda en el navegador (persiste entre recargas)
  let CF = Number(localStorage.getItem('brie_cf')) || 850000;
  let productos = [];              // se llena desde la DB: { tipo, IT, CV, q }
  let tabActiva = 'costos';
  let estado = 'cargando';         // 'cargando' | 'ok' | 'error' | 'vacio'

  const LABELS = { corporativo: 'Corporativo', individual: 'Individual', evento: 'Eventos especiales' };
  const labelTipo = (t) => LABELS[t] || (t ? t[0].toUpperCase() + t.slice(1) : 'Sin tipo');

  // ─── HELPERS ───
  const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Math.round(n || 0));
  const num   = (n) => new Intl.NumberFormat('es-AR').format(n || 0);
  const el    = (id) => document.getElementById(id);

  // ─── TRAER DATOS DE LA BASE ───
  async function cargarDatos() {
    estado = 'cargando';
    pintarTab();
    try {
      const token = localStorage.getItem('brie_token');
      const res = await fetch(`${API}/reportes/resumen`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('El servidor respondió ' + res.status);
      const data = await res.json();
      productos = Array.isArray(data.productos) ? data.productos : [];
      estado = productos.length ? 'ok' : 'vacio';
    } catch (e) {
      console.error('Reportes — error al cargar:', e);
      estado = 'error';
    }
    pintarTab();
  }

  // ─── CÁLCULO AGREGADO (IT y CV ya vienen sumados por tipo) ───
  function calc() {
    let IT = 0, CV = 0, Q = 0;
    productos.forEach(p => { IT += p.IT; CV += p.CV; Q += p.q; });
    const CT = CF + CV;               // CT = CF + CV
    const U  = IT - CT;               // U  = IT − CT
    const MC = IT - CV;               // margen de contribución
    const ratioMC = IT ? MC / IT : 0;
    const equilibrio = ratioMC ? CF / ratioMC : 0;   // punto de equilibrio en $
    return { IT, CV, CT, U, MC, Q, ratioMC, equilibrio };
  }

  // ─── ESTILOS (auto-inyectados; prefijo rp- para no chocar con tu style.css) ───
  const CSS = `
  .rp{--v:#7c3aed;--vd:#5b21b6;--n:#ea6a1e;--g:#10b981;--r:#ef4444;--az:#3b82f6;
      --card:#fff;--bd:#ecebf1;--tx:#1f2430;--mut:#8a8f9c;color:var(--tx)}
  .rp-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;flex-wrap:wrap;gap:12px}
  .rp-head h1{font-family:'Playfair Display',serif;font-size:28px;color:var(--vd);margin:0}
  .rp-head .bc{font-size:12px;color:var(--mut);margin-top:2px}
  .rp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--bd);margin-bottom:22px}
  .rp-tab{background:none;border:none;font:inherit;font-weight:600;color:var(--mut);
      padding:11px 16px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
  .rp-tab:hover{color:var(--vd)} .rp-tab.on{color:var(--vd);border-bottom-color:var(--v)}
  .rp-card{background:var(--card);border:1px solid var(--bd);border-radius:16px;box-shadow:0 6px 22px rgba(30,20,60,.05);margin-bottom:18px}
  .rp-ch{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--bd)}
  .rp-ch h3{font-size:15px;margin:0} .rp-ch .hint{font-size:12px;color:var(--mut)}
  .rp-cb{padding:22px}
  .rp-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:18px}
  .rp-g2{display:grid;grid-template-columns:1.3fr 1fr;gap:18px}
  .rp-kpi{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:18px 20px;box-shadow:0 6px 22px rgba(30,20,60,.05)}
  .rp-kpi .ic{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;font-size:16px;margin-bottom:12px}
  .rp-kpi .ic.v{background:#f1eafe;color:var(--v)} .rp-kpi .ic.n{background:#fdeee2;color:var(--n)}
  .rp-kpi .ic.g{background:#e6f7f1;color:var(--g)} .rp-kpi .ic.az{background:#e8f0fe;color:var(--az)}
  .rp-kpi .lb{font-size:12px;color:var(--mut)}
  .rp-kpi .vl{font-size:23px;font-weight:700;margin-top:3px;font-variant-numeric:tabular-nums}
  .rp-kpi .dt{font-size:12px;margin-top:6px;color:var(--mut)}
  .rp-hero{background:linear-gradient(115deg,var(--vd),var(--v));color:#fff;border-radius:18px;
      padding:24px 28px;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;
      box-shadow:0 12px 34px rgba(91,33,182,.28);margin-bottom:18px}
  .rp-hero .hl{font-size:13px;opacity:.85} .rp-hero .hv{font-family:'Playfair Display',serif;font-size:38px;margin-top:4px;font-variant-numeric:tabular-nums}
  .rp-hero .hs{font-size:12px;opacity:.82;margin-top:6px}
  .rp-hero .bk{display:flex;gap:26px;text-align:right}
  .rp-hero .bk .bl{font-size:11px;opacity:.75} .rp-hero .bk .bv{font-size:17px;font-weight:600;font-variant-numeric:tabular-nums}
  .rp table{width:100%;border-collapse:collapse}
  .rp th,.rp td{text-align:left;padding:11px 12px;font-size:13px;border-bottom:1px solid var(--bd)}
  .rp th{font-size:11px;color:var(--mut);font-weight:600}
  .rp td.n,.rp th.n{text-align:right;font-variant-numeric:tabular-nums}
  .rp tbody tr:hover{background:#faf9fd}
  .rp tfoot td{font-weight:700;border-top:2px solid var(--bd);border-bottom:none}
  .rp-cfgin{border:1px solid var(--bd);border-radius:10px;padding:9px 12px;font:inherit;width:150px;text-align:right;font-variant-numeric:tabular-nums}
  .rp-cfgin:focus{outline:none;border-color:var(--v)}
  .rp-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600}
  .rp-pill.ok{background:#e6f7f1;color:#0a7a55} .rp-pill.warn{background:#fdeee2;color:#a8560f} .rp-pill.bad{background:#fde8e8;color:#b42222}
  .rp-btn{border:none;border-radius:10px;padding:9px 15px;font:inherit;font-weight:600;cursor:pointer;display:inline-flex;gap:8px;align-items:center}
  .rp-btn.gh{background:#f4f2f9;color:var(--vd)} .rp-btn.gh:hover{background:#eae5f5}
  .rp-dist{display:flex;flex-direction:column;gap:16px}
  .rp-dist .dt{display:flex;justify-content:space-between;font-size:13px;margin-bottom:7px;font-weight:600}
  .rp-dist .pc{font-weight:700}
  .rp-trk{height:11px;background:#f1eff6;border-radius:999px;overflow:hidden}
  .rp-fl{height:100%;border-radius:999px}
  .rp-note{display:flex;gap:10px;align-items:center;background:#fdf3e8;border:1px solid #f6dcc0;border-radius:12px;padding:12px 16px;font-size:13px;color:#7a4a12}
  .rp-eqnum{font-family:'Playfair Display',serif;font-size:28px;color:var(--vd);font-variant-numeric:tabular-nums;text-align:center}
  .rp-eqlb{font-size:12px;color:var(--mut);text-align:center;margin-top:2px}
  .rp-lg{display:flex;gap:18px;justify-content:center;font-size:12px;margin-top:12px;flex-wrap:wrap}
  .rp-lg span{display:inline-flex;gap:6px;align-items:center;color:var(--mut)}
  .rp-lg i{width:12px;height:3px;border-radius:2px;display:inline-block}
  .rp-fx{font-size:12px;color:var(--mut);background:#faf9fd;border:1px dashed var(--bd);border-radius:10px;padding:10px 14px;margin-top:16px;line-height:1.7}
  .rp-fx b{color:var(--vd)}
  .rp-empty{text-align:center;padding:56px 20px;color:var(--mut)}
  .rp-empty .ei{font-size:34px;margin-bottom:14px;color:#c9c5d6}
  .rp-empty h3{color:var(--tx);font-size:16px;margin:0 0 6px}
  .rp-empty p{margin:0 0 16px;font-size:13px}
  .rp-spin{width:34px;height:34px;border:3px solid #eae7f2;border-top-color:var(--v);border-radius:50%;margin:0 auto 16px;animation:rpspin .8s linear infinite}
  @keyframes rpspin{to{transform:rotate(360deg)}}
  @media(max-width:820px){.rp-g3,.rp-g2{grid-template-columns:1fr}.rp-hero{flex-direction:column}.rp-hero .bk{text-align:left}}
  `;

  // ═══ SHELL (se arma una vez) ═══
  function render() {
    const page = el('page-reportes');
    if (!page) return;
    if (!el('rp-styles')) {
      const st = document.createElement('style'); st.id = 'rp-styles'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    page.innerHTML = `
      <div class="rp">
        <div class="rp-head">
          <div><h1>Reportes</h1><div class="bc">Inicio / Reportes económicos</div></div>
          <button class="rp-btn gh" id="rpRefresh"><i class="fas fa-rotate"></i> Actualizar</button>
        </div>
        <div class="rp-tabs">
          <button class="rp-tab" data-tab="ventas"><i class="fas fa-arrow-trend-up"></i> Ventas</button>
          <button class="rp-tab" data-tab="costos"><i class="fas fa-scale-balanced"></i> Costos y ganancia</button>
          <button class="rp-tab" data-tab="equilibrio"><i class="fas fa-chart-line"></i> Punto de equilibrio</button>
        </div>
        <div id="rp-panel"></div>
      </div>`;
    page.querySelectorAll('.rp-tab').forEach(b =>
      b.addEventListener('click', () => { tabActiva = b.dataset.tab; pintarTab(); }));
    el('rpRefresh').addEventListener('click', cargarDatos);
    cargarDatos();   // primera carga desde la DB
  }

  function pintarTab() {
    const tabs = document.querySelectorAll('.rp-tab');
    if (!tabs.length) return;
    tabs.forEach(b => b.classList.toggle('on', b.dataset.tab === tabActiva));
    const panel = el('rp-panel');
    if (!panel) return;

    if (estado === 'cargando')
      return panelEstado(panel, `<div class="rp-spin"></div>`, 'Cargando datos', 'Consultando los pedidos de la base.');
    if (estado === 'error')
      return panelEstado(panel, `<i class="fas fa-triangle-exclamation ei"></i>`, 'No se pudieron cargar los datos',
        'Revisá que el servidor esté corriendo y volvé a intentar.', true);
    if (estado === 'vacio')
      return panelEstado(panel, `<i class="fas fa-inbox ei"></i>`, 'Todavía no hay ventas registradas',
        'Cuando cargues pedidos, el reporte se arma solo con esos datos.');

    if (tabActiva === 'ventas')      renderVentas();
    else if (tabActiva === 'costos') renderCostos();
    else                             renderEquilibrio();
  }

  function panelEstado(panel, icono, titulo, texto, conReintento) {
    panel.innerHTML = `
      <div class="rp-card"><div class="rp-cb"><div class="rp-empty">
        ${icono}<h3>${titulo}</h3><p>${texto}</p>
        ${conReintento ? '<button class="rp-btn gh" id="rpReintentar"><i class="fas fa-rotate"></i> Reintentar</button>' : ''}
      </div></div></div>`;
    const btn = el('rpReintentar');
    if (btn) btn.addEventListener('click', cargarDatos);
  }

  // ═══ TAB VENTAS ═══
  function renderVentas() {
    const d = calc();
    const precioProm = d.Q ? d.IT / d.Q : 0;
    const colores = ['#7c3aed', '#ea6a1e', '#10b981', '#3b82f6', '#e11d95'];
    const filas = productos.map((pr, i) => {
      const pc = d.IT ? (pr.IT / d.IT * 100) : 0;
      return `<div>
        <div class="dt"><span>${labelTipo(pr.tipo)}</span><span class="pc" style="color:${colores[i % 5]}">${pc.toFixed(0)}%</span></div>
        <div class="rp-trk"><div class="rp-fl" style="width:${pc}%;background:${colores[i % 5]}"></div></div>
      </div>`;
    }).join('');
    el('rp-panel').innerHTML = `
      <div class="rp-g3">
        <div class="rp-kpi"><div class="ic v"><i class="fas fa-arrow-trend-up"></i></div>
          <div class="lb">Ingresos totales (IT = Pv·q)</div><div class="vl">${money(d.IT)}</div>
          <div class="dt">del período</div></div>
        <div class="rp-kpi"><div class="ic az"><i class="fas fa-box"></i></div>
          <div class="lb">Viandas vendidas (q)</div><div class="vl">${num(d.Q)}</div>
          <div class="dt">${productos.length} tipos de vianda</div></div>
        <div class="rp-kpi"><div class="ic g"><i class="fas fa-tag"></i></div>
          <div class="lb">Precio promedio</div><div class="vl">${money(precioProm)}</div>
          <div class="dt">ingreso por vianda</div></div>
      </div>
      <div class="rp-card">
        <div class="rp-ch"><h3>Distribución de ingresos por tipo</h3><span class="hint">participación sobre IT</span></div>
        <div class="rp-cb"><div class="rp-dist">${filas}</div></div>
      </div>`;
  }

  // ═══ TAB COSTOS Y GANANCIA ═══
  function renderCostos() {
    const d = calc();
    const filas = productos.map(pr => {
      const precioProm = pr.q ? pr.IT / pr.q : 0;
      const costoProm  = pr.q ? pr.CV / pr.q : 0;
      const mc = pr.IT - pr.CV;
      return `<tr>
        <td>${labelTipo(pr.tipo)}</td>
        <td class="n">${num(pr.q)}</td>
        <td class="n">${money(precioProm)}</td>
        <td class="n">${money(costoProm)}</td>
        <td class="n">${money(pr.CV)}</td>
        <td class="n">${money(pr.IT)}</td>
        <td class="n"><span class="rp-pill ${mc > 0 ? 'ok' : mc === 0 ? 'warn' : 'bad'}">${money(mc)}</span></td>
      </tr>`;
    }).join('');
    el('rp-panel').innerHTML = `
      <div class="rp-hero">
        <div>
          <div class="hl">Ganancia del período (U = IT − CT)</div>
          <div class="hv">${money(d.U)}</div>
          <div class="hs">Margen neto: ${(d.IT ? d.U / d.IT * 100 : 0).toFixed(1)}%</div>
        </div>
        <div class="bk">
          <div><div class="bl">Ingresos (IT)</div><div class="bv">${money(d.IT)}</div></div>
          <div><div class="bl">Costos (CT)</div><div class="bv">${money(d.CT)}</div></div>
        </div>
      </div>
      <div class="rp-g3">
        <div class="rp-kpi"><div class="ic n"><i class="fas fa-receipt"></i></div>
          <div class="lb">Costos totales (CT = CF + CV)</div><div class="vl">${money(d.CT)}</div>
          <div class="dt">CF ${money(CF)} + CV ${money(d.CV)}</div></div>
        <div class="rp-kpi"><div class="ic g"><i class="fas fa-hand-holding-dollar"></i></div>
          <div class="lb">Margen de contribución (IT − CV)</div><div class="vl">${money(d.MC)}</div>
          <div class="dt">${(d.ratioMC * 100).toFixed(1)}% de los ingresos</div></div>
        <div class="rp-kpi"><div class="ic az"><i class="fas fa-building"></i></div>
          <div class="lb">Costos fijos mensuales (CF)</div>
          <div style="margin-top:6px"><input type="number" id="rpCF" class="rp-cfgin" value="${CF}" min="0" step="1000"></div>
          <div class="dt">se pagan vendas o no · editable</div></div>
      </div>
      <div class="rp-card">
        <div class="rp-ch"><h3>Detalle por tipo de vianda</h3><span class="hint">datos reales de tus pedidos</span></div>
        <div class="rp-cb" style="padding:0">
          <table>
            <thead><tr>
              <th>Tipo</th><th class="n">Cantidad (q)</th><th class="n">Precio prom.</th>
              <th class="n">Costo prom.</th><th class="n">CV = p·q</th><th class="n">IT = Pv·q</th><th class="n">Contribución</th>
            </tr></thead>
            <tbody>${filas}</tbody>
            <tfoot><tr>
              <td>Totales</td><td class="n">${num(d.Q)}</td><td class="n">—</td><td class="n">—</td>
              <td class="n">${money(d.CV)}</td><td class="n">${money(d.IT)}</td><td class="n">${money(d.MC)}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>`;
    // CF es lo único editable: al cambiarlo, se guarda y se recalcula todo
    el('rpCF').addEventListener('input', (e) => {
      CF = Number(e.target.value) || 0;
      localStorage.setItem('brie_cf', CF);
      renderCostos();
    });
  }

  // ═══ TAB PUNTO DE EQUILIBRIO ═══
  function renderEquilibrio() {
    const d = calc();
    const cubierto = d.equilibrio && d.IT >= d.equilibrio;
    el('rp-panel').innerHTML = `
      <div class="rp-g2">
        <div class="rp-card">
          <div class="rp-ch"><h3>Ingresos vs. costos</h3><span class="hint">dónde se cruzan es el equilibrio</span></div>
          <div class="rp-cb">
            ${graficoEquilibrio(d)}
            <div class="rp-lg">
              <span><i style="background:#7c3aed"></i> Ingresos (IT)</span>
              <span><i style="background:#ea6a1e"></i> Costos totales (CT)</span>
              <span><i style="background:#8a8f9c"></i> Ventas actuales</span>
            </div>
          </div>
        </div>
        <div class="rp-card">
          <div class="rp-ch"><h3>El número</h3><span class="hint">extensión del apunte</span></div>
          <div class="rp-cb">
            <div class="rp-eqnum">${money(d.equilibrio)}</div>
            <div class="rp-eqlb">facturación para que la ganancia sea cero</div>
            <div class="rp-note" style="margin-top:18px;${cubierto ? '' : 'background:#fde8e8;border-color:#f6c0c0;color:#8a1d1d'}">
              <i class="fas ${cubierto ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
              <span>${cubierto
                ? `Facturás ${money(d.IT)} — ya estás ${money(d.IT - d.equilibrio)} por encima del equilibrio.`
                : `Facturás ${money(d.IT)} — te faltan ${money(d.equilibrio - d.IT)} para cubrir los costos.`}</span>
            </div>
            <div class="rp-fx">
              <b>Punto de equilibrio</b> = CF ÷ (margen de contribución ÷ IT)<br>
              = ${money(CF)} ÷ ${(d.ratioMC * 100).toFixed(1)}% = <b>${money(d.equilibrio)}</b>
            </div>
          </div>
        </div>
      </div>`;
  }

  // Gráfico SVG: rectas de ingresos y costos en función de la facturación
  function graficoEquilibrio(d) {
    const W = 560, H = 300, ML = 58, MR = 20, MT = 18, MB = 40;
    const eq = d.equilibrio || 0;
    const Xmax = Math.max(d.IT, eq) * 1.35 || 1;
    const rCV = d.IT ? d.CV / d.IT : 0;
    const ctAt = (x) => CF + rCV * x;
    const Ymax = Math.max(Xmax, ctAt(Xmax)) || 1;
    const sx = (x) => ML + (x / Xmax) * (W - ML - MR);
    const sy = (v) => H - MB - (v / Ymax) * (H - MT - MB);

    const eqX = sx(eq), eqY = sy(eq);
    const it0 = { x: sx(0), y: sy(0) },      itN = { x: sx(Xmax), y: sy(Xmax) };
    const ct0 = { x: sx(0), y: sy(ctAt(0)) }, ctN = { x: sx(Xmax), y: sy(ctAt(Xmax)) };
    const actX = sx(d.IT);

    let ejes = '';
    for (let i = 0; i <= 4; i++) {
      const v = Ymax * i / 4, y = sy(v);
      ejes += `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="#f0eef5"/>
               <text x="${ML - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#8a8f9c">${money(v).replace('ARS', '').trim()}</text>`;
    }

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">
      ${ejes}
      <polygon points="${it0.x},${it0.y} ${eqX},${eqY} ${ct0.x},${ct0.y}" fill="#ef4444" fill-opacity="0.10"/>
      <polygon points="${eqX},${eqY} ${itN.x},${itN.y} ${ctN.x},${ctN.y}" fill="#10b981" fill-opacity="0.12"/>
      <line x1="${ct0.x}" y1="${ct0.y}" x2="${ctN.x}" y2="${ctN.y}" stroke="#ea6a1e" stroke-width="2.5"/>
      <line x1="${it0.x}" y1="${it0.y}" x2="${itN.x}" y2="${itN.y}" stroke="#7c3aed" stroke-width="2.5"/>
      <line x1="${actX}" y1="${MT}" x2="${actX}" y2="${H - MB}" stroke="#8a8f9c" stroke-width="1.5" stroke-dasharray="4 4"/>
      <circle cx="${eqX}" cy="${eqY}" r="5" fill="#fff" stroke="#5b21b6" stroke-width="2.5"/>
      <text x="${eqX}" y="${eqY - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#5b21b6">Equilibrio</text>
      <line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="#d9d6e2"/>
      <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#8a8f9c">Facturación / nivel de ventas →</text>
    </svg>`;
  }

  // ─── INIT ───
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', render);
  else
    render();
})();