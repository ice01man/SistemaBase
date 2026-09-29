// ── Front del módulo de Stock, conectado al backend real ─────────────────────
const API = '/api/stock';
const DIAS_VENCIMIENTO = 7;

// Categorías de insumos (definidas por código). Agregá/sacá acá y se refleja en el select.
const CATEGORIAS = ['Carnes', 'Verduras', 'Lácteos', 'Secos', 'Aceites', 'Panadería', 'Embalaje', 'General'];

let insumos = [];   // cache de la última carga
let alertas = { bajoMinimo: [], porVencer: [] };

// ── Helpers ──────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function toast(msg, tipo = 'info') {
  const cont = $('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  const ic = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' }[tipo];
  const col = { success: 'success', error: 'danger', info: 'info' }[tipo];
  t.innerHTML = `<i class="fas ${ic}" style="color:var(--${col});font-size:16px;"></i> ${msg}`;
  cont.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

async function api(path, opts = {}) {
  const token = localStorage.getItem('brie_token');
  const res = await fetch(API + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...opts,
  });
  if (res.status === 401) {  
    localStorage.removeItem('brie_token');
    location.href = './login.html';
    throw new Error('Sesión expirada');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function cerrarSesion() {
  localStorage.removeItem('brie_token');
  localStorage.removeItem('brie_usuario');
  location.href = './login.html';
}


(function mostrarUsuario() {
  try {
    const u = JSON.parse(localStorage.getItem('brie_usuario') || 'null');
    if (!u) return;
    const cont = document.querySelector('.sidebar-footer .user-info');
    const av = document.querySelector('.sidebar-footer .avatar');
    if (cont) cont.innerHTML = `<span>${u.nombre || u.email}</span>${u.rol}`;
    if (av) av.textContent = (u.nombre || u.email).charAt(0).toUpperCase();
  } catch {}
})();

const saldoDe = (i) => (i.lotes || []).reduce((s, l) => s + l.cantidad, 0);

function proximoVencimiento(i) {
  const fechas = (i.lotes || []).filter(l => l.fechaVencimiento).map(l => new Date(l.fechaVencimiento));
  if (!fechas.length) return null;
  return new Date(Math.min(...fechas));
}

function estadoDe(i) {
  const saldo = saldoDe(i);
  if (saldo <= (i.stockMinimo || 0)) return 'bajo';
  const prox = proximoVencimiento(i);
  if (prox) {
    const limite = new Date(); limite.setDate(limite.getDate() + DIAS_VENCIMIENTO);
    if (prox <= limite) return 'porvencer';
  }
  return 'normal';
}

const badge = (estado) => {
  const map = { normal: 'Normal', bajo: 'Bajo mínimo', porvencer: 'Por vencer' };
  return `<span class="status ${estado}"><span class="dot-sm"></span> ${map[estado]}</span>`;
};

const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-AR') : '—';

// ── Carga de datos ───────────────────────────────────────────────────────────
async function cargar() {
  try {
    [insumos, alertas] = await Promise.all([
      api('/insumos'),
      api(`/alertas?dias=${DIAS_VENCIMIENTO}`),
    ]);
    $('kpiTotal').textContent = insumos.length;
    $('kpiBajo').textContent = alertas.bajoMinimo.length;
    $('kpiVencer').textContent = alertas.porVencer.length;
    renderTabla();
    renderAlertas();
  } catch (e) {
    toast('No se pudo conectar con el backend: ' + e.message, 'error');
    $('tabla').innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger);padding:40px;">
      No hay conexión con la API. ¿Está corriendo el servidor y MongoDB?</td></tr>`;
  }
}

function renderTabla() {
  const q = ($('buscar').value || '').toLowerCase();
  const lista = insumos.filter(i => i.nombre.toLowerCase().includes(q));
  if (!lista.length) {
    $('tabla').innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px;">Sin insumos. Agregá el primero.</td></tr>`;
    return;
  }
  $('tabla').innerHTML = lista.map(i => {
    const saldo = saldoDe(i);
    const estado = estadoDe(i);
    const pct = Math.min(100, i.stockMinimo ? (saldo / (i.stockMinimo * 3)) * 100 : 100);
    const color = estado === 'bajo' ? 'var(--danger)' : estado === 'porvencer' ? 'var(--warning)' : 'var(--success)';
    return `
    <tr>
      <td style="font-weight:600;">${i.nombre}</td>
      <td><span style="font-size:11px;color:var(--text-muted);">${i.categoria || '—'}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="progress-bar" style="width:60px;"><div class="fill" style="width:${pct}%;background:${color};"></div></div>
          <span style="font-weight:700;">${saldo}</span>
        </div>
      </td>
      <td>${i.stockMinimo ?? 0}</td>
      <td>${i.unidad}</td>
      <td style="font-size:12px;color:var(--text-muted);">${fmtFecha(proximoVencimiento(i))}</td>
      <td>${badge(estado)}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-sm btn-secondary" onclick="modalIngreso('${i._id}')" title="Ingreso de mercadería"><i class="fas fa-truck-ramp-box"></i></button>
          <button class="btn btn-sm btn-outline" onclick="modalAjuste('${i._id}')" title="Ajuste manual"><i class="fas fa-sliders"></i></button>
          <button class="btn btn-sm btn-outline" onclick="modalEditar('${i._id}')" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="btn btn-sm btn-outline" onclick="eliminar('${i._id}')" title="Eliminar" style="color:var(--danger);"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderAlertas() {
  const cont = $('alertas');
  const { bajoMinimo, porVencer } = alertas;
  $('alertasResumen').textContent = `${bajoMinimo.length} bajo mínimo · ${porVencer.length} por vencer`;
  if (!bajoMinimo.length && !porVencer.length) {
    cont.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:16px;">
      <i class="fas fa-check-circle" style="color:var(--success);font-size:22px;display:block;margin-bottom:8px;"></i>
      Todo en orden: sin insumos bajo mínimo ni próximos a vencer.</div>`;
    return;
  }
  const filaBajo = (a) => `<div style="padding:10px 14px;background:#FEF2F2;border-radius:8px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
      <i class="fas fa-exclamation-circle" style="color:var(--danger);"></i>
      <div><div style="font-size:13px;font-weight:600;">${a.nombre}</div>
      <div style="font-size:11px;color:var(--danger);">Saldo ${a.saldo} — mínimo ${a.stockMinimo}</div></div></div>`;
  const filaVenc = (a) => `<div style="padding:10px 14px;background:#FFFBEB;border-radius:8px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
      <i class="fas fa-clock" style="color:var(--warning);"></i>
      <div><div style="font-size:13px;font-weight:600;">${a.nombre}</div>
      <div style="font-size:11px;color:var(--warning);">${a.cantidad} vence el ${fmtFecha(a.fechaVencimiento)}</div></div></div>`;
  cont.innerHTML = bajoMinimo.map(filaBajo).join('') + porVencer.map(filaVenc).join('');
}

// ── Modales ──────────────────────────────────────────────────────────────────
function abrirModal() { $('modalOverlay').classList.add('show'); }
function cerrarModal() { $('modalOverlay').classList.remove('show'); }
$('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) cerrarModal(); });

function modalNuevoInsumo() {
  $('modalTitle').textContent = 'Nuevo insumo';
  $('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group full"><label>Nombre</label><input id="fNombre" placeholder="Ej: Pechuga de pollo"></div>
      <div class="form-group"><label>Categoría</label>
        <select id="fCat">${CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
      <div class="form-group"><label>Unidad</label>
        <select id="fUnidad"><option>kg</option><option>g</option><option>l</option><option>ml</option><option>unidad</option></select></div>
      <div class="form-group"><label>Stock mínimo</label><input id="fMin" type="number" min="0" value="0"></div>
    </div>`;
  $('modalFoot').innerHTML = `<button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="crearInsumo()"><i class="fas fa-plus"></i> Crear</button>`;
  abrirModal();
}

async function crearInsumo() {
  const nombre = $('fNombre').value.trim();
  if (!nombre) return toast('Ingresá el nombre', 'error');
  try {
    await api('/insumos', { method: 'POST', body: JSON.stringify({
      nombre, categoria: $('fCat').value.trim() || 'General',
      unidad: $('fUnidad').value, stockMinimo: Number($('fMin').value) || 0,
    })});
    cerrarModal(); toast('Insumo creado', 'success'); cargar();
  } catch (e) { toast(e.message, 'error'); }
}

function modalIngreso(id) {
  const i = insumos.find(x => x._id === id);
  $('modalTitle').textContent = `Ingreso de mercadería — ${i.nombre}`;
  $('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>Cantidad (${i.unidad})</label><input id="gCant" type="number" min="0" step="any" placeholder="0"></div>
      <div class="form-group"><label>Vencimiento</label><input id="gVenc" type="date"></div>
      <div class="form-group"><label>Origen</label>
        <select id="gOrigen"><option value="compra">Compra</option><option value="proveedor">Proveedor</option></select></div>
      <div class="form-group"><label>Proveedor (opcional)</label><input id="gProv" placeholder="Nombre"></div>
    </div>`;
  $('modalFoot').innerHTML = `<button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="ingresar('${id}')"><i class="fas fa-check"></i> Registrar ingreso</button>`;
  abrirModal();
}

async function ingresar(id) {
  const cantidad = Number($('gCant').value);
  if (!(cantidad > 0)) return toast('Cantidad inválida', 'error');
  try {
    await api(`/insumos/${id}/ingreso`, { method: 'POST', body: JSON.stringify({
      cantidad, fechaVencimiento: $('gVenc').value || null,
      origen: $('gOrigen').value, proveedor: $('gProv').value.trim(),
    })});
    cerrarModal(); toast('Ingreso registrado', 'success'); cargar();
  } catch (e) { toast(e.message, 'error'); }
}

function modalAjuste(id) {
  const i = insumos.find(x => x._id === id);
  $('modalTitle').textContent = `Ajuste manual — ${i.nombre}`;
  $('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>Cantidad (+ agrega / − descuenta)</label><input id="aCant" type="number" step="any" placeholder="Ej: -2"></div>
      <div class="form-group"><label>Motivo</label><input id="aMotivo" placeholder="Ej: rotura, conteo físico"></div>
    </div>`;
  $('modalFoot').innerHTML = `<button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="ajustar('${id}')"><i class="fas fa-check"></i> Aplicar ajuste</button>`;
  abrirModal();
}

async function ajustar(id) {
  const cantidad = Number($('aCant').value);
  if (!cantidad) return toast('Cantidad inválida', 'error');
  try {
    await api('/ajuste', { method: 'POST', body: JSON.stringify({
      insumoId: id, cantidad, motivo: $('aMotivo').value.trim() || 'Ajuste manual',
    })});
    cerrarModal(); toast('Ajuste aplicado', 'success'); cargar();
  } catch (e) { toast(e.message, 'error'); }
}

function modalEditar(id) {
  const i = insumos.find(x => x._id === id);
  $('modalTitle').textContent = `Editar — ${i.nombre}`;
  const opts = CATEGORIAS.map(c => `<option value="${c}" ${c === i.categoria ? 'selected' : ''}>${c}</option>`).join('');
  const unidades = ['kg', 'g', 'l', 'ml', 'unidad'].map(u => `<option ${u === i.unidad ? 'selected' : ''}>${u}</option>`).join('');
  $('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group full"><label>Nombre</label><input id="eNombre" value="${i.nombre}"></div>
      <div class="form-group"><label>Categoría</label><select id="eCat">${opts}</select></div>
      <div class="form-group"><label>Unidad</label><select id="eUnidad">${unidades}</select></div>
      <div class="form-group"><label>Stock mínimo</label><input id="eMin" type="number" min="0" value="${i.stockMinimo ?? 0}"></div>
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:12px;">El stock no se edita acá: se cambia con ingreso o ajuste.</p>`;
  $('modalFoot').innerHTML = `<button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="guardarEdicion('${id}')"><i class="fas fa-check"></i> Guardar</button>`;
  abrirModal();
}

async function guardarEdicion(id) {
  const nombre = $('eNombre').value.trim();
  if (!nombre) return toast('El nombre no puede quedar vacío', 'error');
  try {
    await api(`/insumos/${id}`, { method: 'PUT', body: JSON.stringify({
      nombre, categoria: $('eCat').value, unidad: $('eUnidad').value, stockMinimo: Number($('eMin').value) || 0,
    })});
    cerrarModal(); toast('Insumo actualizado', 'success'); cargar();
  } catch (e) { toast(e.message, 'error'); }
}

async function eliminar(id) {
  const i = insumos.find(x => x._id === id);
  if (!confirm(`¿Eliminar "${i.nombre}"? Se dará de baja del inventario.`)) return;
  try {
    await api(`/insumos/${id}`, { method: 'DELETE' });
    toast('Insumo eliminado', 'success'); cargar();
  } catch (e) { toast(e.message, 'error'); }
}

// ── Navegación mínima ────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  n.classList.add('active');
  const page = n.dataset.page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('page-' + page).classList.add('active');
  $('pageTitle').textContent = page === 'stock' ? 'Control de Stock' : 'Otro módulo';
  $('sidebar').classList.remove('open');
}));
$('menuToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));

// ── Init ─────────────────────────────────────────────────────────────────────
cargar();
