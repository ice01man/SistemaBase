/* =========================================
   CONFIG
========================================= */
const API_URL = '/api';

// emoji por categoría para las cards del menú público
const EMOJI_CAT = { 'Gourmet': '✨', 'Del Día': '🍲', 'Vegano': '🌱', 'Sandwich': '🥪' };

/* =========================================
   ESTADO
   - users/products/orders vienen del backend (arrancan vacíos)
   - solo token y cart se guardan en localStorage
========================================= */
const state = {
    currentUser: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    users: [],
    products: [],
    orders: [],
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    diaActivo: 'lunes',
    catActiva: 'todos',
    editingId: null,
    editType: null
};

// id transparente: mongo devuelve _id, memoria devuelve id
const uid = (o) => (o && (o._id || o.id));

/* =========================================
   HELPER DE API (fetch + token + errores)
========================================= */
async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        let msg = 'Error en la solicitud';
        try { const j = await res.json(); msg = j.error || j.message || msg; } catch {}
        throw new Error(msg);
    }
    return res.status === 204 ? null : res.json();
}

/* =========================================
   UTILIDADES UI
========================================= */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
    state.editingId = null;
    state.editType = null;
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(state.cart));
}

/* =========================================
   VISTAS PÚBLICAS
========================================= */
const publicViews = {
    home: `
        <section class="hero">
            <span class="hero-badge"><span class="pt"></span> Servicio Activo • Semana 14</span>
            <h1>Bienvenido a <span class="accent">Nuestro Sistema</span></h1>
            <p class="lead">Plataforma de alta cocina corporativa y gestión de almuerzos ejecutivos. Elegí tu propuesta semanal, mirá los macros de cada plato y programá tu almuerzo en segundos.</p>
            
        </section>

        <section class="menu-wrap" id="menu">
            <span class="menu-eyebrow">Cronograma de Servicio</span>
            <h2 id="titulo-dia">Menú del Lunes</h2>

            <div class="dias-selector">
                <button class="btn-dia active" onclick="cambiarDia('lunes', this)"><span class="material-symbols-outlined">calendar_today</span> Lunes</button>
                <button class="btn-dia" onclick="cambiarDia('martes', this)"><span class="material-symbols-outlined">calendar_today</span> Martes</button>
                <button class="btn-dia" onclick="cambiarDia('miercoles', this)"><span class="material-symbols-outlined">calendar_today</span> Miércoles</button>
                <button class="btn-dia" onclick="cambiarDia('jueves', this)"><span class="material-symbols-outlined">calendar_today</span> Jueves</button>
                <button class="btn-dia" onclick="cambiarDia('viernes', this)"><span class="material-symbols-outlined">calendar_today</span> Viernes</button>
            </div>

            <div class="diet-filters">
                <span class="lbl">Filtro:</span>
                <button class="chip-diet active" onclick="filtrarCat('todos', this)">Todos</button>
                <button class="chip-diet" onclick="filtrarCat('Gourmet', this)">Gourmet</button>
                <button class="chip-diet" onclick="filtrarCat('Del Día', this)">Del Día</button>
                <button class="chip-diet" onclick="filtrarCat('Vegano', this)">Vegano</button>
                <button class="chip-diet" onclick="filtrarCat('Sandwich', this)">Sandwich</button>
            </div>

            <div class="cards-banner-container" id="menu-container"></div>
        </section>
    `,
    about: `
        <h2 class="section-title">Quiénes Somos</h2>
        <div class="card" style="margin-bottom: 2rem;">
            <p>Somos una empresa dedicada al desarrollo de soluciones tecnológicas avanzadas. Nuestro equipo está conformado por expertos en ingeniería de software, diseño UX/UI y gestión de bases de datos.</p>
            <p >Nuestra misión es simplificar procesos complejos mediante software intuitivo, permitiendo a nuestros clientes enfocarse en lo que mejor saben hacer: su negocio.</p>
        </div>
        <div class="card-quienes-somos">
            <div>
                <h3>Nuestra Visión</h3>
                <p>Ser el referente latinoamericano en sistemas de gestión empresarial para el 2030.</p>
            </div>
            <div style="background: #e2e8f0; height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
                Imagen del Equipo
            </div>
        </div>
    `,
    contact: `
        <h2 class="section-title">Contáctenos</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem;">
            <form class="card" onsubmit="event.preventDefault(); showToast('Mensaje enviado correctamente'); this.reset();">
                <div class="form-group">
                    <label class="form-label">Nombre Completo</label>
                    <input type="text" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Correo Electrónico</label>
                    <input type="email" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Mensaje</label>
                    <textarea class="form-control" rows="4" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Enviar Mensaje</button>
            </form>
            <div>
                <div class="card" style="margin-bottom: 1rem;">
                    <h4>Oficina Principal</h4>
                    <p >Av. Tecnológica 1234, Ciudad del Conocimiento</p>
                </div>
                <div class="card" style="margin-bottom: 1rem;">
                    <h4>Email</h4>
                    <p >contacto@misistema.com</p>
                </div>
                <div class="card">
                    <h4>Teléfono</h4>
                    <p >+54 11 1234 5678</p>
                </div>
            </div>
        </div>
    `,
    login: `
        <div class="login-container">
            <div class="card login-box">
                <h2 style="text-align: center; margin-bottom: 1.5rem;">Iniciar Sesión</h2>
                <form id="loginForm">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="email" class="form-control" placeholder="admin@demo.com" value="admin@demo.com">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contraseña</label>
                        <input type="password" id="password" class="form-control" placeholder="****" value="admin123">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">Entrar</button>
                </form>
                <p >
                    Demo: <b>admin@demo.com</b> / <b>user@demo.com</b> / <b>cliente@demo.com</b> — clave <b>{rol}123</b>
                </p>
            </div>
        </div>
    `
};

function cambiarDia(dia, elemento) {
    document.querySelectorAll('.btn-dia').forEach(btn => btn.classList.remove('active'));
    elemento.classList.add('active');
    state.diaActivo = dia;
    document.getElementById('titulo-dia').textContent = `Menú del ${dia.charAt(0).toUpperCase() + dia.slice(1)}`;
    app.renderMenuDia(dia);
}

function filtrarCat(cat, el) {
    document.querySelectorAll('.chip-diet').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    state.catActiva = cat;
    app.renderMenuDia(state.diaActivo);
}

/* Tema del sitio (paleta) */
function setTema(p) {
    document.documentElement.dataset.palette = p;
    localStorage.setItem('sb-palette', p);
    // en producción, además: api('/config', { method:'PATCH', body:{ tema:p } });
}

/* =========================================
   NAVEGACIÓN
========================================= */
function navigate(viewName) {
    const main = document.getElementById('main-content');
    const publicLayout = document.getElementById('public-layout');
    const privateLayout = document.getElementById('private-layout');

    if (viewName === 'login' && state.currentUser) {
        app.init();
        return;
    }

    // Vistas privadas de admin (desde el sidebar)
    if (viewName === 'dashboard' || viewName === 'users' || viewName === 'products') {
        if (!state.currentUser) {
            showToast('Debes iniciar sesión primero', 'error');
            navigate('login');
            return;
        }
        publicLayout.classList.add('hidden');
        privateLayout.classList.remove('hidden');
        if (viewName === 'dashboard') app.renderDashboard();
        if (viewName === 'users') app.renderUsers();
        if (viewName === 'products') app.renderProducts();
        return;
    }

    // Vistas públicas
    publicLayout.classList.remove('hidden');
    privateLayout.classList.add('hidden');

    if (publicViews[viewName]) {
        main.innerHTML = publicViews[viewName];
    }

    if (viewName === 'home') {
        state.diaActivo = 'lunes';
        app.cargarMenuHome();
    }

    if (viewName === 'login') {
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            try {
                const data = await api('/auth/login', { method: 'POST', body: { email, password } });
                state.token = data.token;
                state.currentUser = data.user;
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                showToast(`Bienvenido ${data.user.name}`);
                app.init();
            } catch (err) {
                showToast(err.message || 'Credenciales inválidas', 'error');
            }
        });
    }

    window.scrollTo(0, 0);
}

/* =========================================
   APLICACIÓN
========================================= */
const app = {

    init: async () => {
        if (!state.currentUser) {
            navigate('home');
            return;
        }

        document.getElementById('public-layout').classList.add('hidden');
        document.getElementById('private-layout').classList.remove('hidden');
        document.getElementById('user-name-display').textContent = state.currentUser.name;

        const rol = state.currentUser.role;
        const sidebar = document.getElementById('sidebar');

        try {
            await app.fetchProducts();
            if (rol === 'admin') await app.fetchUsers();
        } catch (e) {
            showToast('Error de conexión con el servidor', 'error');
        }

        if (rol === 'admin') {
            sidebar?.classList.remove('hidden');
            app.renderDashboard();
        } else if (rol === 'user') {
            sidebar?.classList.add('hidden');
            app.renderDespacho();
        } else {
            sidebar?.classList.add('hidden');
            app.renderClientMenu();
        }
    },

    logout: () => {
        state.currentUser = null;
        state.token = null;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        showToast('Sesión cerrada');
        navigate('home');
    },

    setActiveLink: (id) => {
        document.querySelectorAll('.sidebar-nav a').forEach(el => el.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
    },

    /* ---------- FETCH DE DATOS ---------- */
    fetchProducts: async () => { state.products = await api('/products'); },
    fetchUsers:    async () => { state.users = await api('/users'); },

    /* ============================================================
       MENÚ PÚBLICO DINÁMICO (home)
    ============================================================ */
    cargarMenuHome: async () => {
        const cont = document.getElementById('menu-container');
        if (cont) cont.innerHTML = '<p >Cargando menú...</p>';
        try {
            await app.fetchProducts();
            app.renderMenuDia(state.diaActivo || 'lunes');
        } catch (e) {
            if (cont) cont.innerHTML = '<p >No se pudo cargar el menú.</p>';
        }
    },

    renderMenuDia: (dia) => {
        const cont = document.getElementById('menu-container');
        if (!cont) return;

        const catSaludable = ['Vegano', 'Vegetariano', 'Ligero'];

        let platos = state.products.filter(p => p.day === dia);
        if (state.catActiva && state.catActiva !== 'todos') {
            platos = platos.filter(p => p.category === state.catActiva);
        }

        if (!platos.length) {
            cont.innerHTML = `<p style="color:var(--text-muted)">No hay platos para mostrar en ${dia}.</p>`;
            return;
        }

        cont.innerHTML = platos.map(p => {
            const esSaludable = catSaludable.includes(p.category);
            const rating = (p.rating || 4.8).toFixed(1);
            const reviews = p.reviews || Math.floor(60 + Math.random() * 90);
            const kcal = p.calorias ? `${p.calorias} kcal` : '';
            const prot = p.proteina ? `${p.proteina}g Proteína` : '';
            const ing = (p.ingredients || []).map(i => `<li>${i}</li>`).join('');
            const img = p.image || 'https://placehold.co/600x400/0D9488/FFF?text=' + encodeURIComponent(p.name || 'Plato');

            return `
                <article class="food-card">
                    <div class="fc-photo">
                        <img src="${img}" alt="${p.name}">
                        <span class="fc-cat ${esSaludable ? 'saludable' : ''}">
                            <span class="material-symbols-outlined" style="font-size:14px">${esSaludable ? 'eco' : 'local_fire_department'}</span>
                            ${p.category}
                        </span>
                        <div class="fc-meta">
                            <span class="fc-rate"><span class="star material-symbols-outlined" style="font-size:16px;font-variation-settings:'FILL' 1">star</span> ${rating} <span class="count">(${reviews})</span></span>
                            <span class="fc-incl">Almuerzo Incluido</span>
                        </div>
                    </div>
                    <div class="fc-body">
                        <div style="display:flex;flex-direction:column;gap:.4rem">
                            <h3>${p.name}</h3>
                            <p class="fc-desc">${p.description || ''}</p>
                        </div>
                        <div class="fc-tags">
                            ${kcal ? `<span class="fc-tag"><span class="material-symbols-outlined">bolt</span>${kcal}</span>` : ''}
                            ${prot ? `<span class="fc-tag"><span class="material-symbols-outlined">fitness_center</span>${prot}</span>` : ''}
                            ${esSaludable ? '<span class="fc-tag seal-veg">100% Vegano</span>' : '<span class="fc-tag seal">Sin Gluten</span>'}
                        </div>
                        ${ing ? `
                        <details class="fc-ingr">
                            <summary>Ver ingredientes <span class="material-symbols-outlined chev">expand_more</span></summary>
                            <ul>${ing}</ul>
                        </details>` : ''}
                        <div class="fc-foot">
                            <div class="fc-plan">
                                <span class="k">Precio</span>
                                <span class="v">$${p.price}</span>
                            </div>
                            <button class="btn-select" onclick="app.addToCart('${uid(p)}')">
                                <span class="material-symbols-outlined">add</span> Seleccionar
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    },

    /* ---------- DASHBOARD (admin) ---------- */
    renderDashboard: () => {
        app.setActiveLink('nav-dash');
        const container = document.getElementById('admin-content');
        const valorInv = state.products.reduce((acc, p) => acc + Number(p.price || 0), 0);
        container.innerHTML = `
            <div class="modal-titulo"><h2>Resumen General</h2></div>
            <div class="stats-grid">
                <div class="card stat-card">
                    <span class="stat-value">${state.users.length}</span>
                    <span class="stat-label">Usuarios Registrados</span>
                </div>
                <div class="card stat-card">
                    <span class="stat-value">${state.products.length}</span>
                    <span class="stat-label">Productos Activos</span>
                </div>
                <div class="card stat-card">
                    <span class="stat-value">$${valorInv}</span>
                    <span class="stat-label">Valor Inventario</span>
                </div>
            </div>
            <div class="card">
                <h3>Actividad Reciente</h3>
                <p>No hay actividad reciente para mostrar.</p>
            </div>
        `;
    },

    /* ---------- ABM USUARIOS (admin) ---------- */
    renderUsers: () => {
        app.setActiveLink('nav-users');
        const container = document.getElementById('admin-content');

        const rows = state.users.map(u => `
            <tr>
                <td>${uid(u)}</td>
                <td>${u.nombre}</td>
                <td>${u.email}</td>
                <td><span style="padding: 2px 8px; background: ${u.rol === 'admin' ? '#dbeafe' : '#f1f5f9'}; color: ${u.rol === 'admin' ? '#1e40af' : '#475569'}; border-radius: 12px; font-size: 0.8rem;">${u.rol}</span></td>
                <td>
                    <button onclick="app.openUserModal('${uid(u)}')" class="btn btn-outline" style="padding: 0.3rem 0.6rem;">✏️</button>
                    <button onclick="app.deleteUser('${uid(u)}')" class="btn btn-danger" style="padding: 0.3rem 0.6rem;">🗑️</button>
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="modal-titulo">
                <h2>Gestión de Usuarios</h2>
                <button onclick="app.openUserModal()" class="btn btn-primary">+ Nuevo Usuario</button>
            </div>
            <div class="card table-container">
                <table>
                    <thead>
                        <tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    openUserModal: (id = null) => {
        state.editingId = id;
        state.editType = 'user';
        const user = id ? state.users.find(u => uid(u) == id) : { nombre: '', email: '', rol: 'cliente' };

        const html = `
            <div class="modal">
                <div class="modal-header">
                    <span>${id ? 'Editar Usuario' : 'Nuevo Usuario'}</span>
                    <button onclick="closeModal()" style="background:none; font-size: 1.2rem;">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="userForm">
                        <div class="form-group">
                            <label class="form-label">Nombre</label>
                            <input type="text" id="u_name" class="form-control" value="${user.nombre || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" id="u_email" class="form-control" value="${user.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contraseña ${id ? '(dejar vacío para no cambiar)' : ''}</label>
                            <input type="password" id="u_password" class="form-control" placeholder="${id ? '••••••' : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rol</label>
                            <select id="u_role" class="form-control">
                                <option value="admin"   ${user.rol === 'admin'   ? 'selected' : ''}>Admin</option>
                                <option value="user"    ${user.rol === 'user'    ? 'selected' : ''}>User (empleado)</option>
                                <option value="cliente" ${user.rol === 'cliente' ? 'selected' : ''}>Cliente</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button onclick="closeModal()" class="btn btn-outline">Cancelar</button>
                    <button onclick="app.saveUser()" class="btn btn-primary">Guardar</button>
                </div>
            </div>
        `;
        document.getElementById('modal-container').innerHTML = html;
        document.getElementById('modal-container').classList.remove('hidden');
    },

    saveUser: async () => {
        const nombre = document.getElementById('u_name').value.trim();
        const email = document.getElementById('u_email').value.trim();
        const rol = document.getElementById('u_role').value;
        const password = document.getElementById('u_password').value;

        if (!nombre || !email) { showToast('Complete todos los campos', 'error'); return; }

        const body = { nombre, email, rol };
        if (password) body.password = password;

        try {
            if (state.editingId) {
                await api(`/users/${state.editingId}`, { method: 'PUT', body });
                showToast('Usuario actualizado');
            } else {
                await api('/users', { method: 'POST', body });
                showToast('Usuario creado');
            }
            closeModal();
            await app.fetchUsers();
            app.renderUsers();
        } catch (e) { showToast(e.message, 'error'); }
    },

    deleteUser: async (id) => {
        if (!confirm('¿Está seguro de eliminar este usuario?')) return;
        try {
            await api(`/users/${id}`, { method: 'DELETE' });
            showToast('Usuario eliminado');
            await app.fetchUsers();
            app.renderUsers();
        } catch (e) { showToast(e.message, 'error'); }
    },

    /* ---------- ABM PRODUCTOS (admin) ---------- */
    renderProducts: () => {
        app.setActiveLink('nav-products');
        const container = document.getElementById('admin-content');

        const rows = state.products.map(p => `
            <tr>
                <td>${uid(p)}</td>
                <td><img src="${p.image}" alt="${p.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                <td>${p.name}</td>
                <td>${p.day || '-'}</td>
                <td>${p.category || '-'}</td>
                <td>$${p.price}</td>
                <td>
                    <button onclick="app.openProductModal('${uid(p)}')" class="btn btn-outline" style="padding: 0.3rem 0.6rem;">✏️</button>
                    <button onclick="app.deleteProduct('${uid(p)}')" class="btn btn-danger" style="padding: 0.3rem 0.6rem;">🗑️</button>
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="modal-titulo">
                <h2>Gestión de Productos</h2>
                <button onclick="app.openProductModal()" class="btn btn-primary">+ Nuevo Producto</button>
            </div>
            <div class="card table-container">
                <table>
                    <thead>
                        <tr><th>ID</th><th>Imagen</th><th>Nombre</th><th>Día</th><th>Categoría</th><th>Precio</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    openProductModal: (id = null) => {
        state.editingId = id;
        state.editType = 'product';
        const prod = id
            ? state.products.find(p => uid(p) == id)
            : { name: '', category: '', day: 'lunes', description: '', ingredients: [], image: '', price: '' };

        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const opcionesDia = dias.map(d =>
            `<option value="${d}" ${prod.day === d ? 'selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`
        ).join('');

        const html = `
            <div class="modal">
                <div class="modal-header">
                    <span>${id ? 'Editar Producto' : 'Nuevo Producto'}</span>
                    <button onclick="closeModal()" style="background:none; font-size: 1.2rem;">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="productForm">
                        <div class="form-group">
                            <label class="form-label">Nombre del Plato</label>
                            <input type="text" id="p_name" class="form-control" value="${prod.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Día</label>
                            <select id="p_day" class="form-control">${opcionesDia}</select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Categoría</label>
                            <input type="text" id="p_category" class="form-control" value="${prod.category || ''}" placeholder="Gourmet / Del Día / Vegano / Sandwich" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Descripción</label>
                            <textarea id="p_description" class="form-control" rows="2" required>${prod.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ingredientes (separados por coma)</label>
                            <input type="text" id="p_ingredients" class="form-control" value="${(prod.ingredients || []).join(', ')}" placeholder="Pan, Pollo, Palta">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Imagen (ruta o URL)</label>
                            <input type="text" id="p_image" class="form-control" value="${prod.image || ''}" placeholder="./img/lunes-gourmet.jpg" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Precio ($)</label>
                            <input type="number" id="p_price" class="form-control" value="${prod.price || ''}" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button onclick="closeModal()" class="btn btn-outline">Cancelar</button>
                    <button onclick="app.saveProduct()" class="btn btn-primary">Guardar</button>
                </div>
            </div>
        `;
        document.getElementById('modal-container').innerHTML = html;
        document.getElementById('modal-container').classList.remove('hidden');
    },

    saveProduct: async () => {
        const name = document.getElementById('p_name').value.trim();
        const day = document.getElementById('p_day').value;
        const category = document.getElementById('p_category').value.trim();
        const description = document.getElementById('p_description').value.trim();
        const ingredients = document.getElementById('p_ingredients').value
            .split(',').map(s => s.trim()).filter(Boolean);
        const image = document.getElementById('p_image').value.trim();
        const price = document.getElementById('p_price').value;

        if (!name || !price) { showToast('Complete al menos nombre y precio', 'error'); return; }

        const body = { name, category, day, description, ingredients, image, price: Number(price) };

        try {
            if (state.editingId) {
                await api(`/products/${state.editingId}`, { method: 'PUT', body });
                showToast('Producto actualizado');
            } else {
                await api('/products', { method: 'POST', body });
                showToast('Producto creado');
            }
            closeModal();
            await app.fetchProducts();
            app.renderProducts();
        } catch (e) { showToast(e.message, 'error'); }
    },

    deleteProduct: async (id) => {
        if (!confirm('¿Está seguro de eliminar este producto?')) return;
        try {
            await api(`/products/${id}`, { method: 'DELETE' });
            showToast('Producto eliminado');
            await app.fetchProducts();
            app.renderProducts();
        } catch (e) { showToast(e.message, 'error'); }
    },

    /* ============================================================
       MÓDULO CARRITO (rol cliente)
    ============================================================ */
    renderClientMenu: () => {
            const container = document.getElementById('admin-content');
            const total = state.cart.reduce((a, b) => a + b.qty, 0);

            const cards = state.products.map(p => `
                <div class="card" style="padding:1.2rem; display:flex; flex-direction:column;">
                    <img src="${p.image}" alt="${p.name}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:0.8rem;">
                    <h3 style="color:var(--text-main); font-size:1.05rem;">${p.name}</h3>
                    <p >${p.category || ''} · ${p.day || ''}</p>
                    <div style="font-size:1.3rem; font-weight:bold; color:var(--accent); margin-bottom:0.8rem;">$${p.price}</div>
                    <button onclick="app.addToCart('${uid(p)}')" class="btn btn-primary" style="width:100%; margin-top:auto;">Agregar</button>
                </div>
            `).join('');

            container.innerHTML = `
                <div style="max-width:1200px; margin:0 auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; border-bottom:1px solid var(--glass-border); padding-bottom:1rem;">
                        <div class="modal-titulo"><h2>📦 Menú Disponible</h2></div>
                        <div style="display:flex; gap:1rem;">
                            <button onclick="app.renderCart()" class="btn btn-primary">🛒 Carrito <span id="cart-count" style="background:rgba(255,255,255,0.2); padding:0 6px; border-radius:10px; font-size:0.8rem;">${total}</span></button>
                            <button onclick="app.renderOrderStatus()" class="btn btn-ghost">Mis Pedidos</button>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:1.5rem;">
                        ${cards}
                    </div>
                </div>
            `;
        },

    addToCart: (productId) => {
        const product = state.products.find(p => uid(p) == productId);
        if (!product) return;

        const existing = state.cart.find(item => uid(item) == productId);
        if (existing) {
            existing.qty++;
        } else {
            state.cart.push({ ...product, qty: 1 });
        }
        saveCart();
        showToast('Producto agregado');
        app.updateCartCount();
    },

    updateCartCount: () => {
        const count = state.cart.reduce((acc, item) => acc + item.qty, 0);
        const badge = document.getElementById('cart-count');
        if (badge) badge.innerText = count;
    },

    renderCart: () => {
        const container = document.getElementById('admin-content');
        const volver = `<button onclick="app.renderClientMenu()" class="btn btn-ghost">← Volver al Menú</button>`;

        if (state.cart.length === 0) {
            container.innerHTML = `
                <div style="max-width:700px; margin:0 auto;">
                    <div class="card" style="text-align:center; padding:3rem;">
                        <div class="modal-titulo"><h2>Carrito Vacío 🛒</h2></div><br>${volver}
                    </div>
                </div>`;
            return;
        }

        let total = 0;
        const rows = state.cart.map(item => {
            const subtotal = item.price * item.qty;
            total += subtotal;
            return `
                <tr>
                    <td>${item.name}</td>
                    <td>$${item.price}</td>
                    <td>${item.qty}</td>
                    <td>$${subtotal}</td>
                    <td><button onclick="app.removeFromCart('${uid(item)}')" class="btn btn-danger" style="padding:0.3rem 0.6rem;">❌</button></td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <div style="max-width:800px; margin:0 auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div class="modal-titulo"><h2>🛒 Tu Carrito</h2></div>
                    ${volver}
                </div>
                <div class="card table-container" style="padding:0;"><table><thead><tr><th>Prod</th><th>Precio</th><th>Cant</th><th>Sub</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2rem;">
                    <h3>Total: $${total}</h3>
                    <button onclick="app.placeOrder()" class="btn btn-primary">Confirmar Pedido</button>
                </div>
            </div>
        `;
    },

    removeFromCart: (productId) => {
        state.cart = state.cart.filter(item => uid(item) != productId);
        saveCart();
        app.renderCart();
        app.updateCartCount();
    },

    placeOrder: async () => {
        if (state.cart.length === 0) return showToast('Carrito vacío', 'error');
        const total = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

        try {
            await api('/orders', {
                method: 'POST',
                body: {
                    items: state.cart.map(i => ({ productId: uid(i), name: i.name, price: i.price, qty: i.qty })),
                    totalAmount: total,
                    user: uid(state.currentUser)
                }
            });
            showToast('¡Pedido realizado con éxito!');
            state.cart = [];
            saveCart();
            app.updateCartCount();
            app.renderOrderStatus();
        } catch (e) {
            showToast(e.message || 'Error al guardar pedido', 'error');
        }
    },

    renderOrderStatus: async () => {
        const container = document.getElementById('admin-content');
        const volver = `<button onclick="app.renderClientMenu()" class="btn btn-ghost" style="margin-bottom:1rem;">← Volver al Menú</button>`;
        container.innerHTML = `<div style="max-width:800px; margin:0 auto;">${volver}<p>Cargando pedidos...</p></div>`;

        try {
            const orders = await api(`/orders/mis-pedidos?user=${encodeURIComponent(uid(state.currentUser))}`);
            let html = `<div style="max-width:800px; margin:0 auto;">${volver}<div class="modal-titulo"><h2>📜 Mis Pedidos</h2></div><br>`;
            if (!orders.length) html += '<p>Todavía no tenés pedidos.</p>';
            orders.forEach(o => {
                html += `<div class="card" style="margin-bottom:1rem; border-left:4px solid var(--accent);">
                    <div style="display:flex; justify-content:space-between;"><span>${new Date(o.createdAt).toLocaleDateString()}</span> <b>${o.status}</b></div>
                    <p >Total: $${o.totalAmount}</p>
                </div>`;
            });
            container.innerHTML = html + `</div>`;
        } catch (e) {
            container.innerHTML = `<div style="max-width:800px; margin:0 auto;">${volver}
                <div class="card" style="padding:2rem; text-align:center; color:var(--text-muted);">No se pudieron cargar los pedidos.</div>
            </div>`;
        }
    },

    renderApariencia() {
        const temas = [
            { id:'violeta', nombre:'Violeta', desc:'Look actual de la marca' , color: '#7c3aed' },
            { id:'trueno',  nombre:'Trueno',  desc:'Cian + ámbar' , color: '#06b6d4' },
            { id:'bosque',  nombre:'Bosque',  desc:'Verde + azul' , color: '#10b981' },
            { id:'teal',    nombre:'Teal (actual)', desc:'Diseño base del sitio' , color: '#0D9488' },
        ];
        const actual = document.documentElement.dataset.palette || 'teal';
        document.getElementById('admin-content').innerHTML = `
            <div class="modal-titulo">
                <h2 >Apariencia del sitio</h2>
            </div>
            <div class="card">
            <p >
                Elegí la paleta. El cambio se aplica a toda la tienda.
            </p>
            <div style="display:flex;gap:1rem;flex-wrap:wrap; flex-direction: column; align-content: flex-start;">
                ${temas.map(t => `
                <button class="btn btn-secondary"
                    style="background-color: ${t.color} !important; flex:1;min-width:160px;flex-direction:column;align-items:flex-start;gap:.25rem${t.id===actual ? ';outline:2px solid var(--accent)' : ''}"
                    onclick="app.guardarTema('${t.id}')">
                    <strong>${t.nombre}</strong>
                    <span >${t.desc}</span>
                </button>`).join('')}
            </div>
            </div>`;
    },

    guardarTema: async (id) => {
        try {
            await api('/config', { method: 'PATCH', body: { tema: id } });
            setTema(id);
            showToast('Tema actualizado');
            app.renderApariencia();
        } catch (e) {
            showToast(e.message || 'No se pudo guardar el tema', 'error');
        }
    },

    /* ============================================================
       MÓDULO DESPACHO (rol user / empleado)
    ============================================================ */
    renderDespacho: async () => {
        const container = document.getElementById('admin-content');
        container.innerHTML = 'Cargando pedidos...';
        try {
            const orders = await api('/orders/pendientes');

            let html = `<div class="modal-titulo"><h2>🚚 Despacho de Pedidos</h2></div>
                <p >Pedidos pendientes de tomar y despachar.</p>`;

            if (!orders.length) {
                html += '<div class="card" style="text-align:center; padding:2rem;">No hay pedidos en cola 🎉</div>';
                container.innerHTML = html;
                return;
            }

            const rows = orders.map(o => {
                const accion = o.status === 'Pendiente'
                    ? `<button onclick="app.tomarPedido('${uid(o)}')" class="btn btn-primary" style="padding:0.3rem 0.8rem;">Tomar</button>`
                    : `<button onclick="app.despacharPedido('${uid(o)}')" class="btn btn-primary" style="padding:0.3rem 0.8rem;">Despachar</button>`;
                const items = (o.items || []).map(i => `${i.qty}× ${i.name}`).join(', ');
                return `
                    <tr>
                        <td>${new Date(o.createdAt).toLocaleString()}</td>
                        <td>${items}</td>
                        <td>$${o.totalAmount}</td>
                        <td><b>${o.status}</b></td>
                        <td>${accion}</td>
                    </tr>
                `;
            }).join('');

            html += `<div class="card table-container">
                <table>
                    <thead><tr><th>Fecha</th><th>Ítems</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = '<p>No se pudieron cargar los pedidos.</p>';
        }
    },

    tomarPedido: async (id) => {
        try {
            await api(`/orders/${id}/tomar`, { method: 'PATCH' });
            showToast('Pedido tomado');
            app.renderDespacho();
        } catch (e) { showToast(e.message, 'error'); }
    },

    despacharPedido: async (id) => {
        try {
            await api(`/orders/${id}/despachar`, { method: 'PATCH' });
            showToast('Pedido despachado');
            app.renderDespacho();
        } catch (e) { showToast(e.message, 'error'); }
    }
};

/* =========================================
   INICIO
========================================= */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const cfg = await api('/config');
        setTema(cfg.tema);
    } catch {
        setTema(localStorage.getItem('sb-palette') || 'teal');
    }
    app.init();
});