// ─── menu.js ───────────────────────────────────────────────────────
const APIMENU = '/api/menu';
const getMe = (id) => document.getElementById(id);

// Variables Globales
let ingredientesDB = []; 
let ingredientesSeleccionados = []; 
let menuImageBase64 = null; 


async function modalCrearMenu() {
    ingredientesSeleccionados = [];
    menuImageBase64 = null; // Resetear imagen al abrir

    if (!Array.isArray(ingredientesDB) || ingredientesDB.length === 0) {
        await cargarIngredientes();
    }

    if (!Array.isArray(ingredientesDB)) {
        console.error("CRÍTICO: La API de stock no devolvió un array. Devolvió:", ingredientesDB);
        alert("Error: No se pudieron cargar los insumos.");
        return;
    }

    $('modalTitle').textContent = 'Nuevo Menú';
    $('modalBody').innerHTML = `
        <div class="form-grid">
            <!-- ZONA DE IMAGEN -->
            <div class="form-group full" style="text-align:center; border-bottom:1px solid #eee; padding-bottom:15px; margin-bottom:15px;">
                <label style="display:block; font-weight:600; margin-bottom:10px;">Foto del Menú (200x200px)</label>
                
                <div style="margin: 0 auto 10px;">
                    <!-- Previsualización de 200x200 -->
                    <img id="previewImagen" src="" style="width:100px; height:100px; object-fit:cover; border:2px dashed #ddd; border-radius:8px; display:none;">
                </div>

                <input type="file" id="inputImagen" accept="image/*" style="display:none;" onchange="handleImageSelect(event)">
                
                <button class="btn btn-sm btn-secondary" onclick="document.getElementById('inputImagen').click()">
                    <i class="fas fa-camera"></i> Subir Foto
                </button>
                <small style="display:block; color:#888; margin-top:5px;">Se redimensionará automáticamente.</small>
            </div>

            <!-- DATOS DEL MENÚ -->
            <div class="form-group full">
                <label>Nombre Fantasia</label>
                <input id="menuNombre" type="text" placeholder="Ej: Menu Ejecutivo #42">
            </div>
            <div class="form-group">
                <label>Semana</label>
                <input id="menuSemana" type="number" min="1" max="52" value="${getWeekNumber()}">
            </div>
            <div class="form-group">
                <label>Año</label>
                <input id="menuAnio" type="number" value="${new Date().getFullYear()}">
            </div>
            <div class="form-group full" style="margin-top:10px;">
                <label>Disponible para:</label>
                <div style="display:flex;gap:15px;">
                    <label><input type="checkbox" name="disp" value="corporativo"> Corporativo</label>
                    <label><input type="checkbox" name="disp" value="individual"> Individual</label>
                    <label><input type="checkbox" name="disp" value="evento"> Evento</label>
                </div>
            </div>

            <!-- Selector de Ingredientes -->
            <div class="form-group full" style="border-top:1px solid #eee; padding-top:15px; margin-top:15px;">
                <label style="font-weight:700; color:var(--violeta);">Agregar Insumo</label>
                <div style="display:flex; gap:10px;">
                    <select id="selectIngrediente" style="flex:2; padding:8px;">
                        <option value="">Seleccionar insumo...</option>
                        ${ingredientesDB.map(i => `<option value="${i._id}">${i.nombre} ($${i.costo_actual || 0}/${i.unidad})</option>`).join('')}
                    </select>
                    <input id="cantIngrediente" type="number" placeholder="Cant." step="0.1" style="width:80px;">
                    <button class="btn btn-sm btn-secondary" onclick="agregarIngredienteLista()">+</button>
                </div>
            </div>

            <div class="form-group full" id="listaIngredientesTemp" style="margin-top:10px; max-height:150px; overflow-y:auto; background:#f9f9f9; padding:10px; border-radius:8px;">
                <small style="color:#999;">No hay ingredientes agregados.</small>
            </div>
            
            <div class="form-group full" style="margin-top:15px;">
                <strong>Costo Estimado: <span id="costoEnVivo" style="color:var(--naranja);">$0.00</span></strong>
            </div>
        </div>
    `;
    $('modalFoot').innerHTML = `<button class="btn btn-outline" onclick="cerrarModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="guardarMenu()">Guardar Menú</button>`;
    abrirModal();
}

// Función auxiliar para manejar la selección del archivo
async function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // Procesar y redimensionar a 200x200
        const base64 = await procesarImagen(file);
        menuImageBase64 = base64;

        // Mostrar previsualización
        const preview = document.getElementById('previewImagen');
        preview.src = base64;
        preview.style.display = 'inline-block';
        preview.style.border = '2px solid var(--naranja)';
        
    } catch (e) {
        console.error("Error al procesar imagen:", e);
        alert("Error al procesar la imagen. Intenta con otra.");
    }
}

async function cargarMenus() {
    try {
        const token = localStorage.getItem('brie_token');
        
        const res = await fetch(`/api/menu/listar`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            throw new Error(`Error del servidor: ${res.status}`);
        }

        const data = await res.json();
        renderTabla(data);
    } catch (e) {
        console.error("Error cargando menús:", e);
        const tbody = $('tablaMenus');
        if(tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">Error: ${e.message}</td></tr>`;
    }
}

function renderTabla(menus) {
    const tbody = getMe('tablaMenus');
    if(!menus.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">No hay menús configurados.</td></tr>';
        return;
    }
    tbody.innerHTML = menus.map(m => `
        <tr>
            <td style="font-weight:600;">${m.nombre_fantasia}</td>
            <td>Sem ${m.semana} - ${m.year}</td>
            <td>${m.disponible_para.join(', ')}</td>
            <td>$${m.costo_estimado.toFixed(2)}</td>
            <td>$${m.precio_sugerido.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-outline"><i class="fas fa-eye"></i> Ver</button>
            </td>
        </tr>
    `).join('');
}

async function cargarIngredientes() {
    try {
        const token = localStorage.getItem('brie_token');

        const res = await fetch('/api/stock/insumos', { 
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (!res.ok) {
            throw new Error(`Error ${res.status}: No autenticado`);
        }

        const data = await res.json();
        ingredientesDB = data; 
        
        // Actualizar select si el modal está abierto
        if($('selectIngrediente')) {
             $('selectIngrediente').innerHTML = `<option value="">Seleccionar insumo...</option>` + 
                ingredientesDB.map(i => `<option value="${i._id}">${i.nombre} ($${i.costo_actual || 0}/${i.unidad})</option>`).join('');
        }
    } catch (e) {
        console.error("No se cargaron insumos:", e);
        // No marcamos como array vacío para que el sistema sepa que falló
        ingredientesDB = []; 
        if($('listaIngredientesTemp')) {
            $('listaIngredientesTemp').innerHTML = `<small style="color:red;">Error de acceso: ${e.message}. Verificá tu sesión.</small>`;
        }
    }
}

function agregarIngredienteLista() {
    const id = getMe('selectIngrediente').value;
    const cant = parseFloat(getMe('cantIngrediente').value);
    
    if (!id || !cant) return;

    const ing = ingredientesDB.find(i => i._id === id);
    
    ingredientesSeleccionados.push({
        ingredient_id: id,
        cantidad: cant,
        opcional: false,       
        incluido_por_defecto: true
    });

    renderListaIngredientes();
    actualizarCosto();
    getMe('cantIngrediente').value = '';
}

function renderListaIngredientes() {
    const cont = getMe('listaIngredientesTemp');
    if(!ingredientesSeleccionados.length) {
        cont.innerHTML = '<small style="color:#999;">No hay ingredientes agregados.</small>';
        return;
    }
    cont.innerHTML = ingredientesSeleccionados.map((item, idx) => {
        const ing = ingredientesDB.find(i => i._id === item.ingredient_id);
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #eee;">
            <span>${ing.nombre} (${item.cantidad} ${ing.unidad})</span>
            <button class="btn btn-sm btn-outline" style="padding:2px 6px;" onclick="quitarIngrediente(${idx})">x</button>
        </div>`;
    }).join('');
}

function quitarIngrediente(idx) {
    ingredientesSeleccionados.splice(idx, 1);
    renderListaIngredientes();
    actualizarCosto();
}

function actualizarCosto() {
    let total = 0;
    ingredientesSeleccionados.forEach(item => {
        const ing = ingredientesDB.find(i => i._id === item.ingredient_id);
        const costo = (ing.costo_actual || 0) * item.cantidad;
        total += costo;
    });
    getMe('costoEnVivo').textContent = `$${total.toFixed(2)}`;
}

async function guardarMenu() {
    const nombre = $('menuNombre').value;
    const semana = $('menuSemana').value;
    const anio = $('menuAnio').value;
    
    const checks = document.querySelectorAll('input[name="disp"]:checked');
    const disponible_para = Array.from(checks).map(c => c.value);

    if (!nombre || !semana || ingredientesSeleccionados.length === 0) {
        return alert('Completá nombre, semana y agregá al menos un ingrediente.');
    }

    try {
        const res = await fetch(`/api/menu/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('brie_token')}` },
            body: JSON.stringify({
                nombre_fantasia: nombre,
                semana: parseInt(semana),
                year: parseInt(anio),
                disponible_para,
                ingredientes: ingredientesSeleccionados,
                imagen: menuImageBase64 
            })
        });
        
        if (res.ok) {
            cerrarModal();
            cargarMenus();
            alert('Menú creado exitosamente');
        } else {
            alert('Error al crear menú');
        }
    } catch(e) { console.error(e); }
}

function getWeekNumber(d) {
  // 👇 AGREGA ESTA LÍNEA: Si no pasan fecha, usa "hoy"
  if (!d) d = new Date();

  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return weekNo;
};

function procesarImagen(file) {
    return new Promise((resolve, reject) => {
        if (!file) resolve(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Crear canvas de 200x200
                const canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 200;
                const ctx = canvas.getContext('2d');

                // Dibujar imagen recortando al centro (Cover) y redimensionando
                // Se calcula el aspect ratio para que no se distorsione
                const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width / 2) - (img.width / 2) * scale;
                const y = (canvas.height / 2) - (img.height / 2) * scale;
                
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                // Convertir a Base64 (JPG con calidad 80% para ahorrar espacio)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl);
            };
            img.onerror = (e) => reject(e);
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ----------------------------------------------------------
// 👇 SOLO AQUÍ DENTRO SE EJECUTA AL INICIAR
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    cargarMenus();
    cargarIngredientes();
});