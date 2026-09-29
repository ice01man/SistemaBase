/**
 * Arma el HTML de una food-card. `footerHtml` es lo que va en el pie (precio +
 * botón), para que cada página (menu.html / pedir.html) ponga su propia acción.
 */
function renderFoodCard(p, footerHtml) {
  const tags = p.tags || [];
  const rating = p.rating || { promedio: 0, cantidad: 0 };
  return `
    <div class="food-card">
      <div class="fc-photo">
        <img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.style.display='none'" />
        <span class="fc-cat">${CATEGORIA_ICONO[p.category] ?? ""} ${esc(p.category)}</span>
        <div class="fc-meta">
          ${
            rating.cantidad > 0
              ? `<span class="fc-rate"><span class="star">★</span> ${rating.promedio.toFixed(1)} <span class="count">(${rating.cantidad})</span></span>`
              : "<span></span>"
          }
          ${p.destacado ? `<span class="fc-incl">${esc(p.destacado)}</span>` : ""}
        </div>
      </div>
      <div class="fc-body">
        <h3>${esc(p.name)}</h3>
        <p class="fc-desc">${esc(p.description)}</p>
        ${tags.length ? `<div class="fc-tags">${tags.map((t) => `<span class="fc-tag ${/vegan/i.test(t) ? "seal-veg" : ""}">${esc(t)}</span>`).join("")}</div>` : ""}
        ${
          (p.ingredients || []).length
            ? `<details class="fc-ingr">
                 <summary>Ver ingredientes <span class="chev">▾</span></summary>
                 <ul>${p.ingredients.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
               </details>`
            : ""
        }
        <div class="fc-foot">${footerHtml}</div>
      </div>
    </div>`;
}

/** Chips de categoría (Todos + las que aparezcan en la lista de productos). */
function renderFiltrosCategoria(productos, categoriaActual, onClickFn) {
  const categorias = ["Todos", ...new Set(productos.map((p) => p.category))];
  return `<div class="diet-filters">${categorias
    .map((c) => `<button class="chip ${c === categoriaActual ? "activo" : ""}" onclick="${onClickFn}('${c}')">${esc(c)}</button>`)
    .join("")}</div>`;
}
