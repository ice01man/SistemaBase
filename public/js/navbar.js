const LINKS_POR_ROL = {
  cliente: [
    { href: "pedir.html", label: "Hacer pedido" },
    { href: "mis-pedidos.html", label: "Mis pedidos" },
  ],
  admin: [{ href: "admin.html", label: "Administración" }],
  user: [{ href: "panel.html", label: "Panel de pedidos" }],
};

function renderNavbar() {
  const el = document.getElementById("navbar");
  if (!el) return;
  const usuario = getUsuario();
  const links = usuario ? LINKS_POR_ROL[usuario.role] ?? [] : [];

  el.innerHTML = `
    <header class="brie-header">
      <div class="brie-nav">
        <a href="index.html" class="font-brand brie-logo">SistemaBase</a>
        <div class="brie-nav-links brie-nav-desktop">
          ${links.map((l) => `<a href="${l.href}" class="btn-ghost">${esc(l.label)}</a>`).join("")}
        </div>
        <div class="brie-nav-right brie-nav-desktop">
          ${
            usuario
              ? `<span class="brie-user-chip">
                   <span class="brie-user-avatar">${esc(usuario.name.charAt(0).toUpperCase())}</span>
                   <span class="brie-user-name">Hola, ${esc(usuario.name.split(" ")[0])}</span>
                 </span>
                 <button class="btn-outline" onclick="logout()">Salir</button>`
              : `<a href="login.html" class="btn-primary">Ingresar</a>`
          }
        </div>
        <div class="brie-nav-right brie-nav-mobile" style="margin-left:auto;">
          <button class="btn-ghost" onclick="toggleMenuMobile()">☰</button>
        </div>
      </div>
      <div id="menu-mobile" class="container" style="display:none; margin-top:0.5rem;">
        <div class="card" style="display:flex; flex-direction:column; gap:0.25rem;">
          ${links.map((l) => `<a href="${l.href}" class="btn-ghost" style="justify-content:flex-start;">${esc(l.label)}</a>`).join("")}
          ${
            usuario
              ? `<button class="btn-outline" style="justify-content:flex-start;" onclick="logout()">Salir (${esc(usuario.name)})</button>`
              : `<a href="login.html" class="btn-primary" style="justify-content:flex-start;">Ingresar</a>`
          }
        </div>
      </div>
    </header>
  `;
}

function toggleMenuMobile() {
  const m = document.getElementById("menu-mobile");
  if (m) m.style.display = m.style.display === "none" ? "block" : "none";
}

/** Aplica la paleta elegida en Administración → Apariencia (violeta es la de base, no hace falta atributo). */
async function aplicarTema() {
  try {
    const { tema } = await apiGet("/config");
    if (tema && tema !== "violeta") document.documentElement.setAttribute("data-tema", tema);
  } catch {
    // sin conexión a /api/config: seguimos con la paleta por defecto
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  aplicarTema();
});
