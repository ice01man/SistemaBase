// Cliente API. El backend sirve este front desde /public en el mismo puerto,
// así que las rutas son relativas: no hace falta configurar ninguna URL.

function getToken() { return localStorage.getItem("sb_token"); }
function getUsuario() {
  try { return JSON.parse(localStorage.getItem("sb_user") || "null"); } catch { return null; }
}
function setSesion(token, user) {
  localStorage.setItem("sb_token", token);
  localStorage.setItem("sb_user", JSON.stringify(user));
}
function borrarSesion() {
  localStorage.removeItem("sb_token");
  localStorage.removeItem("sb_user");
}

/** fetch envuelto: agrega el Bearer token y tira el mensaje de error del backend. */
async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  // Sesión vencida (o usuario desactivado): se limpia y se vuelve al login.
  if (res.status === 401 && token && !path.startsWith("/auth/login")) {
    borrarSesion();
    location.href = "login.html?expirada=1";
    throw new Error("Tu sesión venció. Ingresá de nuevo.");
  }
  if (!res.ok) throw new Error(data?.error || data?.message || "Ocurrió un error. Probá de nuevo.");
  return data;
}

const apiGet = (path) => api(path);
const apiPost = (path, body) => api(path, { method: "POST", body });
const apiPut = (path, body) => api(path, { method: "PUT", body });
const apiPatch = (path, body) => api(path, { method: "PATCH", body });
const apiDelete = (path) => api(path, { method: "DELETE" });

/** Exige sesión con alguno de los roles dados; si no hay, redirige a login.html.
 *  (Es solo comodidad de pantalla: la seguridad real la aplica el servidor en cada /api.) */
function requireRol(...roles) {
  const usuario = getUsuario();
  if (!usuario || !getToken() || (roles.length && !roles.includes(usuario.role))) {
    location.href = "login.html";
    return null;
  }
  return usuario;
}

async function logout() {
  borrarSesion();
  localStorage.removeItem("sb_cart");
  try { await apiPost("/auth/logout"); } catch { /* si falla, igual ya borramos el localStorage */ }
  location.href = "login.html";
}

/** A qué página va cada rol después de loguearse.
 *  Las páginas de personal las sirve el servidor después de validar el rol contra la cookie de sesión. */
function destinoPorRol(role) {
  return { admin: "/admin", produccion: "/cocina", user: "/cocina", reparto: "/reparto", cliente: "pedir.html" }[role] ?? "index.html";
}
