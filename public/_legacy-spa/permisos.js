// ─── permisos.js ────────────────────────────────

const MENU_CONFIG = {
    'reportes': { icon: 'fa-chart-line', label: 'Reportes', section: 'MODULOS' },
    'menu':     { icon: 'fa-utensils', label: 'Gestión de Menú', section: 'Administración' },
    'clientes': { icon: 'fa-users', label: 'Clientes', section: 'Administración' },
    'cocina':   { icon: 'fa-kitchen-set', label: 'Cocina', section: 'Producción (Cocina)' },
    'pedidos':  { icon: 'fa-cart-shopping', label: 'Pedidos', section: 'Administración' },
    'stock':    { icon: 'fa-boxes-stacked', label: 'Control de Stock', section: 'Control Stock' },
    'compras':  { icon: 'fa-truck', label: 'Compras', section: 'Control Stock' },
    'reparto':  { icon: 'fa-route', label: 'Reparto', section: 'Logística' }
};

function aplicarPermisosUI() {
    // --- PASO A: Anti-loop (Ahora DENTRO de la función, así es válido) ---
    if (window.location.pathname.endsWith('login.html') || window.location.pathname === '/') {
        return; 
    }

    // --- PASO B: Verificar Contenedor ---
    const navContainer = document.getElementById('sidebarNav');
    if (!navContainer) {
        alert('❌ ERROR CRÍTICO: No se encontró el ID "sidebarNav" en el HTML.');
        return;
    }

    // --- PASO C: Verificar Datos ---
    const permisosStr = localStorage.getItem('brie_rol');
    
    if (!permisosStr) {
        alert('❌ ERROR: No hay "permisos" guardados. Vuelve a hacer login.');
        return;
    }

    let permisos;
    try {
        permisos = JSON.parse(permisosStr);
    } catch (e) {
        alert('❌ ERROR: Los permisos están corruptos. Borra el caché.');
        return;
    }

    // --- PASO D: Renderizar ---
    navContainer.innerHTML = ''; 
    let firstAllowedPage = null;

    const ordenSecciones = ['MODULOS', 'Administración', 'Producción (Cocina)', 'Control Stock', 'Logística'];
    const groups = {};

    permisos.forEach(perm => {
        if (MENU_CONFIG[perm]) {
            const sec = MENU_CONFIG[perm].section;
            if (!groups[sec]) groups[sec] = [];
            groups[sec].push(perm);
        } else {
            console.warn(`El permiso "${perm}" no existe en el menú.`);
        }
    });

    ordenSecciones.forEach(sectionName => {
        if (groups[sectionName]) {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'nav-section-title';
            titleDiv.textContent = sectionName;
            navContainer.appendChild(titleDiv);

            groups[sectionName].forEach(perm => {
                const config = MENU_CONFIG[perm];
                
                const item = document.createElement('div');
                item.className = 'nav-item';
                item.setAttribute('data-page', perm);
                item.innerHTML = `<i class="fas ${config.icon}"></i> ${config.label}`;
                
                if (!firstAllowedPage) firstAllowedPage = perm;

                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    mostrarPagina(perm);
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    item.classList.add('active');
                    if(window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
                });

                navContainer.appendChild(item);
            });
        }
    });

    // --- PASO E: Mostrar Página Inicial ---
    if (firstAllowedPage) {
        mostrarPagina(firstAllowedPage);
        const firstBtn = document.querySelector(`.nav-item[data-page="${firstAllowedPage}"]`);
        if(firstBtn) firstBtn.classList.add('active');
    }
}

function mostrarPagina(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${pageId}`);
    // console.log(`Mostrando página: ${pageId}`, target);
    if (target) {
        target.classList.add('active');
        const config = MENU_CONFIG[pageId];
        if (config) document.getElementById('pageTitle').textContent = config.label;
    }
}

document.addEventListener('DOMContentLoaded', aplicarPermisosUI);