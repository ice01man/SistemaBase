 /* =========================================
ESTADO Y SIMULACIÓN DE DATOS
========================================= */
const state = {
    currentUser: JSON.parse(localStorage.getItem('user')) || null,
    users: JSON.parse(localStorage.getItem('users')) || [
        { id: 1, name: 'Admin Principal', email: 'admin@system.com', role: 'admin' },
        { id: 2, name: 'Juan Perez', email: 'juan@test.com', role: 'user' },
        { id: 3, name: 'Maria Lopez', email: 'maria@test.com', role: 'user' }
    ],
    products: JSON.parse(localStorage.getItem('products')) || [
        { id: 1, name: 'Servicio Web Básico', price: 500, category: 'Servicio' },
        { id: 2, name: 'Licencia Pro', price: 1200, category: 'Software' },
        { id: 3, name: 'Soporte Mensual', price: 300, category: 'Soporte' }
    ],
    editingId: null, // ID del elemento que se está editando
    editType: null   // 'user' o 'product'
};

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

/* =========================================
    LÓGICA DE NAVEGACIÓN PÚBLICA
    ========================================= */
const publicViews = {
    home: `
        <section class="hero">
            <h1>Bienvenido a Nuestro Sistema</h1>
            <p>Una solución integral para gestionar tus necesidades. Eficiencia, seguridad y escalabilidad en un solo lugar.</p>
        </section>
        <section class="banner-menu">
        <!-- Botones de Días -->
        <div class="dias-selector">
            <button class="btn-dia active" onclick="cambiarDia('lunes', this)">📅 Lunes</button>
            <button class="btn-dia" onclick="cambiarDia('martes', this)">📅 Martes</button>
            <button class="btn-dia" onclick="cambiarDia('miercoles', this)">📅 Miércoles</button>
            <button class="btn-dia" onclick="cambiarDia('jueves', this)">📅 Jueves</button>
            <button class="btn-dia" onclick="cambiarDia('viernes', this)">📅 Viernes</button>
        </div>

        <h2 class="banner-titulo" id="titulo-dia">Menú del Lunes</h2>
        <p class="banner-subtitulo">Pasa el cursor sobre cada opción para ver los ingredientes</p>

        <!-- Contenedor del Menú (Lunes) -->
        <div class="cards-banner-container" id="menu-container">
            
            <!-- Gourmet -->
            <div class="card card-expandable">
            <div class="card-header-compact">
                <h3>✨ Gourmet</h3>
                <img src="./img/lunes-gourmet.jpg" alt="Gourmet" class="thumb-img">
            </div>
            <div class="card-content">
                <img src="./img/lunes-gourmet.jpg" alt="Gourmet" class="featured-img">
                <h4>Lomo al Vino con Papas Rústicas</h4>
                <p class="descripcion">Medallón de lomo reducido al vino tinto con papas al horno.</p>
                <div class="ingredientes-seccion">
                <h5>Ingredientes:</h5>
                <ul>
                    <li>🥩 Medallón de lomo</li>
                    <li>🍷 Reducción de vino tinto</li>
                    <li>🥔 Papas rústicas</li>
                </ul>
                </div>
            </div>
            </div>

            <!-- Del Día -->
            <div class="card card-expandable">
            <div class="card-header-compact">
                <h3>🍲 Del Día</h3>
                <img src="./img/lunes-deldia.jpg" alt="Del Día" class="thumb-img">
            </div>
            <div class="card-content">
                <img src="./img/lunes-deldia.jpg" alt="Del Día" class="featured-img">
                <h4>Milanesa con Puré</h4>
                <p class="descripcion">Clásica milanesa de carne con puré casero.</p>
                <div class="ingredientes-seccion">
                <h5>Ingredientes:</h5>
                <ul>
                    <li>🥩 Carne seleccionada</li>
                    <li>🥔 Puré de papa casero</li>
                    <li>🍋 Limón fresco</li>
                </ul>
                </div>
            </div>
            </div>

            <!-- Vegano -->
            <div class="card card-expandable">
            <div class="card-header-compact">
                <h3>🌱 Vegano</h3>
                <img src="./img/lunes-vegano.jpg" alt="Vegano" class="thumb-img">
            </div>
            <div class="card-content">
                <img src="./img/lunes-vegano.jpg" alt="Vegano" class="featured-img">
                <h4>Lasaña de Berenjenas</h4>
                <p class="descripcion">Capas de berenjena con salsa natural y queso vegetal.</p>
                <div class="ingredientes-seccion">
                <h5>Ingredientes:</h5>
                <ul>
                    <li>🍆 Berenjenas asadas</li>
                    <li>🍅 Salsa pomodoro</li>
                    <li>🧀 Queso vegetal</li>
                </ul>
                </div>
            </div>
            </div>

            <!-- Sandwich -->
            <div class="card card-expandable">
            <div class="card-header-compact">
                <h3>🥪 Sandwich</h3>
                <img src="./img/lunes-sandwich.jpg" alt="Sandwich" class="thumb-img">
            </div>
            <div class="card-content">
                <img src="./img/lunes-sandwich.jpg" alt="Sandwich" class="featured-img">
                <h4>Pollo, Palta y Tomate</h4>
                <p class="descripcion">Pechuga desmenuzada, palta fresca y aderezo especial.</p>
                <div class="ingredientes-seccion">
                <h5>Ingredientes:</h5>
                <ul>
                    <li>🥖 Pan artesanal</li>
                    <li>🍗 Pollo desmenuzado</li>
                    <li>🥑 Palta fresca</li>
                    <li>🍅 Tomate en rodajas</li>
                </ul>
                </div>
            </div>
            </div>

        </div>
        </section>
    `,
    about: `
        <h2 class="section-title">Quiénes Somos</h2>
        <div class="card" style="margin-bottom: 2rem;">
            <p style="margin-bottom: 1rem; line-height: 1.6;">Somos una empresa dedicada al desarrollo de soluciones tecnológicas avanzadas. Nuestro equipo está conformado por expertos en ingeniería de software, diseño UX/UI y gestión de bases de datos.</p>
            <p style="line-height: 1.6;">Nuestra misión es simplificar procesos complejos mediante software intuitivo, permitiendo a nuestros clientes enfocarse en lo que mejor saben hacer: su negocio.</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center;">
            <div>
                <h3>Nuestra Visión</h3>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">Ser el referente latinoamericano en sistemas de gestión empresarial para el 2030.</p>
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
                    <p style="color: var(--text-muted);">Av. Tecnológica 1234, Ciudad del Conocimiento</p>
                </div>
                <div class="card" style="margin-bottom: 1rem;">
                    <h4>Email</h4>
                    <p style="color: var(--text-muted);">contacto@misistema.com</p>
                </div>
                <div class="card">
                    <h4>Teléfono</h4>
                    <p style="color: var(--text-muted);">+54 11 1234 5678</p>
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
                        <label class="form-label">Usuario</label>
                        <input type="text" id="username" class="form-control" placeholder="admin" value="admin">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Contraseña</label>
                        <input type="password" id="password" class="form-control" placeholder="****" value="1234">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">Entrar</button>
                </form>
                <p style="text-align: center; margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
                    Demo: Usuario <b>admin</b> / Clave <b>1234</b>
                </p>
            </div>
        </div>
    `
 
};

function cambiarDia(dia, elemento) {
  // Cambiar clase activa en los botones
  document.querySelectorAll('.btn-dia').forEach(btn => btn.classList.remove('active'));
  elemento.classList.add('active');

  // Actualizar título
  const titulo = document.getElementById('titulo-dia');
  titulo.textContent = `Menú del ${dia.charAt(0).toUpperCase() + dia.slice(1)}`;

  // Aquí puedes actualizar las imágenes y descripciones según el día seleccionado
}

function navigate(viewName) {
    const main = document.getElementById('main-content');
    const publicLayout = document.getElementById('public-layout');
    const privateLayout = document.getElementById('private-layout');

    // Manejo de sesión
    if (viewName === 'login' && state.currentUser) {
        app.init();
        return;
    }

    if (viewName === 'dashboard' || viewName === 'users' || viewName === 'products') {
        if (!state.currentUser) {
            showToast('Debes iniciar sesión primero', 'error');
            navigate('login');
            return;
        }
        publicLayout.classList.add('hidden');
        privateLayout.classList.remove('hidden');
        if(viewName === 'dashboard') app.renderDashboard();
        if(viewName === 'users') app.renderUsers();
        if(viewName === 'products') app.renderProducts();
        return;
    }

    // Renderizar vistas públicas
    publicLayout.classList.remove('hidden');
    privateLayout.classList.add('hidden');
    
    if (publicViews[viewName]) {
        main.innerHTML = publicViews[viewName];
    }

    // Event Listeners específicos de vistas
    if (viewName === 'login') {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            if (u === 'admin' && p === '1234') {
                state.currentUser = { name: 'Admin Usuario', email: 'admin@system.com', role: 'admin' };
                localStorage.setItem('user', JSON.stringify(state.currentUser));
                showToast('Login exitoso');
                app.init();
            } else {
                showToast('Credenciales inválidas', 'error');
            }
        });
    }
    
    // Scroll top
    window.scrollTo(0, 0);
}

/* =========================================
    LÓGICA DE APLICACIÓN (DASHBOARD)
    ========================================= */
const app = {

    altoViewport: () => {
        const contenedor = document.getElementById('main-content');
        const anchoViewport = window.innerHeight;
        let xx = anchoViewport -140
        /*contenedor.style.height = `${xx}px`; */

    },
    
    init: () => {
        if (state.currentUser) {
            document.getElementById('public-layout').classList.add('hidden');
            document.getElementById('private-layout').classList.remove('hidden');
            document.getElementById('user-name-display').textContent = state.currentUser.name;
        
            app.renderDashboard();
        } else {
            navigate('home');
        }
    },

    logout: () => {
        state.currentUser = null;
        localStorage.removeItem('user');
        showToast('Sesión cerrada');
        navigate('home');
    },

    setActiveLink: (id) => {
        document.querySelectorAll('.sidebar-nav a').forEach(el => el.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    // --- DASHBOARD HOME ---
    renderDashboard: () => {
        app.setActiveLink('nav-dash');
        const container = document.getElementById('admin-content');
        container.innerHTML = `
            <h2 style="margin-bottom: 1.5rem;">Resumen General</h2>
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
                    <span class="stat-value">$${state.products.reduce((acc, p) => acc + Number(p.price), 0)}</span>
                    <span class="stat-label">Valor Inventario</span>
                </div>
            </div>
            <div class="card">
                <h3>Actividad Reciente</h3>
                <p style="color: var(--text-muted); margin-top: 1rem;">No hay actividad reciente para mostrar.</p>
            </div>
        `;
    },

    // --- ABM USUARIOS ---
    renderUsers: () => {
        app.setActiveLink('nav-users');
        const container = document.getElementById('admin-content');
        
        let rows = state.users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td><span style="padding: 2px 8px; background: ${u.role === 'admin' ? '#dbeafe' : '#f1f5f9'}; color: ${u.role === 'admin' ? '#1e40af' : '#475569'}; border-radius: 12px; font-size: 0.8rem;">${u.role}</span></td>
                <td>
                    <button onclick="app.openUserModal(${u.id})" class="btn btn-outline" style="padding: 0.3rem 0.6rem;">✏️</button>
                    <button onclick="app.deleteUser(${u.id})" class="btn btn-danger" style="padding: 0.3rem 0.6rem;">🗑️</button>
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2>Gestión de Usuarios</h2>
                <button onclick="app.openUserModal()" class="btn btn-primary">+ Nuevo Usuario</button>
            </div>
            <div class="card table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    openUserModal: (id = null) => {
        state.editingId = id;
        state.editType = 'user';
        const user = id ? state.users.find(u => u.id === id) : { name: '', email: '', role: 'user' };
        
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
                            <input type="text" id="u_name" class="form-control" value="${user.name}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" id="u_email" class="form-control" value="${user.email}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rol</label>
                            <select id="u_role" class="form-control">
                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>Usuario</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
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

    saveUser: () => {
        const name = document.getElementById('u_name').value;
        const email = document.getElementById('u_email').value;
        const role = document.getElementById('u_role').value;

        if (!name || !email) { showToast('Complete todos los campos', 'error'); return; }

        if (state.editingId) {
            // Update
            const idx = state.users.findIndex(u => u.id === state.editingId);
            state.users[idx] = { id: state.editingId, name, email, role };
            showToast('Usuario actualizado');
        } else {
            // Create
            const newId = state.users.length > 0 ? Math.max(...state.users.map(u => u.id)) + 1 : 1;
            state.users.push({ id: newId, name, email, role });
            showToast('Usuario creado');
        }
        
        localStorage.setItem('users', JSON.stringify(state.users));
        closeModal();
        app.renderUsers();
    },

    deleteUser: (id) => {
        if (confirm('¿Está seguro de eliminar este usuario?')) {
            state.users = state.users.filter(u => u.id !== id);
            localStorage.setItem('users', JSON.stringify(state.users));
            showToast('Usuario eliminado');
            app.renderUsers();
        }
    },

    // --- ABM PRODUCTOS ---
    renderProducts: () => {
        app.setActiveLink('nav-products');
        const container = document.getElementById('admin-content');

        let rows = state.products.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>$${p.price}</td>
                <td>
                    <button onclick="app.openProductModal(${p.id})" class="btn btn-outline" style="padding: 0.3rem 0.6rem;">✏️</button>
                    <button onclick="app.deleteProduct(${p.id})" class="btn btn-danger" style="padding: 0.3rem 0.6rem;">🗑️</button>
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2>Gestión de Productos</h2>
                <button onclick="app.openProductModal()" class="btn btn-primary">+ Nuevo Producto</button>
            </div>
            <div class="card table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Categoría</th>
                            <th>Precio</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    openProductModal: (id = null) => {
        state.editingId = id;
        state.editType = 'product';
        const prod = id ? state.products.find(p => p.id === id) : { name: '', price: '', category: 'Servicio' };
        
        const html = `
            <div class="modal">
                <div class="modal-header">
                    <span>${id ? 'Editar Producto' : 'Nuevo Producto'}</span>
                    <button onclick="closeModal()" style="background:none; font-size: 1.2rem;">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="productForm">
                        <div class="form-group">
                            <label class="form-label">Nombre del Producto</label>
                            <input type="text" id="p_name" class="form-control" value="${prod.name}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Categoría</label>
                            <select id="p_category" class="form-control">
                                <option value="Servicio" ${prod.category === 'Servicio' ? 'selected' : ''}>Servicio</option>
                                <option value="Software" ${prod.category === 'Software' ? 'selected' : ''}>Software</option>
                                <option value="Soporte" ${prod.category === 'Soporte' ? 'selected' : ''}>Soporte</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Precio ($)</label>
                            <input type="number" id="p_price" class="form-control" value="${prod.price}" required>
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

    saveProduct: () => {
        const name = document.getElementById('p_name').value;
        const category = document.getElementById('p_category').value;
        const price = document.getElementById('p_price').value;

        if (!name || !price) { showToast('Complete todos los campos', 'error'); return; }

        if (state.editingId) {
            const idx = state.products.findIndex(p => p.id === state.editingId);
            state.products[idx] = { id: state.editingId, name, category, price };
            showToast('Producto actualizado');
        } else {
            const newId = state.products.length > 0 ? Math.max(...state.products.map(p => p.id)) + 1 : 1;
            state.products.push({ id: newId, name, category, price });
            showToast('Producto creado');
        }

        localStorage.setItem('products', JSON.stringify(state.products));
        closeModal();
        app.renderProducts();
    },

    deleteProduct: (id) => {
        if (confirm('¿Está seguro de eliminar este producto?')) {
            state.products = state.products.filter(p => p.id !== id);
            localStorage.setItem('products', JSON.stringify(state.products));
            showToast('Producto eliminado');
            app.renderProducts();
        }
    }
};

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => {
    app.altoViewport();
    app.init();

});