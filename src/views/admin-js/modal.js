// Ventana modal compartida del panel de administración (formularios de platos, insumos, usuarios e historial).
// Se cierra con la ✕, con "Cancelar" (cerrarModal()) o con la tecla Esc. NO se cierra al hacer clic afuera,
// para no perder lo que se estaba escribiendo por un clic de más.
function abrirModal(titulo, html, { ancho = "52rem" } = {}) {
  cerrarModal();
  const fondo = document.createElement("div");
  fondo.id = "modal-fondo";
  fondo.innerHTML = `
    <div class="modal-caja" role="dialog" aria-modal="true" aria-label="${titulo}" style="max-width:${ancho};">
      <div class="modal-cabecera">
        <h3>${titulo}</h3>
        <button type="button" class="btn-icono" title="Cerrar (Esc)" onclick="cerrarModal()">✕</button>
      </div>
      ${html}
    </div>`;
  document.body.appendChild(fondo);
  document.body.classList.add("modal-abierto");
  fondo.querySelector("input:not([type=hidden]):not([readonly]), select, textarea")?.focus();
}

function cerrarModal() {
  document.getElementById("modal-fondo")?.remove();
  document.body.classList.remove("modal-abierto");
}

document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarModal(); });
